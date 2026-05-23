import { pool } from "../../db";
import type { IIssue } from "./issues.interface";

const createIssueIntoDB = async (payload: IIssue) => {

    const {
        title,
        description,
        type,
        reporter_id } = payload;
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
}
const getAllIssuesFromDB = async (query: any) => {

    const { sort = "newest", type, status } = query;

    let baseQuery = `SELECT * FROM issues`;
    const conditions: string[] = [];
    const values: any[] = [];

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

    // collect reporter IDs
    const reporterIds = [...new Set(issues.map(i => i.reporter_id))];

    let usersMap: any = {};

    if (reporterIds.length > 0) {
        const usersResult = await pool.query(
            `SELECT id, name, role FROM users WHERE id = ANY($1)`,
            [reporterIds]
        );

        usersResult.rows.forEach(user => {
            usersMap[user.id] = user;
        });
    }

    // attach reporter object
    const finalData = issues.map(issue => {
        return {
            ...issue,
            reporter: usersMap[issue.reporter_id] || null
        };
    });

    return finalData;
};

const getSingleIssueFromDB = async (id: string) => {

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
}

const updateIssueIntoDB = async (
    id: string,
    payload: any,
    user: any
) => {

    // 1. Get existing issue
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

        // must own issue
        if (issue.reporter_id !== currentUser.id) {
            throw new Error("Forbidden: You can only update your own issues");
        }

        // must be open
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
const deleteIssueFromDB = async (id: string, user: any) => {

    if (!user || user.role !== "maintainer") {
        throw new Error("Forbidden: Only maintainer can delete issues");
    }

    const result = await pool.query(
        `DELETE FROM issues WHERE id = $1 RETURNING id`,
        [id]
    );

    if (result.rows.length === 0) {
        throw new Error("Not found: Issue not found");
    }

    return result.rows[0];
};

export const issueService = {
    createIssueIntoDB,
    getAllIssuesFromDB,
    getSingleIssueFromDB,
    updateIssueIntoDB,
    deleteIssueFromDB
}