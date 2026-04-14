import { spawn } from "node:child_process";

const processes = [
  spawn("npm", ["run", "dev", "--prefix", "server"], { stdio: "inherit", shell: true }),
  spawn("npm", ["run", "dev", "--prefix", "client"], { stdio: "inherit", shell: true })
];

const shutdown = () => {
  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const child of processes) {
  child.on("exit", (code) => {
    if (code !== 0) {
      shutdown();
      process.exit(code ?? 1);
    }
  });
}
