#!/usr/bin/env node
// Stands in for the deployed worker during migration tests. Runs as its OWN
// process: the test drives the migration script with spawnSync, which blocks
// the test's event loop, so an in-process server could never accept the
// connection.
//   node stub-worker.mjs <port> <request-log> <ready-file>
import { createServer } from "node:http";
import { writeFileSync, appendFileSync } from "node:fs";

const [port, log, ready] = process.argv.slice(2);

createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    appendFileSync(log, JSON.stringify({ url: req.url, token: req.headers["x-auth-token"], body }) + "\n");
    let n = 0;
    try {
      n = JSON.parse(body).length;
    } catch {
      /* leave at 0 */
    }
    res.writeHead(200, { "Content-Type": "application/json", Connection: "close" });
    res.end(JSON.stringify({ ok: true, imported: n }));
  });
}).listen(Number(port), "127.0.0.1", () => writeFileSync(ready, "up"));

// never outlive the test run
setTimeout(() => process.exit(0), 60_000);
