import type { Response } from "express";

interface TResponse<T> {
    statusCode: number;
    success: boolean;
    message: string;
    data?: T;
    error?: unknown;
}

const sendResponse = <T>(
    res: Response,
    payload: TResponse<T>
) => {

    const responseData: Record<string, unknown> = {
        success: payload.success,
        message: payload.message
    };

    if (payload.data !== undefined) {
        responseData.data = payload.data;
    }

    if (payload.error !== undefined) {
        responseData.error = payload.error;
    }

    return res.status(payload.statusCode).json(responseData);
};

export default sendResponse;