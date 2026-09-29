/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_BREAK_MINUTES,
  FULL_DAY_MINUTES,
  KRANK_MINUTES,
  SUNDAY_FACTOR,
  formatHHMM,
  formatHours,
  isSundayDate,
  monthBalance,
  workedMinutes,
  type ShiftInput,
} from "./index.ts";

describe("règles de temps (P1-08)", () => {
  describe("constantes", () => {
    it("KRANK_MINUTES vaut 0 selon Q3 (Excel papier)", () => {
      assert.equal(KRANK_MINUTES, 0);
    });

    it("SUNDAY_FACTOR vaut 1,5 (+50% dimanche)", () => {
      assert.equal(SUNDAY_FACTOR, 1.5);
    });

    it("FULL_DAY_MINUTES vaut 480 (8 h)", () => {
      assert.equal(FULL_DAY_MINUTES, 480);
    });

    it("DEFAULT_BREAK_MINUTES vaut 30", () => {
      assert.equal(DEFAULT_BREAK_MINUTES, 30);
    });
  });

  describe("isSundayDate", () => {
    it("identifie correctement les dimanches en Europe/Berlin", () => {
      assert.equal(isSundayDate("2026-10-04"), true); // Dimanche
      assert.equal(isSundayDate("2026-10-01"), false); // Jeudi
      assert.equal(isSundayDate("2026-10-03"), false); // Samedi
      assert.equal(isSundayDate("2026-10-05"), false); // Lundi
    });
  });

  describe("workedMinutes - chaque type", () => {
    it("normal 06:00–14:30 avec 30 min de pause = 480 min (8 h)", () => {
      // 06:00 = 360, 14:30 = 870 -> amplitude 510 - 30 = 480
      const minutes = workedMinutes({
        type: "normal",
        date: "2026-10-01", // Jeudi
        start1: 360,
        end1: 870,
        break_min: 30,
      });
      assert.equal(minutes, 480);
    });

    it("normal sans break_min applique la pause par défaut de 30 min", () => {
      const minutes = workedMinutes({
        type: "normal",
        date: "2026-10-01",
        start1: 360,
        end1: 870,
      });
      assert.equal(minutes, 480);
    });

    it("TD 8–13 + 18–21 = 480 min (sans pause déduite)", () => {
      // 08:00 = 480, 13:00 = 780 (300 min)
      // 18:00 = 1080, 21:00 = 1260 (180 min)
      // 300 + 180 = 480 min
      const minutes = workedMinutes({
        type: "td",
        date: "2026-10-05", // Lundi
        start1: 480,
        end1: 780,
        start2: 1080,
        end2: 1260,
        break_min: 0,
      });
      assert.equal(minutes, 480);
    });

    it("sem = 480 min", () => {
      const minutes = workedMinutes({
        type: "sem",
        date: "2026-10-07",
      });
      assert.equal(minutes, 480);
    });

    it("urlaub = 480 min", () => {
      const minutes = workedMinutes({
        type: "urlaub",
        date: "2026-10-08",
      });
      assert.equal(minutes, 480);
    });

    it("frei = 0 min", () => {
      const minutes = workedMinutes({
        type: "frei",
        date: "2026-10-03",
      });
      assert.equal(minutes, 0);
    });

    it("krank = constante KRANK_MINUTES (0 min)", () => {
      const minutes = workedMinutes({
        type: "krank",
        date: "2026-10-12",
      });
      assert.equal(minutes, KRANK_MINUTES);
      assert.equal(minutes, 0);
    });

    it("dimanche travaillé (normal 06:00–14:30) = 720 min (480 * 1,5)", () => {
      const minutes = workedMinutes({
        type: "normal",
        date: "2026-10-04", // Dimanche
        start1: 360,
        end1: 870,
        break_min: 30,
      });
      assert.equal(minutes, 720);
    });

    it("dimanche avec isSunday explicite = 720 min", () => {
      const minutes = workedMinutes({
        type: "normal",
        start1: 360,
        end1: 870,
        break_min: 30,
        isSunday: true,
      });
      assert.equal(minutes, 720);
    });

    it("dimanche TD = 720 min (480 * 1,5)", () => {
      const minutes = workedMinutes({
        type: "td",
        date: "2026-10-18", // Dimanche
        start1: 480,
        end1: 780,
        start2: 1080,
        end2: 1260,
      });
      assert.equal(minutes, 720);
    });

    it("dimanche frei reste 0 min", () => {
      const minutes = workedMinutes({
        type: "frei",
        date: "2026-10-04",
      });
      assert.equal(minutes, 0);
    });

    it("dimanche krank reste 0 min", () => {
      const minutes = workedMinutes({
        type: "krank",
        date: "2026-10-04",
      });
      assert.equal(minutes, 0);
    });
  });

  describe("formatHHMM", () => {
    it("formate « 08:00 » avec zéro initial", () => {
      assert.equal(formatHHMM(480), "08:00");
    });

    it("formate « 00:00 » pour 0 minute", () => {
      assert.equal(formatHHMM(0), "00:00");
    });

    it("formate les minutes simples et les heures pleines", () => {
      assert.equal(formatHHMM(30), "00:30");
      assert.equal(formatHHMM(510), "08:30");
      assert.equal(formatHHMM(870), "14:30");
    });

    it("gère les totaux mensuels dépassant 24h", () => {
      assert.equal(formatHHMM(7200), "120:00");
      assert.equal(formatHHMM(10440), "174:00");
    });

    it("gère les valeurs négatives", () => {
      assert.equal(formatHHMM(-30), "-00:30");
      assert.equal(formatHHMM(-480), "-08:00");
    });
  });

  describe("formatHours", () => {
    it("formate « 8:00 Std. » sans décimales ni zéro initial", () => {
      assert.equal(formatHours(480), "8:00 Std.");
    });

    it("formate « 0:00 Std. » pour 0 minute", () => {
      assert.equal(formatHours(0), "0:00 Std.");
    });

    it("formate des durées variées avec les minutes exactes", () => {
      assert.equal(formatHours(510), "8:30 Std.");
      assert.equal(formatHours(720), "12:00 Std.");
      assert.equal(formatHours(10440), "174:00 Std.");
    });

    it("gère les soldes négatifs", () => {
      assert.equal(formatHours(-480), "-8:00 Std.");
      assert.equal(formatHours(-30), "-0:30 Std.");
    });
  });

  describe("monthBalance et mois fictif complet", () => {
    // Dienstplan mensuel fictif (Octobre 2026, 31 jours) pour un employé temps plein (VZ, contrat 174 h = 10 440 min).
    // Structure 4 lignes de l'Excel : début, fin, Bemerkung, IST o. Pause.
    //
    // Ligne « IST o. Pause » attendue par jour :
    // 01.10 Do : 06:00–14:30 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 02.10 Fr : 06:00–14:30 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 03.10 Sa : frei                                         -> IST =  0,00 h (   0 min)
    // 04.10 So : 06:00–14:30 (pause 30, dimanche factor 1,5)  -> IST = 12,00 h ( 720 min)
    // 05.10 Mo : TD 08:00–13:00 + 18:00–21:00 (sans pause)    -> IST =  8,00 h ( 480 min)
    // 06.10 Di : 06:00–14:30 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 07.10 Mi : SEM (Seminar forfait 8h)                     -> IST =  8,00 h ( 480 min)
    // 08.10 Do : u (Urlaub forfait 8h)                        -> IST =  8,00 h ( 480 min)
    // 09.10 Fr : u (Urlaub forfait 8h)                        -> IST =  8,00 h ( 480 min)
    // 10.10 Sa : frei                                         -> IST =  0,00 h (   0 min)
    // 11.10 So : frei                                         -> IST =  0,00 h (   0 min)
    // 12.10 Mo : k (Krank, Q3 = 0,00 dans l'Excel)            -> IST =  0,00 h (   0 min)
    // 13.10 Di : 08:00–16:30 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 14.10 Mi : 08:00–16:30 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 15.10 Do : 08:00–16:30 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 16.10 Fr : 08:00–16:30 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 17.10 Sa : frei                                         -> IST =  0,00 h (   0 min)
    // 18.10 So : TD 08:00–13:00 + 18:00–21:00 (dimanche 1,5)  -> IST = 12,00 h ( 720 min)
    // 19.10 Mo : frei                                         -> IST =  0,00 h (   0 min)
    // 20.10 Di : 10:30–19:00 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 21.10 Mi : 10:30–19:00 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 22.10 Do : 10:30–19:00 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 23.10 Fr : 10:30–19:00 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 24.10 Sa : frei                                         -> IST =  0,00 h (   0 min)
    // 25.10 So : frei                                         -> IST =  0,00 h (   0 min)
    // 26.10 Mo : 06:45–15:15 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 27.10 Di : 06:45–15:15 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 28.10 Mi : 06:45–15:15 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 29.10 Do : 06:45–15:15 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 30.10 Fr : 06:45–15:15 (pause 30)                       -> IST =  8,00 h ( 480 min)
    // 31.10 Sa : frei                                         -> IST =  0,00 h (   0 min)
    //
    // Total IST o. Pause attendu comme dans l'Excel :
    // 16 jours normaux en semaine x 8,00 h = 128,00 h (7 680 min)
    // 1 jour TD en semaine x 8,00 h       =   8,00 h (  480 min)
    // 1 jour SEM x 8,00 h                 =   8,00 h (  480 min)
    // 2 jours Urlaub x 8,00 h             =  16,00 h (  960 min)
    // 1 jour Krank x 0,00 h               =   0,00 h (    0 min)
    // 8 jours Frei x 0,00 h               =   0,00 h (    0 min)
    // 2 dimanches travaillés x 12,00 h    =  24,00 h (1 440 min)
    // -------------------------------------------------------------------
    // Somme IST du mois                   = 184,00 h = 11 040 min
    // Soll contractuel VZ                 = 174,00 h = 10 440 min
    // Solde (Überstunden)                 = +10,00 h =   +600 min

    const octoberShifts: readonly ShiftInput[] = [
      { date: "2026-10-01", type: "normal", start1: 360, end1: 870, break_min: 30 },
      { date: "2026-10-02", type: "normal", start1: 360, end1: 870, break_min: 30 },
      { date: "2026-10-03", type: "frei" },
      { date: "2026-10-04", type: "normal", start1: 360, end1: 870, break_min: 30 },
      {
        date: "2026-10-05",
        type: "td",
        start1: 480,
        end1: 780,
        start2: 1080,
        end2: 1260,
        break_min: 0,
      },
      { date: "2026-10-06", type: "normal", start1: 360, end1: 870, break_min: 30 },
      { date: "2026-10-07", type: "sem" },
      { date: "2026-10-08", type: "urlaub" },
      { date: "2026-10-09", type: "urlaub" },
      { date: "2026-10-10", type: "frei" },
      { date: "2026-10-11", type: "frei" },
      { date: "2026-10-12", type: "krank" },
      { date: "2026-10-13", type: "normal", start1: 480, end1: 990, break_min: 30 },
      { date: "2026-10-14", type: "normal", start1: 480, end1: 990, break_min: 30 },
      { date: "2026-10-15", type: "normal", start1: 480, end1: 990, break_min: 30 },
      { date: "2026-10-16", type: "normal", start1: 480, end1: 990, break_min: 30 },
      { date: "2026-10-17", type: "frei" },
      {
        date: "2026-10-18",
        type: "td",
        start1: 480,
        end1: 780,
        start2: 1080,
        end2: 1260,
        break_min: 0,
      },
      { date: "2026-10-19", type: "frei" },
      { date: "2026-10-20", type: "normal", start1: 630, end1: 1140, break_min: 30 },
      { date: "2026-10-21", type: "normal", start1: 630, end1: 1140, break_min: 30 },
      { date: "2026-10-22", type: "normal", start1: 630, end1: 1140, break_min: 30 },
      { date: "2026-10-23", type: "normal", start1: 630, end1: 1140, break_min: 30 },
      { date: "2026-10-24", type: "frei" },
      { date: "2026-10-25", type: "frei" },
      { date: "2026-10-26", type: "normal", start1: 405, end1: 915, break_min: 30 },
      { date: "2026-10-27", type: "normal", start1: 405, end1: 915, break_min: 30 },
      { date: "2026-10-28", type: "normal", start1: 405, end1: 915, break_min: 30 },
      { date: "2026-10-29", type: "normal", start1: 405, end1: 915, break_min: 30 },
      { date: "2026-10-30", type: "normal", start1: 405, end1: 915, break_min: 30 },
      { date: "2026-10-31", type: "frei" },
    ];

    it("calcule la balance exacte du mois fictif face au Soll de 174h", () => {
      const sollVZ = 174 * 60; // 10 440 min
      const balance = monthBalance(octoberShifts, sollVZ);

      assert.equal(balance.istMinutes, 11040); // 184:00 Std.
      assert.equal(balance.sollMinutes, 10440); // 174:00 Std.
      assert.equal(balance.diffMinutes, 600); // +10:00 Std.

      assert.equal(formatHours(balance.istMinutes), "184:00 Std.");
      assert.equal(formatHours(balance.sollMinutes), "174:00 Std.");
      assert.equal(formatHours(balance.diffMinutes), "10:00 Std.");
    });
  });
});
