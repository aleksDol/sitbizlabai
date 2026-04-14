import express from "express";
import cors from "cors";
import analyzeLossesRouter from "./routes/analyze-losses.routes.js";
import analyzeRouter from "./routes/analyze.routes.js";
import implementationPlanRouter from "./routes/implementation-plan.routes.js";
import solutionOfferRouter from "./routes/solution-offer.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/analyze", analyzeRouter);
app.use("/analyze-losses", analyzeLossesRouter);
app.use("/implementation-plan", implementationPlanRouter);
app.use("/solution-offer", solutionOfferRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
