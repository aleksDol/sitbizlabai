import { Router } from "express";
import { analyzeLossesController } from "../controllers/analyze.controller.js";

const router = Router();

router.post("/", analyzeLossesController);

export default router;
