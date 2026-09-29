import type { Database } from "@heute/domain";

/**
 * Types de tâche de nettoyage selon docs/design/screens.md §6.2 et copy.md §7.1.
 * Abreise (Endreinigung), Bleiber (Zwischenreinigung) ou Zone commune.
 */
export type TaskType = "abreise" | "bleiber" | "zone";

/**
 * Statuts d'avancement d'une tâche de nettoyage selon copy.md §7.1.
 * Correspond à l'enum Postgres public.task_status.
 */
export type TaskStatus = Database["public"]["Enums"]["task_status"];

/**
 * Libellés complets des types de ménage selon copy.md §7.1 et screens.md §6.2.
 */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  abreise: "Abreise · Endreinigung",
  bleiber: "Bleiber · Zwischenreinigung",
  zone: "Zone",
};

/**
 * Libellés courts des types de ménage (ex. pour la carte Heute screens.md §6.1).
 */
export const TASK_TYPE_SHORT_LABELS: Record<TaskType, string> = {
  abreise: "Abreise",
  bleiber: "Bleiber",
  zone: "Zone",
};

/**
 * Libellés des statuts selon copy.md §7.1.
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  offen: "Offen",
  in_arbeit: "In Arbeit",
  erledigt: "Erledigt",
};

/**
 * Libellés des actions utilisateur sur les tâches selon copy.md §7.1.
 */
export const TASK_ACTION_LABELS = {
  start: "Starten",
  complete: "Fertig",
  reopen: "Wieder öffnen",
  undo: "Rückgängig",
} as const;

/**
 * Élément unitaire d'une tâche de ménage visible par l'utilisateur.
 * Contrat exposé à l'interface (Agent U).
 */
export interface TaskItem {
  id: string;
  roomId: string | null;
  roomNumber: string | null;
  zone: string | null;
  title: string;
  floor: number;
  floorLabel: string;
  type: TaskType;
  typeLabel: string;
  status: TaskStatus;
  statusLabel: string;
  note?: string | null;
  assignedTo?: string | null;
  doneAt?: string | null;
}

/**
 * Groupe de tâches pour un étage donné, ordonnées avec les tâches terminées en bas.
 */
export interface TaskFloorGroup {
  floor: number;
  floorLabel: string;
  tasks: TaskItem[];
  openTasks?: TaskItem[];
  completedTasks?: TaskItem[];
}

/**
 * Vue complète des tâches de ménage d'une journée pour l'utilisateur connecté.
 */
export interface TasksDay {
  date: string;
  total: number;
  completed: number;
  progressLabel: string;
  floors: TaskFloorGroup[];
  completedTasks: TaskItem[];
  allTasks: TaskItem[];
}

/**
 * Formate l'étiquette d'un étage en allemand (ex. « EG », « 4. OG »).
 */
export function formatFloorLabel(floor: number): string {
  if (floor === 0) {
    return "EG";
  }
  if (floor < 0) {
    return Math.abs(floor) === 1 ? "UG" : `${Math.abs(floor)}. UG`;
  }
  return `${floor}. OG`;
}

/**
 * Formate le titre d'une tâche : numéro de chambre (« Zimmer 412 ») ou nom de zone (« Bäder 4. OG »).
 */
export function formatTaskTitle(task: {
  roomNumber?: string | null;
  zone?: string | null;
}): string {
  if (task.roomNumber) {
    return `Zimmer ${task.roomNumber}`;
  }
  if (task.zone) {
    return task.zone;
  }
  return "Aufgabe";
}

/**
 * Formate le texte d'avancement selon screens.md §6.2 (« 2 von 6 erledigt »).
 */
export function formatTasksProgress(completed: number, total: number): string {
  return `${completed} von ${total} erledigt`;
}

/**
 * Extrait le numéro d'étage depuis un libellé de zone lorsque room_id est absent.
 * Exemples : « Bäder 4. OG » -> 4, « Bäder Erdgeschoss » -> 0.
 */
export function extractFloorFromZone(zone: string): number {
  const ogMatch = zone.match(/(\d+)\.\s*OG/i);
  if (ogMatch && ogMatch[1]) {
    return parseInt(ogMatch[1], 10);
  }
  if (/erdgeschoss|eg\b/i.test(zone)) {
    return 0;
  }
  if (/untergeschoss|ug\b/i.test(zone)) {
    return -1;
  }
  if (/obergeschoss/i.test(zone)) {
    return 1;
  }
  return 0;
}

/**
 * Fonction de comparaison pour ordonner les tâches :
 * 1. Les tâches non terminées (offen / in_arbeit) passent avant les tâches terminées (erledigt)
 * 2. Tri par étage croissant
 * 3. Les chambres passent avant les zones sans numéro
 * 4. Tri par numéro de chambre croissant (naturel : 401 < 412)
 * 5. Tri alphabétique pour les zones
 */
export function compareTasks(a: TaskItem, b: TaskItem): number {
  const aDone = a.status === "erledigt";
  const bDone = b.status === "erledigt";

  if (aDone !== bDone) {
    return aDone ? 1 : -1;
  }

  if (a.floor !== b.floor) {
    return a.floor - b.floor;
  }

  const aHasRoom = a.roomNumber != null && a.roomNumber !== "";
  const bHasRoom = b.roomNumber != null && b.roomNumber !== "";

  if (aHasRoom && !bHasRoom) {
    return -1;
  }
  if (!aHasRoom && bHasRoom) {
    return 1;
  }

  if (aHasRoom && bHasRoom && a.roomNumber && b.roomNumber) {
    return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
  }

  return (a.zone ?? "").localeCompare(b.zone ?? "");
}

