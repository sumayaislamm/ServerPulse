import {Router, type Request, type Response} from "express";
import { issuesController } from "./issues.controller";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";

const router = Router();




router.post(
    '/',
    verifyToken,
    issuesController.createIssues
);
 
router.get('/', issuesController.getAllIssues);
router.get('/:id', issuesController.singleIssueShow);
router.patch('/:id', verifyToken, issuesController.updateIssue); 
router.delete('/:id', verifyToken,
  requireRole(['maintainer']),issuesController.deleteIssue
);


export const issuesRoute = router; 