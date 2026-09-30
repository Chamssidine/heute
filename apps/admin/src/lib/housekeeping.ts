export type TaskStatus = "offen" | "in_arbeit" | "erledigt";
export type TaskType = "abreise" | "bleiber";

export type HousekeepingTask = {
  id: string;
  taskType: TaskType;
  zone: string | null;
  status: TaskStatus;
  assignedTo: string | null;
  roomNumber: string | null;
  floor: number | null;
};

export type FloorGroup = { floor: number | null; tasks: HousekeepingTask[] };

export const STATUS_COLORS: Record<TaskStatus, string> = {
  offen: "gray",
  in_arbeit: "yellow",
  erledigt: "green",
};

export function today(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(now);
}

// Les tâches de zone (sans chambre) vont dans un groupe final sans étage.
export function groupByFloor(tasks: HousekeepingTask[]): FloorGroup[] {
  const groups = new Map<number | null, HousekeepingTask[]>();
  for (const task of tasks) {
    const list = groups.get(task.floor) ?? [];
    list.push(task);
    groups.set(task.floor, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a ?? Number.POSITIVE_INFINITY) - (b ?? Number.POSITIVE_INFINITY))
    .map(([floor, list]) => ({
      floor,
      tasks: [...list].sort((a, b) =>
        (a.roomNumber ?? a.zone ?? "").localeCompare(b.roomNumber ?? b.zone ?? "", "de", {
          numeric: true,
        }),
      ),
    }));
}
