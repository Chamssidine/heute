import type { AgentSpec } from "./agents.ts";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import type { Orchestrator } from "./service.ts";
import type { Store } from "./store.ts";

const PAGE = new URL("../public/index.html", import.meta.url);

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c: Buffer) => {
      body += c.toString();
      if (body.length > 10_000) reject(new Error("Requête trop grande"));
    });
    req.on("end", () => {
      try {
        resolve(body ? (JSON.parse(body) as Record<string, unknown>) : {});
      } catch {
        reject(new Error("JSON invalide"));
      }
    });
  });
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

// Local-only API. Mutating calls need a custom header (a cross-site page cannot send it
// without a CORS preflight, which is never granted) and a same-origin Origin header.
function isTrustedAction(req: IncomingMessage, port: number): boolean {
  if (req.headers["x-orchestrator"] !== "1") return false;
  const origin = req.headers.origin;
  return (
    origin === undefined ||
    origin === `http://127.0.0.1:${port}` ||
    origin === `http://localhost:${port}`
  );
}

export function startServer(port: number, orchestrator: Orchestrator, store: Store): void {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    try {
      if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "content-security-policy":
            "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
        });
        res.end(readFileSync(PAGE));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/state") {
        json(res, 200, orchestrator.view());
        return;
      }
      // Local PRs have no web page: their diff is served here (opened by « Voir le diff »).
      const diffRoute = url.pathname.match(/^\/api\/pr\/(\d+)(?:\/files)?$/);
      if (req.method === "GET" && diffRoute) {
        try {
          const diff = await orchestrator.diffOf(Number(diffRoute[1]));
          res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
          res.end(diff || "(aucune différence)");
        } catch (error) {
          res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          res.end((error as Error).message);
        }
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/events") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
        const send = (): void => void res.write(`data: ${JSON.stringify(orchestrator.view())}\n\n`);
        send();
        store.on("change", send);
        req.on("close", () => store.off("change", send));
        return;
      }
      if (req.method === "POST" && url.pathname.startsWith("/api/actions/")) {
        if (!isTrustedAction(req, port)) {
          json(res, 403, { error: "Action refusée" });
          return;
        }
        const body = await readBody(req);
        const action = url.pathname.slice("/api/actions/".length);
        const number = Number(body["number"]);
        const text = (key: string): string => String(body[key] ?? "");
        switch (action) {
          case "refresh":
            await orchestrator.refresh();
            break;
          case "launch":
            await orchestrator.launch(text("agent"));
            break;
          case "import":
            json(res, 200, { ok: true, added: await orchestrator.importTasks() });
            return;
          case "extendBudget":
            await orchestrator.extendBudget(Number(body["issue"]), Number(body["add"]));
            break;
          case "suggest":
            json(res, 200, { tasks: orchestrator.suggestTasks((body["paths"] as string[]) ?? []) });
            return;
          case "createAgent":
            json(res, 200, {
              ok: true,
              id: await orchestrator.createAgent(
                body["spec"] as AgentSpec,
                (body["assign"] as number[]) ?? [],
              ),
            });
            return;
          case "updateAgent":
            await orchestrator.updateAgent(
              text("id"),
              (body["patch"] as Parameters<typeof orchestrator.updateAgent>[1]) ?? {},
            );
            break;
          case "deleteAgent":
            await orchestrator.deleteAgent(text("id"));
            break;
          case "assign":
            await orchestrator.assignTasks((body["numbers"] as number[]) ?? [], text("agent"));
            break;
          case "autopilot":
            orchestrator.setAutopilot(body["enabled"] === true);
            break;
          case "stop":
            await orchestrator.stop(text("agent"));
            break;
          case "done":
            await orchestrator.markDone(text("agent"));
            break;
          case "review":
            orchestrator.startReview(number, text("reviewer"));
            break;
          case "sendback":
            await orchestrator.sendBack(number, text("note"));
            break;
          case "merge":
            await orchestrator.merge(number);
            break;
          case "unblock":
            await orchestrator.unblock(number);
            break;
          default:
            json(res, 404, { error: `Action inconnue : ${action}` });
            return;
        }
        json(res, 200, { ok: true });
        return;
      }
      json(res, 404, { error: "Introuvable" });
    } catch (error) {
      store.log("error", (error as Error).message);
      json(res, 400, { error: (error as Error).message });
    }
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Orchestrateur : http://127.0.0.1:${port}`);
  });
}
