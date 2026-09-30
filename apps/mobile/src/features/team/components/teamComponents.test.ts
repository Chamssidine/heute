import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chipColors } from "../../../lib/theme/colors.ts";
import { strings } from "../../../strings/de.ts";
import { useTeamDay } from "../hooks.ts";
import { teamDayFixture } from "../model.ts";
import { formatTeamDate } from "./formatters.ts";

describe("features/team/components (P2-05 [U])", () => {
  describe("formatTeamDate", () => {
    it("formate correctement une date YYYY-MM-DD selon screens.md §6.4 (ex. « Do, 01.10. »)", () => {
      // 2026-10-01 est un jeudi (Do)
      assert.equal(formatTeamDate("2026-10-01"), "Do, 01.10.");
      // 2026-10-02 est un vendredi (Fr)
      assert.equal(formatTeamDate("2026-10-02"), "Fr, 02.10.");
      // 2026-10-04 est un dimanche (So)
      assert.equal(formatTeamDate("2026-10-04"), "So, 04.10.");
      // 2026-10-05 est un lundi (Mo)
      assert.equal(formatTeamDate("2026-10-05"), "Mo, 05.10.");
      // 2026-09-30 est un mercredi (Mi)
      assert.equal(formatTeamDate("2026-09-30"), "Mi, 30.09.");
    });

    it("lève une erreur explicite si le format est invalide", () => {
      assert.throws(() => formatTeamDate("invalid"), /Invalid team date/);
      assert.throws(() => formatTeamDate("2026-13-01"), /Invalid team date/);
      assert.throws(() => formatTeamDate("2026-00-10"), /Invalid team date/);
      assert.throws(() => formatTeamDate("2026-10-32"), /Invalid team date/);
    });
  });

  describe("structure de l'écran Team (screens.md §6.4)", () => {
    it("comprend les 3 groupes Küche, Housekeeping / BFD et Nicht da", () => {
      const groups = teamDayFixture.groups;
      assert.equal(groups.length, 3);
      assert.equal(groups[0]?.id, "kueche");
      assert.equal(groups[0]?.title, "Küche");
      assert.equal(groups[1]?.id, "housekeeping_bfd");
      assert.equal(groups[1]?.title, "Housekeeping / BFD");
      assert.equal(groups[2]?.id, "nicht_da");
      assert.equal(groups[2]?.title, "Nicht da");
    });

    it("affiche les membres de cuisine avec leurs horaires sans badge", () => {
      const kuecheGroup = teamDayFixture.groups[0];
      assert.ok(kuecheGroup);
      assert.equal(kuecheGroup.shifts.length, 2);

      const anna = kuecheGroup.shifts[0];
      assert.ok(anna);
      assert.equal(anna.name, "Anna Beispiel");
      assert.equal(anna.hours, "06:00–14:30");
      assert.equal(anna.badgeLabel, null);

      const ben = kuecheGroup.shifts[1];
      assert.ok(ben);
      assert.equal(ben.name, "Ben Muster");
      assert.equal(ben.hours, "10:30–19:00");
      assert.equal(ben.badgeLabel, null);
    });

    it("affiche les Teildienste avec horaires fractionnés et badge TD", () => {
      const hkGroup = teamDayFixture.groups[1];
      assert.ok(hkGroup);
      assert.equal(hkGroup.shifts.length, 1);

      const clara = hkGroup.shifts[0];
      assert.ok(clara);
      assert.equal(clara.name, "Clara Test");
      assert.equal(clara.hours, "08:00–13:00 · 18:00–21:00");
      assert.equal(clara.badgeLabel, "TD");
      assert.equal(clara.type, "td");
    });

    it("affiche David Probe avec Frei et sans badge", () => {
      const nichtDaGroup = teamDayFixture.groups[2];
      assert.ok(nichtDaGroup);

      const david = nichtDaGroup.shifts.find((s) => s.name === "David Probe");
      assert.ok(david);
      assert.equal(david.hours, "Frei");
      assert.equal(david.badgeLabel, null);
      assert.equal(david.type, "frei");
    });
  });

  describe("confidentialité des données et neutralité des absences (AGENTS.md & tokens.md §4.2)", () => {
    it("affiche uniquement « Abwesend » pour Eva Muster sans motif sensible", () => {
      const nichtDaGroup = teamDayFixture.groups[2];
      assert.ok(nichtDaGroup);

      const eva = nichtDaGroup.shifts.find((s) => s.name === "Eva Muster");
      assert.ok(eva);
      assert.equal(eva.hours, "Abwesend");
      assert.equal(eva.label, "Abwesend");
      assert.equal(eva.type, "abwesend");
      assert.equal(eva.badgeLabel, null);
    });

    it("vérifie que le style de chip pour teildienst et abwesend respecte les tokens", () => {
      assert.equal(chipColors.teildienst.bg, "#EDE9FE");
      assert.equal(chipColors.teildienst.text, "#4C1D95");
      assert.equal(chipColors.abwesend.bg, "#E5E7EB");
      assert.equal(chipColors.abwesend.text, "#374151");
    });
  });

  describe("hook useTeamDay", () => {
    it("renvoie l'état success avec les données pour la date fixture", () => {
      const state = useTeamDay(teamDayFixture.date);
      assert.equal(state.status, "success");
      if (state.status === "success") {
        assert.equal(state.data.date, "2026-09-30");
        assert.equal(state.data.groups.length, 3);
      }
    });

    it("renvoie l'état empty pour une autre date", () => {
      const state = useTeamDay("2026-10-15");
      assert.equal(state.status, "empty");
    });
  });

  describe("en-tête de l'écran Team", () => {
    it("formate le titre de l'écran avec le nom d'onglet et la date", () => {
      const formattedDate = formatTeamDate("2026-10-01");
      const title = strings.team.headerTitle(formattedDate);
      assert.equal(title, "Team · Do, 01.10.");
    });
  });
});
