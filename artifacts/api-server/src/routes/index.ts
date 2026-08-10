import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import messagesRouter from "./messages";
import tasksRouter from "./tasks";
import chatRouter from "./chat";
import authRouter from "./auth";
import sandRouter from "./sand";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(projectsRouter);
router.use(messagesRouter);
router.use(tasksRouter);
router.use(chatRouter);
router.use(sandRouter);

export default router;
