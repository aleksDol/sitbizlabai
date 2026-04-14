import { Router } from "express";
import { analyzeController, lossesController } from "../controllers/analyze.controller.js";

const router = Router();

router.post("/", analyzeController);
router.post("/losses", lossesController);

export default router;
