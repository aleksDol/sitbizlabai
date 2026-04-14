import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer root .env so all services share one source of truth.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// Backward-compatible fallback for older local setup.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
