import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("routes expo-router (P2-03b [U])", () => {
  const tabsDir = path.join(__dirname, "(tabs)");

  it("src/app/(tabs)/ ne contient que _layout.tsx et les six écrans", () => {
    const files = fs.readdirSync(tabsDir).sort();
    const expectedFiles = [
      "_layout.tsx",
      "aufgaben.tsx",
      "dienstplan.tsx",
      "heute.tsx",
      "kueche.tsx",
      "profil.tsx",
      "team.tsx",
    ].sort();

    assert.deepEqual(files, expectedFiles);
  });

  it("aucun module d'aide (icons, tab-icons) n'est présent dans src/app/(tabs)/", () => {
    const files = fs.readdirSync(tabsDir);
    assert.equal(files.includes("icons.tsx"), false);
    assert.equal(files.includes("tab-icons.tsx"), false);
  });

  it("l'ordre des six onglets dans _layout.tsx est heute, dienstplan, team, aufgaben, kueche, profil", () => {
    const layoutContent = fs.readFileSync(path.join(tabsDir, "_layout.tsx"), "utf-8");
    const screenMatches = [...layoutContent.matchAll(/<Tabs\.Screen\s+name="([^"]+)"/g)].map(
      (m) => m[1],
    );

    assert.deepEqual(screenMatches, [
      "heute",
      "dienstplan",
      "team",
      "aufgaben",
      "kueche",
      "profil",
    ]);
  });
});
