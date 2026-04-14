import { Router } from "express";
import { solutionOfferController } from "../controllers/analyze.controller.js";

const router = Router();

router.post("/", solutionOfferController);

export default router;
