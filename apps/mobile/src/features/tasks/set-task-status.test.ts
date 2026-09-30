import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { RPC_ERROR_MESSAGES } from "@heute/domain/src/errors/index.ts";
import { TASKS_ERROR_MESSAGES, updateTaskStatus, type TasksSupabaseClient } from "./api.ts";
import {
  createSetTaskStatusRunner,
  onErrorTaskStatus,
  onMutateTaskStatus,
  tasksDayQueryKey,
  useSetTaskStatus,
  useTasksDay,
} from "./hooks.ts";
import {
  ALLOWED_TASK_TRANSITIONS,
  getNextTaskStatus,
  isAllowedTaskTransition,
  tasksDayFixture,
  type TasksDay,
} from "./model.ts";

/**
 * Harness minimal de type renderHook pour tester les hooks React (useMutation, useQuery)
 * dans l'environnement de test Node sans DOM.
 */
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);
const reactInternalsList: Array<{ H: unknown }> = [];

try {
  const queryPackagePath = nodeRequire.resolve("@tanstack/react-query");
  const queryRequire = createRequire(queryPackagePath);
  const mod = queryRequire("react") as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H: unknown };
  };
  const inter = mod?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (inter && !reactInternalsList.includes(inter)) {
    reactInternalsList.push(inter);
  }
} catch {
  // ignore
}

for (const p of ["react", "../../../../../node_modules/react", "../../../../node_modules/react"]) {
  try {
    const mod = nodeRequire(p) as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H: unknown };
    };
    const inter = mod?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    if (inter && !reactInternalsList.includes(inter)) {
      reactInternalsList.push(inter);
    }
  } catch {
    // ignore
  }
}

function renderHook<T>(hookFn: () => T, queryClient?: QueryClient): { result: { current: T } } {
  const result = { current: undefined as unknown as T };
  const stateMap = new Map<number, unknown>();
  const listeners = new Set<() => void>();
  let hookIndex = 0;

  function run() {
    hookIndex = 0;
    const prevDispatchers = reactInternalsList.map((inter) => inter.H);

    const dispatcher = {
      useState: (initial: unknown) => {
        const idx = hookIndex++;
        if (!stateMap.has(idx)) {
          stateMap.set(idx, typeof initial === "function" ? (initial as () => unknown)() : initial);
        }
        const setState = (val: unknown) => {
          const next =
            typeof val === "function"
              ? (val as (prev: unknown) => unknown)(stateMap.get(idx))
              : val;
          stateMap.set(idx, next);
          for (const listener of listeners) {
            listener();
          }
        };
        return [stateMap.get(idx), setState];
      },
      useEffect: (effect: () => unknown) => {
        effect();
      },
      useLayoutEffect: (effect: () => unknown) => {
        effect();
      },
      useCallback: <F>(fn: F) => fn,
      useMemo: <F>(fn: () => F) => fn(),
      useRef: (initial: unknown) => {
        const idx = hookIndex++;
        if (!stateMap.has(idx)) {
          stateMap.set(idx, { current: initial });
        }
        return stateMap.get(idx);
      },
      useContext: (ctx: unknown) => {
        const val = (ctx as { _currentValue?: unknown })?._currentValue;
        if (val !== undefined) return val;
        return queryClient;
      },
      useSyncExternalStore: (
        subscribe: (onStoreChange: () => void) => () => void,
        getSnapshot: () => unknown,
      ) => {
        const idx = hookIndex++;
        if (!stateMap.has(idx)) {
          stateMap.set(idx, true);
          subscribe(() => {
            run();
          });
        }
        return getSnapshot();
      },
    };

    for (const inter of reactInternalsList) {
      inter.H = dispatcher;
    }

    try {
      result.current = hookFn();
    } finally {
      reactInternalsList.forEach((inter, i) => {
        inter.H = prevDispatchers[i];
      });
    }
  }

  listeners.add(run);
  run();
  return { result };
}

