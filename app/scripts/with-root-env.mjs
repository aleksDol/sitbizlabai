import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, "..");
const rootEnvPath = path.resolve(appDir, "..", ".env");

dotenv.config({ path: rootEnvPath });

const mode = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!mode || !["dev", "build", "start"].includes(mode)) {
  console.error("Usage: node scripts/with-root-env.mjs <dev|build|start> [args]");
  process.exit(1);
}

const nextCli = path.resolve(appDir, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextCli, mode, ...extraArgs], {
  cwd: appDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
