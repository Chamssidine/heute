import { delimiter, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.ts";
import { GitHub } from "./github.ts";
import { startServer } from "./server.ts";
import { Orchestrator } from "./service.ts";
import { Store } from "./store.ts";

const config = loadConfig(new URL("../config.json", import.meta.url));
// Agents call `gh` by name: make sure the configured one is on their PATH.
process.env["PATH"] = `${dirname(config.gh)}${delimiter}${process.env["PATH"] ?? ""}`;
const store = new Store(fileURLToPath(new URL("../.state", import.meta.url)));
const github = new GitHub(config.gh, config.repo);
const repoDir = fileURLToPath(new URL("../../..", import.meta.url));
const orchestrator = new Orchestrator(config, github, store, repoDir);

// Safety net: a background error is logged in the dashboard, it never stops the server.
process.on("unhandledRejection", (reason) => {
  store.log(
    "error",
    `Erreur non gérée : ${reason instanceof Error ? reason.message : String(reason)}`,
  );
});

await github.ensureStatusLabels();
await orchestrator.releaseInterruptedRuns();
await orchestrator.refresh();
// ORCHESTRATOR_PORT lets a second instance run next to the usual one (e.g. to test a change).
startServer(Number(process.env["ORCHESTRATOR_PORT"] ?? config.port), orchestrator, store);

// Every tick reads GitHub, then the autopilot reviews, corrects and launches what is due.
// It never merges: merging stays a click (see the autopilot switch in the dashboard).
async function tick(): Promise<void> {
  try {
    await orchestrator.refresh();
  } catch (error) {
    store.log("warn", `Actualisation : ${(error as Error).message}`);
    return;
  }
  await orchestrator.autopilotTick();
}
void orchestrator.autopilotTick();
setInterval(() => void tick(), config.refreshSeconds * 1000);
