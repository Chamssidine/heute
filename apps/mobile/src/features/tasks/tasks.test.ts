import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchTasksDay, mapTasksError, TASKS_ERROR_MESSAGES } from "./api.ts";
import { useTasksDay } from "./hooks.ts";
import {
  compareTasks,
  createTasksDay,
  extractFloorFromZone,
  formatFloorLabel,
  formatTasksProgress,
  formatTaskTitle,
  groupTasksByFloor,
  TASK_ACTION_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_SHORT_LABELS,
  tasksDayFixture,
  type TaskItem,
} from "./model.ts";

describe("features/tasks (P2-08 [L])", () => {
  describe("model.ts - types, libellés et helpers", () => {
    it("définit les libellés allemands exacts selon docs/design/copy.md §7.1", () => {
      assert.equal(TASK_TYPE_LABELS.abreise, "Abreise · Endreinigung");
      assert.equal(TASK_TYPE_LABELS.bleiber, "Bleiber · Zwischenreinigung");
      assert.equal(TASK_TYPE_LABELS.zone, "Zone");

      assert.equal(TASK_TYPE_SHORT_LABELS.abreise, "Abreise");
      assert.equal(TASK_TYPE_SHORT_LABELS.bleiber, "Bleiber");
      assert.equal(TASK_TYPE_SHORT_LABELS.zone, "Zone");

      assert.equal(TASK_STATUS_LABELS.offen, "Offen");
      assert.equal(TASK_STATUS_LABELS.in_arbeit, "In Arbeit");
      assert.equal(TASK_STATUS_LABELS.erledigt, "Erledigt");

      assert.equal(TASK_ACTION_LABELS.start, "Starten");
      assert.equal(TASK_ACTION_LABELS.complete, "Fertig");
      assert.equal(TASK_ACTION_LABELS.reopen, "Wieder öffnen");
      assert.equal(TASK_ACTION_LABELS.undo, "Rückgängig");
    });

    it("formate correctement les étages", () => {
      assert.equal(formatFloorLabel(0), "EG");
      assert.equal(formatFloorLabel(1), "1. OG");
      assert.equal(formatFloorLabel(4), "4. OG");
      assert.equal(formatFloorLabel(-1), "UG");
    });

    it("formate correctement le titre de tâche (chambre ou zone)", () => {
      assert.equal(formatTaskTitle({ roomNumber: "412", zone: null }), "Zimmer 412");
      assert.equal(formatTaskTitle({ roomNumber: null, zone: "Bäder 4. OG" }), "Bäder 4. OG");
      assert.equal(formatTaskTitle({ roomNumber: null, zone: null }), "Aufgabe");
    });

    it("formate la progression « erledigt / total »", () => {
      assert.equal(formatTasksProgress(2, 6), "2 von 6 erledigt");
      assert.equal(formatTasksProgress(0, 5), "0 von 5 erledigt");
      assert.equal(formatTasksProgress(5, 5), "5 von 5 erledigt");
    });

    it("extrait le numéro d'étage depuis le nom d'une zone", () => {
      assert.equal(extractFloorFromZone("Bäder 4. OG"), 4);
      assert.equal(extractFloorFromZone("Flur 2. OG"), 2);
      assert.equal(extractFloorFromZone("Bäder Erdgeschoss"), 0);
      assert.equal(extractFloorFromZone("Küche EG"), 0);
      assert.equal(extractFloorFromZone("Lager UG"), -1);
      assert.equal(extractFloorFromZone("Schlafzimmer Obergeschoss"), 1);
    });
  });

  describe("model.ts - logique de tri (compareTasks)", () => {
    const itemOffen414: TaskItem = {
      id: "1",
      roomId: "r1",
      roomNumber: "414",
      zone: null,
      title: "Zimmer 414",
      floor: 4,
      floorLabel: "4. OG",
      type: "bleiber",
      typeLabel: "Bleiber · Zwischenreinigung",
      status: "offen",
      statusLabel: "Offen",
    };

    const itemInArbeit412: TaskItem = {
      id: "2",
      roomId: "r2",
      roomNumber: "412",
      zone: null,
      title: "Zimmer 412",
      floor: 4,
      floorLabel: "4. OG",
      type: "abreise",
      typeLabel: "Abreise · Endreinigung",
      status: "in_arbeit",
      statusLabel: "In Arbeit",
    };

    const itemZone4: TaskItem = {
      id: "3",
      roomId: null,
      roomNumber: null,
      zone: "Bäder 4. OG",
      title: "Bäder 4. OG",
      floor: 4,
      floorLabel: "4. OG",
      type: "zone",
      typeLabel: "Zone",
      status: "offen",
      statusLabel: "Offen",
    };

    const itemErledigt410: TaskItem = {
      id: "4",
      roomId: "r4",
      roomNumber: "410",
      zone: null,
      title: "Zimmer 410",
      floor: 4,
      floorLabel: "4. OG",
      type: "abreise",
      typeLabel: "Abreise · Endreinigung",
      status: "erledigt",
      statusLabel: "Erledigt",
    };

    const itemFloor3: TaskItem = {
      id: "5",
      roomId: "r5",
      roomNumber: "305",
      zone: null,
      title: "Zimmer 305",
      floor: 3,
      floorLabel: "3. OG",
      type: "abreise",
      typeLabel: "Abreise · Endreinigung",
      status: "offen",
      statusLabel: "Offen",
    };

    it("place les tâches non terminées avant les tâches terminées (erledigt en bas)", () => {
      assert.ok(compareTasks(itemOffen414, itemErledigt410) < 0);
      assert.ok(compareTasks(itemErledigt410, itemInArbeit412) > 0);
    });

    it("trie par étage croissant lorsque le statut est identique", () => {
      assert.ok(compareTasks(itemFloor3, itemOffen414) < 0);
      assert.ok(compareTasks(itemOffen414, itemFloor3) > 0);
    });

    it("place les chambres avant les zones sans numéro de chambre", () => {
      assert.ok(compareTasks(itemOffen414, itemZone4) < 0);
      assert.ok(compareTasks(itemZone4, itemInArbeit412) > 0);
    });

    it("trie par numéro de chambre croissant", () => {
      assert.ok(compareTasks(itemInArbeit412, itemOffen414) < 0);
      assert.ok(compareTasks(itemOffen414, itemInArbeit412) > 0);
    });
  });

  describe("model.ts - groupement par étage et création TasksDay", () => {
    it("regroupe correctement par étage avec les tâches ordonnées", () => {
      const tasks: TaskItem[] = [
        {
          id: "t4-done",
          roomId: "r410",
          roomNumber: "410",
          zone: null,
          title: "Zimmer 410",
          floor: 4,
          floorLabel: "4. OG",
          type: "abreise",
          typeLabel: "Abreise · Endreinigung",
          status: "erledigt",
          statusLabel: "Erledigt",
        },
        {
          id: "t4-open",
          roomId: "r414",
          roomNumber: "414",
          zone: null,
          title: "Zimmer 414",
          floor: 4,
          floorLabel: "4. OG",
          type: "bleiber",
          typeLabel: "Bleiber · Zwischenreinigung",
          status: "offen",
          statusLabel: "Offen",
        },
        {
          id: "t3-open",
          roomId: "r301",
          roomNumber: "301",
          zone: null,
          title: "Zimmer 301",
          floor: 3,
          floorLabel: "3. OG",
          type: "abreise",
          typeLabel: "Abreise · Endreinigung",
          status: "offen",
          statusLabel: "Offen",
        },
      ];

      const groups = groupTasksByFloor(tasks);
      assert.equal(groups.length, 2);

      // Étage 3
      assert.equal(groups[0]?.floor, 3);
      assert.equal(groups[0]?.floorLabel, "3. OG");
      assert.equal(groups[0]?.tasks.length, 1);
      assert.equal(groups[0]?.tasks[0]?.roomNumber, "301");

      // Étage 4 : ouvert (414) avant terminé (410)
      assert.equal(groups[1]?.floor, 4);
      assert.equal(groups[1]?.floorLabel, "4. OG");
      assert.equal(groups[1]?.tasks.length, 2);
      assert.equal(groups[1]?.tasks[0]?.roomNumber, "414");
      assert.equal(groups[1]?.tasks[1]?.roomNumber, "410");
    });

    it("calcule la progression « erledigt / total » dans createTasksDay", () => {
      const tasks: TaskItem[] = [
        {
          id: "1",
          roomId: "r1",
          roomNumber: "101",
          zone: null,
          title: "Zimmer 101",
          floor: 1,
          floorLabel: "1. OG",
          type: "abreise",
          typeLabel: "Abreise · Endreinigung",
          status: "erledigt",
          statusLabel: "Erledigt",
        },
        {
          id: "2",
          roomId: "r2",
          roomNumber: "102",
          zone: null,
          title: "Zimmer 102",
          floor: 1,
          floorLabel: "1. OG",
          type: "bleiber",
          typeLabel: "Bleiber · Zwischenreinigung",
          status: "offen",
          statusLabel: "Offen",
        },
        {
          id: "3",
          roomId: "r3",
          roomNumber: "103",
          zone: null,
          title: "Zimmer 103",
          floor: 1,
          floorLabel: "1. OG",
          type: "abreise",
          typeLabel: "Abreise · Endreinigung",
          status: "erledigt",
          statusLabel: "Erledigt",
        },
      ];

      const day = createTasksDay("2026-09-30", tasks);
      assert.equal(day.total, 3);
      assert.equal(day.completed, 2);
      assert.equal(day.progressLabel, "2 von 3 erledigt");
      assert.equal(day.completedTasks.length, 2);
    });
  });

  describe("fixture fictive (tasksDayFixture)", () => {
    it("affiche la date et la progression exacte selon screens.md §6.2 (« 2 von 6 erledigt »)", () => {
      assert.equal(tasksDayFixture.date, "2026-09-30");
      assert.equal(tasksDayFixture.total, 6);
      assert.equal(tasksDayFixture.completed, 2);
      assert.equal(tasksDayFixture.progressLabel, "2 von 6 erledigt");
    });

    it("est groupée par étage et triée par étage", () => {
      assert.equal(tasksDayFixture.floors.length, 2);
      assert.equal(tasksDayFixture.floors[0]?.floor, 3);
      assert.equal(tasksDayFixture.floors[0]?.floorLabel, "3. OG");
      assert.equal(tasksDayFixture.floors[1]?.floor, 4);
      assert.equal(tasksDayFixture.floors[1]?.floorLabel, "4. OG");
    });

    it("trie l'étage 4 par chambre avec au moins une zone sans room_id", () => {
      const floor4 = tasksDayFixture.floors.find((f) => f.floor === 4);
      assert.ok(floor4, "Étage 4 présent");

      // Vérifie la présence d'une zone sans room_id
      const zoneTask = floor4.tasks.find((t) => t.roomId === null);
      assert.ok(zoneTask, "Zone sans room_id présente");
      assert.equal(zoneTask.zone, "Bäder 4. OG");
      assert.equal(zoneTask.type, "zone");
      assert.equal(zoneTask.typeLabel, "Zone");

      // Vérifie l'ordre au 4. OG :
      // 1. Zimmer 412 (in_arbeit)
      // 2. Zimmer 414 (offen)
      // 3. Bäder 4. OG (offen, zone)
      // 4. Zimmer 410 (erledigt)
      // 5. Zimmer 411 (erledigt)
      assert.equal(floor4.tasks[0]?.roomNumber, "412");
      assert.equal(floor4.tasks[0]?.status, "in_arbeit");

      assert.equal(floor4.tasks[1]?.roomNumber, "414");
      assert.equal(floor4.tasks[1]?.status, "offen");

      assert.equal(floor4.tasks[2]?.roomId, null);
      assert.equal(floor4.tasks[2]?.title, "Bäder 4. OG");

      assert.equal(floor4.tasks[3]?.roomNumber, "410");
      assert.equal(floor4.tasks[3]?.status, "erledigt");

      assert.equal(floor4.tasks[4]?.roomNumber, "411");
      assert.equal(floor4.tasks[4]?.status, "erledigt");
    });

    it("isole les 2 tâches terminées dans completedTasks", () => {
      assert.equal(tasksDayFixture.completedTasks.length, 2);
      assert.equal(tasksDayFixture.completedTasks[0]?.roomNumber, "410");
      assert.equal(tasksDayFixture.completedTasks[1]?.roomNumber, "411");
    });
  });

  describe("api.ts - fetchTasksDay", () => {
    it("lit les tâches Supabase et structure un TasksDay valide", async () => {
      const mockClient = {
        from: (table: string) => {
          assert.equal(table, "room_tasks");
          return {
            select: () => ({
              eq: async (col: string, val: string) => {
                assert.equal(col, "date");
                assert.equal(val, "2026-09-30");
                return {
                  data: [
                    {
                      id: "task-1",
                      date: "2026-09-30",
                      room_id: "r-101",
                      task_type: "abreise",
                      zone: null,
                      status: "offen",
                      done_at: null,
                      note: null,
                      rooms: {
                        id: "r-101",
                        number: "101",
                        floor: 1,
                        beds: 2,
                        has_bath: true,
                      },
                    },
                    {
                      id: "task-2",
                      date: "2026-09-30",
                      room_id: null,
                      task_type: "bleiber",
                      zone: "Bäder 1. OG",
                      status: "erledigt",
                      done_at: "2026-09-30T10:00:00Z",
                      note: null,
                      rooms: null,
                    },
                  ],
                  error: null,
                };
              },
            }),
          };
        },
      };

      const result = await fetchTasksDay("2026-09-30", mockClient as never);
      assert.equal(result.date, "2026-09-30");
      assert.equal(result.total, 2);
      assert.equal(result.completed, 1);
      assert.equal(result.progressLabel, "1 von 2 erledigt");
      assert.equal(result.floors.length, 1);
      assert.equal(result.floors[0]?.floor, 1);
      assert.equal(result.floors[0]?.tasks.length, 2);
      assert.equal(result.floors[0]?.tasks[0]?.roomNumber, "101");
      assert.equal(result.floors[0]?.tasks[1]?.zone, "Bäder 1. OG");
    });

    it("lève une erreur allemande explicite en cas d'échec", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: async () => ({
              data: null,
              error: new Error("PGRST500 Database error"),
            }),
          }),
        }),
      };

      await assert.rejects(
        () => fetchTasksDay("2026-09-30", mockClient as never),
        (err: Error) => {
          assert.equal(err.message, TASKS_ERROR_MESSAGES.fetchFailed);
          return true;
        },
      );
    });

    it("mappe les erreurs réseau", () => {
      const err = mapTasksError(new Error("Failed to fetch"));
      assert.equal(err.message, TASKS_ERROR_MESSAGES.networkError);
    });
  });

  describe("hooks.ts - useTasksDay", () => {
    it("renvoie ViewState<TasksDay> avec statut success pour la date de la fixture", () => {
      const state = useTasksDay("2026-09-30");
      assert.equal(state.status, "success");
      if (state.status === "success") {
        assert.equal(state.data.date, "2026-09-30");
        assert.equal(state.data.total, 6);
        assert.equal(state.data.completed, 2);
        assert.equal(state.data.progressLabel, "2 von 6 erledigt");
      }
    });

    it("renvoie ViewState<TasksDay> avec statut empty et message pour une autre date", () => {
      const state = useTasksDay("2026-10-01");
      assert.equal(state.status, "empty");
      if (state.status === "empty") {
        assert.equal(state.message, "Heute hast du keine Aufgaben.");
      }
    });
  });
});
