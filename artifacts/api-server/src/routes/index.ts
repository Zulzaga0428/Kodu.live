import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import messagesRouter from "./messages";
import tasksRouter from "./tasks";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(messagesRouter);
router.use(tasksRouter);
router.use(chatRouter);

export default router;
