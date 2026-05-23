
import type { NextFunction, Request, Response } from "express";

import jwt from "jsonwebtoken";
import config from "../config/env";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const token = authHeader.split(" ")[1] || authHeader;

        const decoded = jwt.verify(token, config.jwt_secret as string);

        (req as any).user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};