
import type { Request, Response } from "express";
import { authService } from "./auth.service";
import sendResponse from "../../utils/sendResponse";

const getStatusCode = (error: any) => {
    const message = error?.message || "";

    if (message.includes("Invalid credentials")) return 401;
    if (message.includes("Forbidden")) return 403;
    if (message.includes("not found")) return 404;
    return 500;
};

const signupUser = async (req: Request, res: Response) => {
    try {
        const result = await authService.signupUserIntoDB(req.body);
        sendResponse(res, {
            statusCode: 201,
            success: true,
            message: "User registered successfully",
            data: result
        });

    } catch (error: any) {

    const statusCode = getStatusCode(error);
    sendResponse(res, {
        statusCode,
        success: false,
        message: error.message
    });
}
};
const loginUser = async (req: Request, res: Response) => {

    try {
        const result = await authService.loginUser(req.body);
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: "Login successful",
            data: result
        });
    } catch (error: any) {

    const statusCode = getStatusCode(error);

    sendResponse(res, {
        statusCode,
        success: false,
        message: error.message
    });}
};

export const authController = {
    signupUser,
    loginUser
}