// Textes de la vue Kompakt. Hors `strings/` (interdit à AD2) : à déplacer dans `de.schedule` par A/A2.
export const scheduleView = {
  viewLabel: "Ansicht des Dienstplans",
  viewCompact: "Kompakt",
  viewExcel: "Excel",
  legend: "Legende",
  legendTitle: "Legende des Dienstplans",
  legendClose: "Schließen",
  today: "Heute",
  sundayFactor: "×1,5",
  istMonth: "IST",
  badges: {
    normal: "Dienst",
    td: "Teildienst",
    sem: "Seminar",
    urlaub: "Urlaub",
    krank: "Krank",
    frei: "Frei",
  },
  legendCodes: [
    { code: "x", meaning: "frei (Freier Tag)" },
    { code: "k", meaning: "krank" },
    { code: "u", meaning: "Urlaub" },
    { code: "TD", meaning: "Teildienst (zwei Teile, 2. Teil in der zweiten Zeile)" },
    { code: "SEM", meaning: "Seminar" },
  ],
  legendIst: "IST o. Pause: geleistete Arbeitszeit ohne Pause (HH:MM).",
  legendSunday:
    "Sonntage sind hinterlegt und mit ×1,5 markiert: Die Arbeitszeit zählt mit Zuschlag.",
  legendSaldo: "Saldo = IST − Soll. Grün mit + ist ein Plus, orange mit − ein Minus.",
} as const;
