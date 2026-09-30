import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { useTeamDay } from "./hooks.ts";
import {
  createTeamDay,
  formatTeamShiftHours,
  groupTeamShifts,
  normalizeTeamShiftType,
  RAW_TEAM_SHIFTS_FIXTURE,
  TEAM_GROUP_TITLES,
  TEAM_SHIFT_BADGE_LABELS,
  TEAM_SHIFT_LABELS,
  teamDayFixture,
  toTeamShift,
  type RawTeamShift,
  type TeamShift,
} from "./model.ts";

describe("features/team (P2-05 [L])", () => {
  describe("model.ts - types et labels", () => {
    it("définit les libellés allemands exacts selon docs/design/copy.md §7.1", () => {
      assert.equal(TEAM_SHIFT_LABELS.normal, "Dienst");
      assert.equal(TEAM_SHIFT_LABELS.td, "Teildienst");
      assert.equal(TEAM_SHIFT_LABELS.sem, "Seminar");
      assert.equal(TEAM_SHIFT_LABELS.frei, "Frei");
      assert.equal(TEAM_SHIFT_LABELS.abwesend, "Abwesend");
    });

    it("définit le badge abrégé [TD] pour le Teildienst selon screens.md §6.4", () => {
      assert.equal(TEAM_SHIFT_BADGE_LABELS.td, "TD");
      assert.equal(TEAM_SHIFT_BADGE_LABELS.normal, undefined);
      assert.equal(TEAM_SHIFT_BADGE_LABELS.frei, undefined);
      assert.equal(TEAM_SHIFT_BADGE_LABELS.abwesend, undefined);
    });

    it("définit les titres de groupes exacts selon screens.md §6.4", () => {
      assert.equal(TEAM_GROUP_TITLES.kueche, "Küche");
      assert.equal(TEAM_GROUP_TITLES.housekeeping_bfd, "Housekeeping / BFD");
      assert.equal(TEAM_GROUP_TITLES.nicht_da, "Nicht da");
    });

    it("formate correctement les plages horaires avec tiret demi-cadratin et séparateur médian", () => {
      assert.equal(formatTeamShiftHours({ type: "normal", start1: 360, end1: 870 }), "06:00–14:30");
      assert.equal(
        formatTeamShiftHours({
          type: "td",
          start1: 480,
          end1: 780,
          start2: 1080,
          end2: 1260,
        }),
        "08:00–13:00 · 18:00–21:00",
      );
      assert.equal(formatTeamShiftHours({ type: "frei" }), "Frei");
      assert.equal(formatTeamShiftHours({ type: "abwesend" }), "Abwesend");
      assert.equal(formatTeamShiftHours({ type: "urlaub" }), "Abwesend");
      assert.equal(formatTeamShiftHours({ type: "krank" }), "Abwesend");
      assert.equal(formatTeamShiftHours({ type: "sem" }), "Seminar");
    });
  });

  describe("masquage des motifs sensibles (confidentialité AGENTS.md)", () => {
    it("masque systématiquement urlaub et krank en abwesend via normalizeTeamShiftType", () => {
      assert.equal(normalizeTeamShiftType("urlaub"), "abwesend");
      assert.equal(normalizeTeamShiftType("krank"), "abwesend");
      assert.equal(normalizeTeamShiftType("Krank"), "abwesend");
      assert.equal(normalizeTeamShiftType("Urlaub"), "abwesend");
      assert.equal(normalizeTeamShiftType("abwesend"), "abwesend");
      assert.equal(normalizeTeamShiftType("frei"), "frei");
      assert.equal(normalizeTeamShiftType("normal"), "normal");
      assert.equal(normalizeTeamShiftType("td"), "td");
    });

    it("toTeamShift transforme krank en type abwesend avec libellé Abwesend et sans motif médical", () => {
      const rawKrank: RawTeamShift = {
        employee_id: "emp-secret-1",
        display_name: "Max Muster",
        department: "kueche",
        type: "krank",
      };

      const shift: TeamShift = toTeamShift(rawKrank);

      assert.equal(shift.type, "abwesend");
      assert.equal(shift.label, "Abwesend");
      assert.equal(shift.hours, "Abwesend");
      assert.equal(shift.badgeLabel, null);

      // Vérifie qu'aucun terme sensible n'est présent dans l'objet sérialisé
      const serialized = JSON.stringify(shift).toLowerCase();
      assert.equal(serialized.includes("krank"), false);
      assert.equal(serialized.includes("urlaub"), false);
    });

    it("toTeamShift transforme urlaub en type abwesend avec libellé Abwesend", () => {
      const rawUrlaub: RawTeamShift = {
        employee_id: "emp-secret-2",
        display_name: "Lisa Probe",
        department: "housekeeping",
        type: "urlaub",
      };

      const shift: TeamShift = toTeamShift(rawUrlaub);

      assert.equal(shift.type, "abwesend");
      assert.equal(shift.label, "Abwesend");
      assert.equal(shift.hours, "Abwesend");
      assert.equal(shift.badgeLabel, null);

      const serialized = JSON.stringify(shift).toLowerCase();
      assert.equal(serialized.includes("krank"), false);
      assert.equal(serialized.includes("urlaub"), false);
    });
  });

  describe("groupement des équipes (Küche, Housekeeping/BFD, Nicht da)", () => {
    it("groupe correctement les employés dans les 3 sections canoniques", () => {
      const testShifts: RawTeamShift[] = [
        {
          employee_id: "1",
          display_name: "Chef Cuisinier",
          department: "kueche",
          type: "normal",
          start1: 360,
          end1: 870,
        },
        {
          employee_id: "2",
          display_name: "Agent Entretien",
          department: "housekeeping",
          type: "normal",
          start1: 480,
          end1: 990,
        },
        {
          employee_id: "3",
          display_name: "Volontaire BFD",
          department: "bfd",
          type: "td",
          start1: 480,
          end1: 780,
          start2: 1080,
          end2: 1260,
        },
        {
          employee_id: "4",
          display_name: "Cuisinier de Repos",
          department: "kueche",
          type: "frei",
        },
        {
          employee_id: "5",
          display_name: "Gouvernante Malade",
          department: "housekeeping",
          type: "krank",
        },
      ];

      const groups = groupTeamShifts(testShifts);

      assert.equal(groups.length, 3);
      assert.equal(groups[0]?.id, "kueche");
      assert.equal(groups[0]?.title, "Küche");
      assert.equal(groups[1]?.id, "housekeeping_bfd");
      assert.equal(groups[1]?.title, "Housekeeping / BFD");
      assert.equal(groups[2]?.id, "nicht_da");
      assert.equal(groups[2]?.title, "Nicht da");

      // Küche ne contient que le personnel présent en cuisine
      assert.equal(groups[0]?.shifts.length, 1);
      assert.equal(groups[0]?.shifts[0]?.name, "Chef Cuisinier");

      // Housekeeping/BFD regroupe les agents d'entretien et les volontaires BFD actifs
      assert.equal(groups[1]?.shifts.length, 2);
      assert.equal(groups[1]?.shifts[0]?.name, "Agent Entretien");
      assert.equal(groups[1]?.shifts[1]?.name, "Volontaire BFD");

      // Nicht da regroupe frei, krank, urlaub, abwesend quel que soit le département
      assert.equal(groups[2]?.shifts.length, 2);
      const namesNichtDa = groups[2]?.shifts.map((s) => s.name);
      assert.deepEqual(namesNichtDa, ["Cuisinier de Repos", "Gouvernante Malade"]);

      // Vérifie que l'employé malade a bien son motif masqué
      const maladeShift = groups[2]?.shifts.find((s) => s.name === "Gouvernante Malade");
      assert.equal(maladeShift?.type, "abwesend");
      assert.equal(maladeShift?.label, "Abwesend");
      assert.equal(maladeShift?.hours, "Abwesend");
    });

    it("trie alphabétiquement les employés par nom à l'intérieur de chaque groupe", () => {
      const unsortedKueche: RawTeamShift[] = [
        {
          employee_id: "1",
          display_name: "Zoe",
          department: "kueche",
          type: "normal",
          start1: 360,
          end1: 870,
        },
        {
          employee_id: "2",
          display_name: "Anna",
          department: "kueche",
          type: "normal",
          start1: 360,
          end1: 870,
        },
        {
          employee_id: "3",
          display_name: "Ben",
          department: "kueche",
          type: "normal",
          start1: 360,
          end1: 870,
        },
      ];

      const groups = groupTeamShifts(unsortedKueche);
      const names = groups[0]?.shifts.map((s) => s.name);
      assert.deepEqual(names, ["Anna", "Ben", "Zoe"]);
    });
  });

  describe("fixture réaliste (screens.md §6.4)", () => {
    it("correspond exactement à la maquette de docs/design/screens.md §6.4", () => {
      assert.equal(teamDayFixture.date, "2026-09-30");
      assert.equal(teamDayFixture.groups.length, 3);

      const [kueche, hkBfd, nichtDa] = teamDayFixture.groups;

      // Groupe Küche
      assert.equal(kueche?.title, "Küche");
      assert.equal(kueche?.shifts.length, 2);
      assert.equal(kueche?.shifts[0]?.name, "Anna Beispiel");
      assert.equal(kueche?.shifts[0]?.hours, "06:00–14:30");
      assert.equal(kueche?.shifts[0]?.badgeLabel, null);
      assert.equal(kueche?.shifts[1]?.name, "Ben Muster");
      assert.equal(kueche?.shifts[1]?.hours, "10:30–19:00");
      assert.equal(kueche?.shifts[1]?.badgeLabel, null);

      // Groupe Housekeeping / BFD
      assert.equal(hkBfd?.title, "Housekeeping / BFD");
      assert.equal(hkBfd?.shifts.length, 1);
      assert.equal(hkBfd?.shifts[0]?.name, "Clara Test");
      assert.equal(hkBfd?.shifts[0]?.hours, "08:00–13:00 · 18:00–21:00");
      assert.equal(hkBfd?.shifts[0]?.badgeLabel, "TD");

      // Groupe Nicht da
      assert.equal(nichtDa?.title, "Nicht da");
      assert.equal(nichtDa?.shifts.length, 2);
      assert.equal(nichtDa?.shifts[0]?.name, "David Probe");
      assert.equal(nichtDa?.shifts[0]?.hours, "Frei");
      assert.equal(nichtDa?.shifts[0]?.type, "frei");
      assert.equal(nichtDa?.shifts[1]?.name, "Eva Muster");
      assert.equal(nichtDa?.shifts[1]?.hours, "Abwesend");
      assert.equal(nichtDa?.shifts[1]?.type, "abwesend");
    });

    it("RAW_TEAM_SHIFTS_FIXTURE contient les 4 types demandés (normal, TD, frei, abwesend)", () => {
      const types = new Set(RAW_TEAM_SHIFTS_FIXTURE.map((s) => s.type));
      assert.equal(types.has("normal"), true);
      assert.equal(types.has("td"), true);
      assert.equal(types.has("frei"), true);
      assert.equal(types.has("abwesend"), true);
    });
  });

  describe("hooks.ts - useTeamDay", () => {
    it("renvoie un ViewState<TeamDay> avec statut success pour la date de la fixture", () => {
      const state = useTeamDay("2026-09-30");
      assert.equal(state.status, "success");
      if (state.status === "success") {
        assert.equal(state.data.date, "2026-09-30");
        assert.equal(state.data.groups.length, 3);
      }
    });

    it("utilise par défaut la date de la fixture si aucun argument n'est fourni", () => {
      const state = useTeamDay();
      assert.equal(state.status, "success");
      if (state.status === "success") {
        assert.equal(state.data.date, "2026-09-30");
      }
    });

    it("renvoie un statut empty si la date demandée n'est pas celle de la fixture", () => {
      const state = useTeamDay("2026-10-01");
      assert.equal(state.status, "empty");
    });
  });

  describe("createTeamDay", () => {
    it("construit un objet TeamDay valide pour une date arbitraire", () => {
      const result = createTeamDay("2026-10-05", []);
      assert.equal(result.date, "2026-10-05");
      assert.equal(result.groups.length, 3);
      assert.equal(result.groups[0]?.shifts.length, 0);
      assert.equal(result.groups[1]?.shifts.length, 0);
      assert.equal(result.groups[2]?.shifts.length, 0);
    });
  });
});
