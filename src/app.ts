import express, { type Application, type Request, type Response } from 'express';
import { issuesRoute } from './modules/issues/issues.route';
import { authRoute } from './modules/auth/auth.route';
import cors from "cors";

const app: Application = express()

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "ServerPulse is running!!",
        "author": "Sumaya Islam"
    });
})


app.use(express.json());
app.use(cors());
app.use('/api/issues', issuesRoute); 
app.use('/api/auth', authRoute);


export default app;

