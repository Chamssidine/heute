import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.ts";
import { GitHub } from "./github.ts";
import { startServer } from "./server.ts";
import { Orchestrator } from "./service.ts";
import { Store } from "./store.ts";

const config = loadConfig(new URL("../config.json", import.meta.url));
const store = new Store(fileURLToPath(new URL("../.state", import.meta.url)));
const github = new GitHub(config.gh, config.repo);
const repoDir = fileURLToPath(new URL("../../..", import.meta.url));
const orchestrator = new Orchestrator(config, github, store, repoDir);

await github.ensureStatusLabels();
await orchestrator.refresh();
startServer(config.port, orchestrator, store);

// Refreshing only reads GitHub: nothing is launched or merged without a click.
setInterval(() => {
  orchestrator
    .refresh()
    .catch((error: Error) => store.log("warn", `Actualisation : ${error.message}`));
}, config.refreshSeconds * 1000);
