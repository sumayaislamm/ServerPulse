import type { Request, Response } from "express";
import { issueService } from "./issues.service";
import sendResponse from "../../utils/sendResponse";

const getStatusCode = (error: any) => {
    const message = error?.message || "";

    if (message.includes("Unauthorized") || message.includes("Invalid")) return 401;
    if (message.includes("Forbidden") || message.includes("only")) return 403;
    if (message.includes("not found")) return 404;
    if (message.includes("duplicate") || message.includes("invalid")) return 400;

    return 500;
};

const createIssues = async (req: Request, res: Response) => {
 
    try {
        const user = (req as any).user;
        const payload = {
            ...req.body,
            reporter_id: user.id
        };
        const result = await issueService.createIssueIntoDB(payload);

        sendResponse(res, {
            statusCode: 201,
            success: true,
            message: "Issue created successfully",
            data: result.rows[0]
        });
    }
   catch (error: any) {
    const statusCode = getStatusCode(error);
    sendResponse(res, {
        statusCode,
        success: false,
        message: error.message,
        error: error
    });
}

}

const getAllIssues = async (req: Request, res: Response) => {
    try {

        const result = await issueService.getAllIssuesFromDB(req.query);

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: "Issues retrieved successfully",
            data: result
        });

    } catch (error: any) {

    const statusCode = getStatusCode(error);

    sendResponse(res, {
        statusCode,
        success: false,
        message: error.message,
        error: error
    });
}
};

const singleIssueShow = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await issueService.getSingleIssueFromDB(id as string);

        if (!result) {
            return sendResponse(res, {
                statusCode: 404,
                success: false,
                message: "Issue not found",
                data: {}
            });
        } else {
            sendResponse(res, {
                statusCode: 200,
                success: true,
                message: "Issue retrieved successfully",
                data: result
            });
        }

    }
   catch (error: any) {

    const statusCode = getStatusCode(error);

    sendResponse(res, {
        statusCode,
        success: false,
        message: error.message,
        error: error
    });
}

}

const updateIssue = async (req: Request, res: Response) => {

    const { id } = req.params;

    try {

        const result = await issueService.updateIssueIntoDB(
            id as string,
            req.body,
            (req as any).user
        );

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: "Issue updated successfully",
            data: result
        });

    } catch (error: any) {

    const statusCode = getStatusCode(error);

    sendResponse(res, {
        statusCode,
        success: false,
        message: error.message,
        error: error
    });
}
};

const deleteIssue = async (req: Request, res: Response) => {

    const { id } = req.params;

    try {

        await issueService.deleteIssueFromDB(id as string);

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: "Issue deleted successfully"
        });

    } catch (error: any) {

    const statusCode = getStatusCode(error);

    sendResponse(res, {
        statusCode,
        success: false,
        message: error.message,
        error: error
    });
}
};

export const issuesController = {
    createIssues,
    getAllIssues,
    singleIssueShow,
    updateIssue,
    deleteIssue
}