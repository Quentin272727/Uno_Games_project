/**
 * Lance Server.js sur PORT (défaut 34567), vérifie les routes HTML, arrête le serveur.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, "..");
const port = process.env.TEST_PORT || "34567";

const proc = spawn(process.execPath, ["Server.js"], {
  cwd: serverDir,
  env: { ...process.env, PORT: port },
  stdio: ["ignore", "pipe", "pipe"],
});

let buf = "";
proc.stdout.on("data", (d) => {
  buf += d.toString();
});
proc.stderr.on("data", (d) => {
  buf += d.toString();
});

function waitReady() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 15_000;
    const iv = setInterval(() => {
      if (buf.includes("server is running")) {
        clearInterval(iv);
        resolve();
      } else if (Date.now() > deadline) {
        clearInterval(iv);
        reject(new Error(`Timeout en attendant le serveur. Log:\n${buf}`));
      }
    }, 30);
  });
}

function shutdown() {
  proc.kill();
  return new Promise((r) => {
    proc.on("close", () => r());
    setTimeout(() => r(), 2000);
  });
}

try {
  await waitReady();
  const base = `http://127.0.0.1:${port}`;
  const routes = ["/", "/main", "/jeux", "/lobby"];
  for (const p of routes) {
    const res = await fetch(base + p);
    assertOk(res.ok, `${p} → HTTP ${res.status}`);
    const text = await res.text();
    assertOk(
      text.toLowerCase().includes("html"),
      `${p} doit renvoyer du HTML`,
    );
  }
  console.log("httpSmoke: OK (routes", routes.join(", "), ")");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await shutdown();
}

function assertOk(cond, msg) {
  if (!cond) throw new Error(msg);
}
