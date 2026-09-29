export const strings = {
  common: {
    loading: "Wird geladen...",
    retry: "Erneut versuchen",
    undo: "Rückgängig",
    login: "Anmelden",
    stand: "Stand",
    offline: "Offline",
    offlineStand: (time: string) => `Offline – Stand ${time}`,
    lastUpdated: (time: string) => `Stand ${time}`,
    empty: "Keine Daten vorhanden",
    error: "Ein Fehler ist aufgetreten",
    unauthorized: "Nicht angemeldet",
    unauthorizedMessage: "Bitte melde dich an, um fortzufahren.",
    close: "Schließen",
    refresh: "Aktualisieren",
  },
  tasks: {
    start: "Starten",
    done: "Fertig",
    reopen: "Wieder öffnen",
    openStatus: "Offen",
    inProgressStatus: "In Arbeit",
    doneStatus: "Erledigt",
    taskDoneUndo: "Aufgabe erledigt",
  },
  meals: {
    noLunch: "Kein Mittagessen",
    modified: (time: string, prev: number | string) => `Geändert ${time} · vorher ${prev}`,
  },
  chips: {
    dienst: "Dienst",
    teildienst: "TD",
    seminar: "SEM",
    abwesend: "Abwesend",
    frei: "Frei",
    veg: "VEG",
    vegan: "vegan",
    mos: "MOS",
    al: "AL",
    lp: "LP",
    gr: "GR",
  },
} as const;

export type Strings = typeof strings;
export default strings;
