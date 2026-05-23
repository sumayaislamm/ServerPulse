
        import { createRequire } from 'module';
        const require = createRequire(import.meta.url);
        

// src/app.ts
import express from "express";

// src/modules/issues/issues.route.ts
import { Router } from "express";

// src/db/index.ts
import { Pool } from "pg";

// src/config/env.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var config = {
  connection_string: process.env.CONNECTIONSTRING,
  port: process.env.PORT,
  jwt_secret: process.env.JWT_SECRET
};
var env_default = config;

// src/db/index.ts
var pool = new Pool({
  connectionString: env_default.connection_string
});
var initDB = async () => {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20)
CHECK (role IN ('contributor', 'maintainer'))
DEFAULT 'contributor',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
    )`
    );
    await pool.query(`
       CREATE TABLE IF NOT EXISTS issues (

             id SERIAL PRIMARY KEY,

          title VARCHAR(150) NOT NULL,
         description TEXT NOT NULL,
         type VARCHAR(20)
CHECK (type IN ('bug', 'feature_request'))
NOT NULL,
         status VARCHAR(20)
CHECK (status IN ('open', 'in_progress', 'resolved'))
DEFAULT 'open',
         reporter_id INTEGER NOT NULL,

       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()


        )`);
    console.log("Database connected successfully");
  } catch (err) {
    console.log(err);
  }
};

// src/modules/issues/issues.service.ts
var createIssueIntoDB = async (payload) => {
  const {
    title,
    description,
    type,
    reporter_id
  } = payload;
  const result = await pool.query(
    `INSERT INTO issues (
    title,
    description,
    type,
    reporter_id,
    created_at,
    updated_at
  ) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
    [title, description, type, reporter_id]
  );
  return result;
};
var getAllIssuesFromDB = async (query) => {
  const { sort = "newest", type, status } = query;
  let baseQuery = `SELECT * FROM issues`;
  const conditions = [];
  const values = [];
  if (type) {
    values.push(type);
    conditions.push(`type = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (conditions.length > 0) {
    baseQuery += ` WHERE ` + conditions.join(" AND ");
  }
  const order = sort === "oldest" ? "ASC" : "DESC";
  baseQuery += ` ORDER BY created_at ${order}`;
  const issuesResult = await pool.query(baseQuery, values);
  const issues = issuesResult.rows;
  const reporterIds = [...new Set(issues.map((i) => i.reporter_id))];
  let usersMap = {};
  if (reporterIds.length > 0) {
    const usersResult = await pool.query(
      `SELECT id, name, role FROM users WHERE id = ANY($1)`,
      [reporterIds]
    );
    usersResult.rows.forEach((user) => {
      usersMap[user.id] = user;
    });
  }
  const finalData = issues.map((issue) => {
    return {
      ...issue,
      reporter: usersMap[issue.reporter_id] || null
    };
  });
  return finalData;
};
var getSingleIssueFromDB = async (id) => {
  const issueResult = await pool.query(
    `SELECT * FROM issues WHERE id = $1`,
    [id]
  );
  if (issueResult.rows.length === 0) {
    return null;
  }
  const issue = issueResult.rows[0];
  const reporterResult = await pool.query(
    `SELECT id, name, role FROM users WHERE id = $1`,
    [issue.reporter_id]
  );
  return {
    ...issue,
    reporter: reporterResult.rows[0]
  };
};
var updateIssueIntoDB = async (id, payload, user) => {
  const issueResult = await pool.query(
    `SELECT * FROM issues WHERE id = $1`,
    [id]
  );
  if (issueResult.rows.length === 0) {
    throw new Error("Issue not found");
  }
  const issue = issueResult.rows[0];
  const currentUser = user;
  if (currentUser.role === "contributor") {
    if (issue.reporter_id !== currentUser.id) {
      throw new Error("Forbidden: You can only update your own issues");
    }
    if (issue.status !== "open") {
      throw new Error("Forbidden: You can only update open issues");
    }
  }
  const { title, description, type, status } = payload;
  let updatedStatus = issue.status;
  if (currentUser.role === "maintainer" && status) {
    updatedStatus = status;
  }
  const result = await pool.query(
    `
      UPDATE issues SET
    title = COALESCE($1, title),
    description = COALESCE($2, description),
    type = COALESCE($3, type),
    status = COALESCE($4, status),
    updated_at = NOW()
    WHERE id = $5
     RETURNING *
`,
    [title, description, type, status, id]
  );
  return result.rows[0];
};
var deleteIssueFromDB = async (id) => {
  const result = await pool.query(
    `DELETE FROM issues WHERE id = $1 RETURNING id`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new Error("Not found: Issue not found");
  }
  return result.rows[0];
};
var issueService = {
  createIssueIntoDB,
  getAllIssuesFromDB,
  getSingleIssueFromDB,
  updateIssueIntoDB,
  deleteIssueFromDB
};

// src/utils/sendResponse.ts
var sendResponse = (res, payload) => {
  const responseData = {
    success: payload.success,
    message: payload.message
  };
  if (payload.data !== void 0) {
    responseData.data = payload.data;
  }
  if (payload.error !== void 0) {
    responseData.error = payload.error;
  }
  return res.status(payload.statusCode).json(responseData);
};
var sendResponse_default = sendResponse;

// src/modules/issues/issues.controller.ts
var getStatusCode = (error) => {
  const message = error?.message || "";
  if (message.includes("Unauthorized") || message.includes("Invalid")) return 401;
  if (message.includes("Forbidden") || message.includes("only")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("duplicate") || message.includes("invalid")) return 400;
  return 500;
};
var createIssues = async (req, res) => {
  try {
    const user = req.user;
    const payload = {
      ...req.body,
      reporter_id: user.id
    };
    const result = await issueService.createIssueIntoDB(payload);
    sendResponse_default(res, {
      statusCode: 201,
      success: true,
      message: "Issue created successfully",
      data: result.rows[0]
    });
  } catch (error) {
    const statusCode = getStatusCode(error);
    sendResponse_default(res, {
      statusCode,
      success: false,
      message: error.message,
      error
    });
  }
};
var getAllIssues = async (req, res) => {
  try {
    const result = await issueService.getAllIssuesFromDB(req.query);
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Issues retrieved successfully",
      data: result
    });
  } catch (error) {
    const statusCode = getStatusCode(error);
    sendResponse_default(res, {
      statusCode,
      success: false,
      message: error.message,
      error
    });
  }
};
var singleIssueShow = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await issueService.getSingleIssueFromDB(id);
    if (!result) {
      return sendResponse_default(res, {
        statusCode: 404,
        success: false,
        message: "Issue not found",
        data: {}
      });
    } else {
      sendResponse_default(res, {
        statusCode: 200,
        success: true,
        message: "Issue retrieved successfully",
        data: result
      });
    }
  } catch (error) {
    const statusCode = getStatusCode(error);
    sendResponse_default(res, {
      statusCode,
      success: false,
      message: error.message,
      error
    });
  }
};
var updateIssue = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await issueService.updateIssueIntoDB(
      id,
      req.body,
      req.user
    );
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Issue updated successfully",
      data: result
    });
  } catch (error) {
    const statusCode = getStatusCode(error);
    sendResponse_default(res, {
      statusCode,
      success: false,
      message: error.message,
      error
    });
  }
};
var deleteIssue = async (req, res) => {
  const { id } = req.params;
  try {
    await issueService.deleteIssueFromDB(id);
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Issue deleted successfully"
    });
  } catch (error) {
    const statusCode = getStatusCode(error);
    sendResponse_default(res, {
      statusCode,
      success: false,
      message: error.message,
      error
    });
  }
};
var issuesController = {
  createIssues,
  getAllIssues,
  singleIssueShow,
  updateIssue,
  deleteIssue
};

// src/middleware/verifyToken.ts
import jwt from "jsonwebtoken";
var verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }
    const token = authHeader.split(" ")[1] || authHeader;
    const decoded = jwt.verify(token, env_default.jwt_secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

// src/middleware/requireRole.ts
var requireRole = (roles) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions"
      });
    }
    next();
  };
};

// src/modules/issues/issues.route.ts
var router = Router();
router.post(
  "/",
  verifyToken,
  issuesController.createIssues
);
router.get("/", issuesController.getAllIssues);
router.get("/:id", issuesController.singleIssueShow);
router.patch("/:id", verifyToken, issuesController.updateIssue);
router.delete(
  "/:id",
  verifyToken,
  requireRole(["maintainer"]),
  issuesController.deleteIssue
);
var issuesRoute = router;

// src/modules/auth/auth.route.ts
import { Router as Router2 } from "express";

// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt2 from "jsonwebtoken";
var signupUserIntoDB = async (payload) => {
  const { name, email, password, role } = payload;
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `
        INSERT INTO users (
            name,
            email,
            password,
            role,
            created_at,
            updated_at
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING
        id,
        name,
        email,
        role,
        created_at,
        updated_at
        `,
    [name, email, hashedPassword, role]
  );
  return result;
};
var loginUser = async (payload) => {
  const { email, password } = payload;
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  if (result.rows.length === 0) {
    throw new Error("User not found");
  }
  const user = result.rows[0];
  const isPasswordMatched = await bcrypt.compare(
    password,
    user.password
  );
  if (!isPasswordMatched) {
    throw new Error("Password is incorrect");
  }
  const token = jwt2.sign(
    {
      id: user.id,
      name: user.name,
      role: user.role
    },
    env_default.jwt_secret,
    {
      expiresIn: "7d"
    }
  );
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  };
};
var authService = {
  signupUserIntoDB,
  loginUser
};

// src/modules/auth/auth.controller.ts
var getStatusCode2 = (error) => {
  const message = error?.message || "";
  if (message.includes("Invalid credentials")) return 401;
  if (message.includes("Forbidden")) return 403;
  if (message.includes("not found")) return 404;
  return 500;
};
var signupUser = async (req, res) => {
  try {
    const result = await authService.signupUserIntoDB(req.body);
    sendResponse_default(res, {
      statusCode: 201,
      success: true,
      message: "User registered successfully",
      data: result
    });
  } catch (error) {
    const statusCode = getStatusCode2(error);
    sendResponse_default(res, {
      statusCode,
      success: false,
      message: error.message
    });
  }
};
var loginUser2 = async (req, res) => {
  try {
    const result = await authService.loginUser(req.body);
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Login successful",
      data: result
    });
  } catch (error) {
    const statusCode = getStatusCode2(error);
    sendResponse_default(res, {
      statusCode,
      success: false,
      message: error.message
    });
  }
};
var authController = {
  signupUser,
  loginUser: loginUser2
};

// src/modules/auth/auth.route.ts
var router2 = Router2();
router2.post("/signup", authController.signupUser);
router2.post("/login", authController.loginUser);
var authRoute = router2;

// src/app.ts
import cors from "cors";
var app = express();
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ServerPulse is running!!",
    "author": "Sumaya Islam"
  });
});
app.use(express.json());
app.use(cors());
app.use("/api/issues", issuesRoute);
app.use("/api/auth", authRoute);
var app_default = app;

// src/server.ts
var main = () => {
  initDB();
  app_default.listen(env_default.port, () => {
    console.log(`App listening on port ${env_default.port}`);
  });
};
main();
//# sourceMappingURL=server.js.map