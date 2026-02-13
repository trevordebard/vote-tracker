import { defineConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";

const DEFAULT_PORT = 3000;

function resolvePlaywrightPort(startPort = DEFAULT_PORT): number {
  const probeScript = `
    const net = require("node:net");
    const start = Number(process.argv[1]);
    const max = start + 99;
    const tryPort = (port) => {
      if (port > max) {
        process.stderr.write("No open port found in range " + start + "-" + max);
        process.exit(1);
      }
      const server = net.createServer();
      server.unref();
      server.once("error", () => tryPort(port + 1));
      server.listen(port, "127.0.0.1", () => {
        server.close(() => {
          process.stdout.write(String(port));
        });
      });
    };
    tryPort(start);
  `;

  const output = execFileSync(process.execPath, ["-e", probeScript, String(startPort)], {
    encoding: "utf8",
  }).trim();
  const resolved = Number(output);
  if (!Number.isFinite(resolved)) {
    throw new Error(`Unable to resolve Playwright port from output: "${output}"`);
  }
  return resolved;
}

const port = Number(process.env.PLAYWRIGHT_PORT) || resolvePlaywrightPort();
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run build && npm run start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