describe("features/tasks - changer le statut d'une tâche (P4-02 [L])", () => {
  describe("model.ts - transitions autorisées vers l'avant", () => {
    it("autorise uniquement les transitions vers l'avant (offen -> in_arbeit -> erledigt)", () => {
      // Transitions valides
      assert.equal(isAllowedTaskTransition("offen", "in_arbeit"), true);
      assert.equal(isAllowedTaskTransition("in_arbeit", "erledigt"), true);

      // Transitions interdites vers l'arrière
      assert.equal(isAllowedTaskTransition("in_arbeit", "offen"), false);
      assert.equal(isAllowedTaskTransition("erledigt", "in_arbeit"), false);
      assert.equal(isAllowedTaskTransition("erledigt", "offen"), false);

      // Transition sautée (offen direct vers erledigt) interdite selon la matrice vers l'avant
      assert.equal(isAllowedTaskTransition("offen", "erledigt"), false);

      // Identité (aucun changement) interdite
      assert.equal(isAllowedTaskTransition("offen", "offen"), false);
      assert.equal(isAllowedTaskTransition("in_arbeit", "in_arbeit"), false);
      assert.equal(isAllowedTaskTransition("erledigt", "erledigt"), false);
    });

    it("calcule le statut suivant valide vers l'avant via getNextTaskStatus", () => {
      assert.equal(getNextTaskStatus("offen"), "in_arbeit");
      assert.equal(getNextTaskStatus("in_arbeit"), "erledigt");
      assert.equal(getNextTaskStatus("erledigt"), null);
    });

    it("matrice ALLOWED_TASK_TRANSITIONS conforme aux spécifications", () => {
      assert.deepEqual(ALLOWED_TASK_TRANSITIONS.offen, ["in_arbeit"]);
      assert.deepEqual(ALLOWED_TASK_TRANSITIONS.in_arbeit, ["erledigt"]);
      assert.deepEqual(ALLOWED_TASK_TRANSITIONS.erledigt, []);
    });
  });

  describe("api.ts - updateTaskStatus et gestion des erreurs RPC", () => {
    it("appelle la RPC set_task_status avec les paramètres p_id et p_status", async () => {
      let calledRpc = "";
      let calledParams: Record<string, unknown> | null = null;

      const mockClient = {
        rpc: async (fn: string, params: Record<string, unknown>) => {
          calledRpc = fn;
          calledParams = params;
          return { error: null };
        },
      } as unknown as TasksSupabaseClient;

      await updateTaskStatus("task-412", "erledigt", mockClient);

      assert.equal(calledRpc, "set_task_status");
      assert.deepEqual(calledParams, {
        p_id: "task-412",
        p_status: "erledigt",
      });
    });

    it("traduit l'erreur RPC HT002 en allemand via packages/domain", async () => {
      const mockClient = {
        rpc: async () => ({
          error: { code: "HT002", message: "forbidden" },
        }),
      } as unknown as TasksSupabaseClient;

      await assert.rejects(
        () => updateTaskStatus("task-412", "erledigt", mockClient),
        (err: Error) => {
          assert.equal(err.message, RPC_ERROR_MESSAGES.HT002);
          assert.equal(err.message, "Dazu fehlt dir die Berechtigung.");
          return true;
        },
      );
    });

    it("traduit une erreur réseau / hors ligne lors de la sauvegarde en message allemand", async () => {
      const mockClient = {
        rpc: async () => {
          throw new Error("Network request failed: failed to fetch");
        },
      } as unknown as TasksSupabaseClient;

      await assert.rejects(
        () => updateTaskStatus("task-412", "erledigt", mockClient),
        (err: Error) => {
          assert.equal(err.message, TASKS_ERROR_MESSAGES.saveFailed);
          return true;
        },
      );
    });
  });

  describe("hooks.ts - createSetTaskStatusRunner (optimistic update & rollback hors-React)", () => {
    function setupTestEnvironment() {
      const qc = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Clone de la fixture pour isoler les tests
      const initialDay: TasksDay = JSON.parse(JSON.stringify(tasksDayFixture));
      qc.setQueryData(tasksDayQueryKey(initialDay.date), initialDay);

      return { qc, initialDay };
    }

    it("succès : applique la mise à jour optimiste, appelle la RPC et met à jour le cache", async () => {
      const { qc, initialDay } = setupTestEnvironment();
      let rpcCalled = false;
      let onSuccessCalled = false;

      const mockClient = {
        rpc: async (fn: string, params: Record<string, unknown>) => {
          assert.equal(fn, "set_task_status");
          assert.equal(params.p_id, "task-412");
          assert.equal(params.p_status, "erledigt");
          rpcCalled = true;
          return { error: null };
        },
      } as unknown as TasksSupabaseClient;

      const mutator = createSetTaskStatusRunner({
        client: mockClient,
        queryClient: qc,
        defaultDate: initialDay.date,
        onSuccess: () => {
          onSuccessCalled = true;
        },
      });

      assert.equal(mutator.isPending, false);
      assert.equal(mutator.error, null);

      // Zimmer 412 est initialement in_arbeit
      const taskBefore = initialDay.allTasks.find((t) => t.id === "task-412");
      assert.equal(taskBefore?.status, "in_arbeit");
      assert.equal(initialDay.completed, 2);

      // Exécution de la mutation vers erledigt
      await mutator.setTaskStatus("task-412", "erledigt", initialDay.date);

      assert.equal(rpcCalled, true);
      assert.equal(onSuccessCalled, true);
      assert.equal(mutator.isPending, false);
      assert.equal(mutator.error, null);

      // Vérification du cache optimiste
      const cached = qc.getQueryData<TasksDay>(tasksDayQueryKey(initialDay.date));
      assert.ok(cached);
      const updatedTask = cached.allTasks.find((t) => t.id === "task-412");
      assert.equal(updatedTask?.status, "erledigt");
      assert.equal(updatedTask?.statusLabel, "Erledigt");
      assert.ok(updatedTask?.doneAt != null);

      // Progression recalculée automatiquement
      assert.equal(cached.completed, 3);
      assert.equal(cached.progressLabel, "3 von 6 erledigt");

      // La tâche fait désormais partie des completedTasks
      assert.ok(cached.completedTasks.some((t) => t.id === "task-412"));
    });

    it("refus serveur : effectue un retour arrière (rollback) et expose l'erreur allemande", async () => {
      const { qc, initialDay } = setupTestEnvironment();
      const tracker = {
        onErrorCalled: false,
        caughtError: null as Error | null,
      };

      const mockClient = {
        rpc: async () => ({
          error: { code: "HT002", message: "forbidden" },
        }),
      } as unknown as TasksSupabaseClient;

      const mutator = createSetTaskStatusRunner({
        client: mockClient,
        queryClient: qc,
        defaultDate: initialDay.date,
        onError: (err) => {
          tracker.onErrorCalled = true;
          tracker.caughtError = err;
        },
      });

      // Tentative de passer Zimmer 414 de offen à in_arbeit
      await assert.rejects(
        () => mutator.setTaskStatus("task-414", "in_arbeit", initialDay.date),
        (err: Error) => {
          assert.equal(err.message, "Dazu fehlt dir die Berechtigung.");
          return true;
        },
      );

      assert.equal(tracker.onErrorCalled, true);
      assert.equal(tracker.caughtError?.message, "Dazu fehlt dir die Berechtigung.");
      assert.equal(mutator.isPending, false);
      assert.equal(mutator.error?.message, "Dazu fehlt dir die Berechtigung.");

      // Vérification du retour arrière (rollback) dans le cache
      const cached = qc.getQueryData<TasksDay>(tasksDayQueryKey(initialDay.date));
      assert.ok(cached);
      const rolledBackTask = cached.allTasks.find((t) => t.id === "task-414");
      assert.equal(rolledBackTask?.status, "offen");
      assert.equal(cached.completed, 2);
      assert.equal(cached.progressLabel, "2 von 6 erledigt");

      // Test de reset()
      mutator.reset();
      assert.equal(mutator.error, null);
    });

    it("transition interdite : refuse localement avant appel serveur et sans modifier le cache", async () => {
      const { qc, initialDay } = setupTestEnvironment();
      let rpcCalled = false;

      const mockClient = {
        rpc: async () => {
          rpcCalled = true;
          return { error: null };
        },
      } as unknown as TasksSupabaseClient;

      const mutator = createSetTaskStatusRunner({
        client: mockClient,
        queryClient: qc,
        defaultDate: initialDay.date,
      });

      // Zimmer 410 est déjà erledigt -> tentative interdite vers in_arbeit
      await assert.rejects(
        () => mutator.setTaskStatus("task-410", "in_arbeit", initialDay.date),
        (err: Error) => {
          assert.equal(err.message, TASKS_ERROR_MESSAGES.invalidTransition);
          assert.equal(err.message, "Diese Statusänderung ist nicht erlaubt.");
          return true;
        },
      );

      // Zimmer 414 est offen -> tentative directe vers erledigt (saut d'étape interdit)
      await assert.rejects(
        () => mutator.setTaskStatus("task-414", "erledigt", initialDay.date),
        (err: Error) => {
          assert.equal(err.message, TASKS_ERROR_MESSAGES.invalidTransition);
          return true;
        },
      );

      // Aucun appel serveur ne doit être émis pour une transition illégale
      assert.equal(rpcCalled, false);

      // Le cache reste strictement inchangé
      const cached = qc.getQueryData<TasksDay>(tasksDayQueryKey(initialDay.date));
      const task410 = cached?.allTasks.find((t) => t.id === "task-410");
      const task414 = cached?.allTasks.find((t) => t.id === "task-414");
      assert.equal(task410?.status, "erledigt");
      assert.equal(task414?.status, "offen");
    });

    it("hors ligne : rollback et message d'erreur de sauvegarde", async () => {
      const { qc, initialDay } = setupTestEnvironment();

      const mockClient = {
        rpc: async () => {
          throw new Error("Failed to fetch");
        },
      } as unknown as TasksSupabaseClient;

      const mutator = createSetTaskStatusRunner({
        client: mockClient,
        queryClient: qc,
        defaultDate: initialDay.date,
      });

      // Tentative de passer Zimmer 414 de offen à in_arbeit alors que l'appareil est hors ligne
      await assert.rejects(
        () => mutator.setTaskStatus("task-414", "in_arbeit", initialDay.date),
        (err: Error) => {
          assert.equal(err.message, TASKS_ERROR_MESSAGES.saveFailed);
          return true;
        },
      );

      assert.equal(mutator.isPending, false);
      assert.equal(mutator.error?.message, TASKS_ERROR_MESSAGES.saveFailed);

      // Vérification que le rollback a bien eu lieu malgré l'erreur réseau
      const cached = qc.getQueryData<TasksDay>(tasksDayQueryKey(initialDay.date));
      const task414 = cached?.allTasks.find((t) => t.id === "task-414");
      assert.equal(task414?.status, "offen");
    });

    it("mutate() : gère l'exécution fire-and-forget sans unhandled rejection", async () => {
      const { qc, initialDay } = setupTestEnvironment();
      let errorReceived: Error | null = null;

      const mockClient = {
        rpc: async () => ({
          error: { code: "HT002", message: "forbidden" },
        }),
      } as unknown as TasksSupabaseClient;

      const mutator = createSetTaskStatusRunner({
        client: mockClient,
        queryClient: qc,
        defaultDate: initialDay.date,
        onError: (err) => {
          errorReceived = err;
        },
      });

      mutator.mutate({
        taskId: "task-414",
        nextStatus: "in_arbeit",
        date: initialDay.date,
      });

      // Attendre la résolution asynchrone
      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.ok(errorReceived);
      assert.equal(mutator.error?.message, "Dazu fehlt dir die Berechtigung.");
    });
  });

  describe("hooks.ts - useSetTaskStatus dans un composant React (useMutation via renderHook)", () => {
    it("exécute onMutate puis mutationFn sans bloquer sur currentStatus === nextStatus", async () => {
      const qc = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      const initialDay: TasksDay = JSON.parse(JSON.stringify(tasksDayFixture));
      qc.setQueryData(tasksDayQueryKey(initialDay.date), initialDay);

      let rpcCalledWith: { id: string; status: string } | null = null;
      const mockClient = {
        rpc: async (fn: string, params: Record<string, unknown>) => {
          if (fn === "set_task_status") {
            rpcCalledWith = { id: params.p_id as string, status: params.p_status as string };
          }
          return { error: null };
        },
      } as unknown as TasksSupabaseClient;

      const { result } = renderHook(
        () =>
          useSetTaskStatus({
            client: mockClient,
            queryClient: qc,
            defaultDate: initialDay.date,
          }),
        qc,
      );

      // Zimmer 412 est initialement in_arbeit.
      // Sans passer currentStatus, useMutation exécute onMutate (qui écrit "erledigt" dans le cache),
      // puis mutationFn doit appeler updateTaskStatus directement sans rejeter invalidTransition.
      await result.current.setTaskStatus("task-412", "erledigt", initialDay.date);

      assert.deepEqual(rpcCalledWith, { id: "task-412", status: "erledigt" });
      const cached = qc.getQueryData<TasksDay>(tasksDayQueryKey(initialDay.date));
      assert.equal(cached?.allTasks.find((t) => t.id === "task-412")?.status, "erledigt");
      assert.equal(cached?.completed, 3);
    });

    it("gère l'échec serveur et effectue le rollback via useMutation", async () => {
      const qc = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      const initialDay: TasksDay = JSON.parse(JSON.stringify(tasksDayFixture));
      qc.setQueryData(tasksDayQueryKey(initialDay.date), initialDay);

      const mockClient = {
        rpc: async () => ({
          error: { code: "HT002", message: "forbidden" },
        }),
      } as unknown as TasksSupabaseClient;

      const { result } = renderHook(
        () =>
          useSetTaskStatus({
            client: mockClient,
            queryClient: qc,
            defaultDate: initialDay.date,
          }),
        qc,
      );

      await assert.rejects(
        () => result.current.setTaskStatus("task-414", "in_arbeit", initialDay.date),
        (err: Error) => {
          assert.equal(err.message, "Dazu fehlt dir die Berechtigung.");
          return true;
        },
      );

      const cached = qc.getQueryData<TasksDay>(tasksDayQueryKey(initialDay.date));
      assert.equal(cached?.allTasks.find((t) => t.id === "task-414")?.status, "offen");
    });

    it("useTasksDay souscrit à useQuery et reflète immédiatement la mise à jour optimiste", async () => {
      const qc = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      const initialDay: TasksDay = JSON.parse(JSON.stringify(tasksDayFixture));
      qc.setQueryData(tasksDayQueryKey(initialDay.date), initialDay);

      const mockClient = {
        rpc: async () => ({ error: null }),
      } as unknown as TasksSupabaseClient;

      const { result: tasksResult } = renderHook(
        () => useTasksDay(initialDay.date, { queryClient: qc }),
        qc,
      );
      const { result: mutatorResult } = renderHook(
        () =>
          useSetTaskStatus({
            client: mockClient,
            queryClient: qc,
            defaultDate: initialDay.date,
          }),
        qc,
      );

      assert.equal(tasksResult.current.status, "success");
      if (tasksResult.current.status === "success") {
        assert.equal(tasksResult.current.data.completed, 2);
      }

      await mutatorResult.current.setTaskStatus("task-412", "erledigt", initialDay.date);
      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.equal(tasksResult.current.status, "success");
      if (tasksResult.current.status === "success") {
        assert.equal(tasksResult.current.data.completed, 3);
        assert.equal(
          tasksResult.current.data.allTasks.find((t) => t.id === "task-412")?.status,
          "erledigt",
        );
      }
    });
  });

  describe("hooks.ts - fonctions pures onMutateTaskStatus et onErrorTaskStatus", () => {
    it("onMutateTaskStatus : applique la mise à jour optimiste et renvoie le contexte", async () => {
      const qc = new QueryClient();
      const initialDay: TasksDay = JSON.parse(JSON.stringify(tasksDayFixture));
      qc.setQueryData(tasksDayQueryKey(initialDay.date), initialDay);

      const context = await onMutateTaskStatus(qc, {
        taskId: "task-412",
        nextStatus: "erledigt",
        date: initialDay.date,
      });

      assert.ok(context.previousDay);
      assert.equal(context.queryKey[2], initialDay.date);

      const updated = qc.getQueryData<TasksDay>(context.queryKey);
      const task = updated?.allTasks.find((t) => t.id === "task-412");
      assert.equal(task?.status, "erledigt");
      assert.equal(task?.statusLabel, "Erledigt");
      assert.ok(task?.doneAt != null);
      assert.equal(updated?.completed, 3);
    });

    it("onMutateTaskStatus : lève une erreur pour une transition invalide sans modifier le cache", async () => {
      const qc = new QueryClient();
      const initialDay: TasksDay = JSON.parse(JSON.stringify(tasksDayFixture));
      qc.setQueryData(tasksDayQueryKey(initialDay.date), initialDay);

      await assert.rejects(
        () =>
          onMutateTaskStatus(qc, {
            taskId: "task-410", // déjà erledigt
            nextStatus: "in_arbeit",
            date: initialDay.date,
          }),
        (err: Error) => {
          assert.equal(err.message, TASKS_ERROR_MESSAGES.invalidTransition);
          return true;
        },
      );

      const cached = qc.getQueryData<TasksDay>(tasksDayQueryKey(initialDay.date));
      const task = cached?.allTasks.find((t) => t.id === "task-410");
      assert.equal(task?.status, "erledigt");
    });

    it("onErrorTaskStatus : restaure l'état précédent (rollback) et notifie onError", () => {
      const qc = new QueryClient();
      const initialDay: TasksDay = JSON.parse(JSON.stringify(tasksDayFixture));
      const queryKey = tasksDayQueryKey(initialDay.date);

      // Cache temporairement modifié
      const modifiedDay = { ...initialDay, completed: 5 };
      qc.setQueryData(queryKey, modifiedDay);

      let onErrorNotified = false;
      const testError = new Error("Erreur serveur test");

      onErrorTaskStatus(
        qc,
        testError,
        { taskId: "task-412", nextStatus: "erledigt" },
        { previousDay: initialDay, queryKey },
        {
          onError: (err) => {
            assert.equal(err, testError);
            onErrorNotified = true;
          },
        },
      );

      assert.equal(onErrorNotified, true);
      const restored = qc.getQueryData<TasksDay>(queryKey);
      assert.deepEqual(restored, initialDay);
    });
  });
});
