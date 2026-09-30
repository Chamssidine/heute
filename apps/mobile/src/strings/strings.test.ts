import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { strings } = require("./de.ts") as typeof import("./de");

test("German strings format placeholders correctly", () => {
  assert.equal(strings.common.offlineStand("14:32"), "Offline – Stand 14:32");
  assert.equal(strings.common.lastUpdated("08:00"), "Stand 08:00");
  assert.equal(strings.meals.modified("14:05", 13), "Geändert 14:05 · vorher 13");
});

test("task action labels match tokens.md §4.1", () => {
  assert.equal(strings.tasks.start, "Starten");
  assert.equal(strings.tasks.done, "Fertig");
  assert.equal(strings.tasks.reopen, "Wieder öffnen");
  assert.equal(strings.common.undo, "Rückgängig");
});

test("tab labels match docs/design/screens.md §6", () => {
  assert.equal(strings.tabs.heute, "Heute");
  assert.equal(strings.tabs.dienstplan, "Dienstplan");
  assert.equal(strings.tabs.team, "Team");
  assert.equal(strings.tabs.aufgaben, "Aufgaben");
  assert.equal(strings.tabs.kueche, "Küche");
  assert.equal(strings.tabs.profil, "Profil");
  assert.equal(strings.tabs.comingSoon, "Bald verfügbar");
});

test("shift labels match docs/design/screens.md §6.5", () => {
  assert.equal(strings.shifts.title, "Mein Dienstplan");
  assert.equal(strings.shifts.week, "Woche");
  assert.equal(strings.shifts.month, "Monat");
  assert.equal(strings.shifts.sundayBonus, "(Sonntag)");
  assert.equal(strings.shifts.balanceHeader("120:00", "174:00"), "IST 120:00 / Soll 174:00 Std.");
  assert.equal(strings.shifts.monthNames[9], "Oktober");
});

test("auth and profil strings match docs/design/screens.md §6.6", () => {
  assert.equal(strings.auth.title, "Heute");
  assert.equal(strings.auth.subtitle, "Jugendherberge Musterberg");
  assert.equal(strings.auth.emailLabel, "E-Mail");
  assert.equal(strings.auth.passwordLabel, "Passwort");
  assert.equal(strings.auth.showPassword, "Anzeigen");
  assert.equal(strings.auth.hidePassword, "Verbergen");
  assert.equal(strings.auth.loginAction, "Anmelden");
  assert.equal(strings.auth.helpText, "Probleme? Frag an der Rezeption.");
  assert.equal(strings.profil.title, "Profil");
  assert.equal(strings.profil.logoutAction, "Abmelden");
  assert.equal(strings.profil.roles.staff, "Mitarbeiter");
  assert.equal(strings.profil.roles.kitchen_lead, "Küchenleitung");
  assert.equal(strings.profil.departments.kueche, "Küche");
});

test("today strings match docs/design/screens.md §6.1", () => {
  assert.equal(strings.today.myShift, "Mein Dienst");
  assert.equal(strings.today.myTasks, "Meine Aufgaben");
  assert.equal(strings.today.allTasks, "Alle Aufgaben");
  assert.equal(strings.today.guestsToday, "Gäste heute");
  assert.equal(strings.today.menu, "Menü");
  assert.equal(strings.today.mittag, "Mittag");
  assert.equal(strings.today.abend, "Abend");
  assert.equal(strings.today.frueh, "Früh");
});