/**
 * Regroupe une liste de tâches par étage en respectant le tri par chambre et en plaçant les erledigt en bas.
 */
export function groupTasksByFloor(tasks: readonly TaskItem[]): TaskFloorGroup[] {
  const groupsByFloor = new Map<number, TaskItem[]>();

  for (const task of tasks) {
    const list = groupsByFloor.get(task.floor) ?? [];
    list.push(task);
    groupsByFloor.set(task.floor, list);
  }

  const sortedFloors = Array.from(groupsByFloor.keys()).sort((a, b) => a - b);

  return sortedFloors.map((floor) => {
    const floorTasks = (groupsByFloor.get(floor) ?? []).slice().sort(compareTasks);
    const openTasks = floorTasks.filter((t) => t.status !== "erledigt");
    const completedTasks = floorTasks.filter((t) => t.status === "erledigt");

    return {
      floor,
      floorLabel: formatFloorLabel(floor),
      tasks: floorTasks,
      openTasks,
      completedTasks,
    };
  });
}

/**
 * Construit un objet TasksDay complet à partir d'une date et d'une liste de tâches.
 */
export function createTasksDay(date: string, tasks: readonly TaskItem[]): TasksDay {
  const allTasks = tasks.slice().sort(compareTasks);
  const completedTasks = allTasks.filter((t) => t.status === "erledigt");
  const completed = completedTasks.length;
  const total = allTasks.length;

  return {
    date,
    total,
    completed,
    progressLabel: formatTasksProgress(completed, total),
    floors: groupTasksByFloor(allTasks),
    completedTasks,
    allTasks,
  };
}

/**
 * Fixture réaliste pour une journée complète (screens.md §6.2 : « Di, 30.09. »).
 * Total 6 tâches, 2 terminées (« 2 von 6 erledigt ») :
 * - 3. OG : 1 chambre (Zimmer 305, offen)
 * - 4. OG : 3 chambres (Zimmer 412 in Arbeit, Zimmer 414 offen, Zimmer 410 & 411 erledigt)
 * - 4. OG : 1 zone sans room_id (Bäder 4. OG, offen)
 */
export const FIXTURE_TASK_ITEMS: readonly TaskItem[] = [
  {
    id: "task-305",
    roomId: "r-305",
    roomNumber: "305",
    zone: null,
    title: "Zimmer 305",
    floor: 3,
    floorLabel: "3. OG",
    type: "abreise",
    typeLabel: TASK_TYPE_LABELS.abreise,
    status: "offen",
    statusLabel: TASK_STATUS_LABELS.offen,
    doneAt: null,
    note: null,
  },
  {
    id: "task-410",
    roomId: "r-410",
    roomNumber: "410",
    zone: null,
    title: "Zimmer 410",
    floor: 4,
    floorLabel: "4. OG",
    type: "abreise",
    typeLabel: TASK_TYPE_LABELS.abreise,
    status: "erledigt",
    statusLabel: TASK_STATUS_LABELS.erledigt,
    doneAt: "2026-09-30T09:45:00Z",
    note: null,
  },
  {
    id: "task-411",
    roomId: "r-411",
    roomNumber: "411",
    zone: null,
    title: "Zimmer 411",
    floor: 4,
    floorLabel: "4. OG",
    type: "bleiber",
    typeLabel: TASK_TYPE_LABELS.bleiber,
    status: "erledigt",
    statusLabel: TASK_STATUS_LABELS.erledigt,
    doneAt: "2026-09-30T10:30:00Z",
    note: null,
  },
  {
    id: "task-412",
    roomId: "r-412",
    roomNumber: "412",
    zone: null,
    title: "Zimmer 412",
    floor: 4,
    floorLabel: "4. OG",
    type: "abreise",
    typeLabel: TASK_TYPE_LABELS.abreise,
    status: "in_arbeit",
    statusLabel: TASK_STATUS_LABELS.in_arbeit,
    doneAt: null,
    note: null,
  },
  {
    id: "task-414",
    roomId: "r-414",
    roomNumber: "414",
    zone: null,
    title: "Zimmer 414",
    floor: 4,
    floorLabel: "4. OG",
    type: "bleiber",
    typeLabel: TASK_TYPE_LABELS.bleiber,
    status: "offen",
    statusLabel: TASK_STATUS_LABELS.offen,
    doneAt: null,
    note: null,
  },
  {
    id: "task-zone-4",
    roomId: null,
    roomNumber: null,
    zone: "Bäder 4. OG",
    title: "Bäder 4. OG",
    floor: 4,
    floorLabel: "4. OG",
    type: "zone",
    typeLabel: TASK_TYPE_LABELS.zone,
    status: "offen",
    statusLabel: TASK_STATUS_LABELS.offen,
    doneAt: null,
    note: null,
  },
];

export const TASKS_FIXTURE_DATE = "2026-09-30";

export const tasksDayFixture: TasksDay = createTasksDay(TASKS_FIXTURE_DATE, FIXTURE_TASK_ITEMS);
