import bcrypt from "bcrypt";
import { pool } from "../../db";
import type { IUser } from "./auth.interface";
import jwt from "jsonwebtoken";
import config from "../../config/env";

const signupUserIntoDB = async (payload: IUser) => {

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
const loginUser = async (payload: {
    email: string;
    password: string;
}) => {
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
    const token = jwt.sign(
        {
            id: user.id,
            name: user.name,
            role: user.role
        },
        config.jwt_secret as string,
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

export const authService = {
    signupUserIntoDB,
    loginUser
}