import { Router, type IRouter } from "express";
import healthRouter from "./health";
import miniappRouter from "./miniapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/miniapp", miniappRouter);

export default router;
