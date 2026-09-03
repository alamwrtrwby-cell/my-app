import { Router, type IRouter } from "express";
import healthRouter from "./health";
import baynatnaRouter from "./baynatna";

const router: IRouter = Router();

router.use(healthRouter);
router.use(baynatnaRouter);

export default router;
