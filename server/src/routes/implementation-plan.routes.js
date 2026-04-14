import { Router } from "express";
import { implementationPlanController } from "../controllers/analyze.controller.js";

const router = Router();

router.post("/", implementationPlanController);

export default router;
