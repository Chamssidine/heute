import type { ViewState } from "../../lib/query/index.ts";
import { useAuth } from "../auth/hooks.ts";
import type { AppRole, Department } from "../auth/model.ts";
import { useKitchenDay } from "../kitchen/hooks.ts";
import type { KitchenDay } from "../kitchen/model.ts";
import { useMyShifts } from "../shifts/hooks.ts";
import type { ShiftDay } from "../shifts/model.ts";
import { useTasksDay } from "../tasks/hooks.ts";
import type { TasksDay } from "../tasks/model.ts";
import {
  createTodayView,
  getTodayCardOrder,
  todayShiftFixture,
  type TodayView,
  type UserRoleOrDepartment,
} from "./model.ts";

export interface UseTodayOptions {
  role?: AppRole | string;
  department?: Department | string;
  shift?: ShiftDay | null;
  tasks?: TasksDay | null;
  kitchen?: KitchenDay | null;
}

/**
 * Hook pour l'écran d'accueil « Heute » (contrat L -> U).
 * Renvoie un ViewState<TodayView> en composant les hooks existants
 * (useKitchenDay, useTasksDay, useMyShifts, useAuth), sans endpoint dédié (PLAN §4.3).
 *
 * Procédure de mesure du chargement en 4G sur Android (Critère d'acceptation) :
 * 1. Configuration du throttling réseau 4G :
 *    - Émulateur Android : Network Speed = LTE ou Good 4G (ou Chrome inspect chrome://inspect avec profil "Fast 4G" 4 Mbps down / 3 Mbps up / 20ms RTT).
 * 2. Point de départ du chrono (T0) :
 *    - Déclenchement de la navigation vers l'écran « Heute » / montage initial appelant `useToday()`.
 * 3. Point d'arrivée du chrono (T1) :
 *    - Réception de l'état `status === "success"` (toutes les cartes ont leurs données composées et affichables, masquage des skeletons).
 * 4. Métrique cible :
 *    - T1 - T0 < 1,5 s en connexion 4G grâce à la composition parallèle et à l'absence d'aller-retours cascade.
 */
export function useToday(date: string, options?: UseTodayOptions): ViewState<TodayView> {
  const auth = useAuth();
  const kitchenState = useKitchenDay(date);
  const tasksState = useTasksDay(date);
  const month = date.slice(0, 7);
  const shiftsState = useMyShifts(month);

  // 1. Détermination du rôle ou département de l'utilisateur
  const effectiveRoleOrDept: UserRoleOrDepartment = {
    role: options?.role ?? auth.user?.role,
    department: options?.department ?? auth.user?.department,
  };
  const cardOrder = getTodayCardOrder(effectiveRoleOrDept);
  const requiresTasks = cardOrder.includes("my_tasks");

  // 2. Propagation des états de chargement provenant des sources dépendantes
  if (options?.kitchen === undefined && kitchenState.status === "loading") {
    return {
      status: "loading",
      updatedAt: kitchenState.updatedAt,
    };
  }

  if (requiresTasks && options?.tasks === undefined && tasksState.status === "loading") {
    return {
      status: "loading",
      updatedAt: tasksState.updatedAt,
    };
  }

  if (options?.shift === undefined && shiftsState.status === "loading") {
    return {
      status: "loading",
      updatedAt: shiftsState.updatedAt,
    };
  }

  // 3. Propagation des états d'erreur provenant des sources dépendantes
  if (options?.kitchen === undefined && kitchenState.status === "error") {
    return {
      status: "error",
      message: kitchenState.message,
      onRetry: kitchenState.onRetry,
      updatedAt: kitchenState.updatedAt,
    };
  }

  if (requiresTasks && options?.tasks === undefined && tasksState.status === "error") {
    return {
      status: "error",
      message: tasksState.message,
      onRetry: tasksState.onRetry,
      updatedAt: tasksState.updatedAt,
    };
  }

  if (options?.shift === undefined && shiftsState.status === "error") {
    return {
      status: "error",
      message: shiftsState.message,
      onRetry: shiftsState.onRetry,
      updatedAt: shiftsState.updatedAt,
    };
  }

  // 4. Extraction et composition des données
  let shift: ShiftDay | null = options?.shift ?? null;
  if (!shift) {
    if (shiftsState.status === "success" && shiftsState.data) {
      shift = shiftsState.data.days.find((d) => d.date === date) ?? null;
    }
    if (!shift && date === todayShiftFixture.date) {
      shift = todayShiftFixture;
    }
  }

  const tasks: TasksDay | null =
    options?.tasks !== undefined
      ? options.tasks
      : tasksState.status === "success"
        ? tasksState.data
        : null;

  const kitchen: KitchenDay | null =
    options?.kitchen !== undefined
      ? options.kitchen
      : kitchenState.status === "success"
        ? kitchenState.data
        : null;

  // 5. Cas où aucune donnée n'est disponible pour la date demandée
  if (!shift && !tasks && !kitchen) {
    return {
      status: "empty",
    };
  }

  // 6. Fraîcheur des données provenant des sources (sans repli arbitraire en dur)
  const updatedAt =
    kitchenState.updatedAt ?? kitchen?.updatedAt ?? tasksState.updatedAt ?? shiftsState.updatedAt;

  // 7. Composition du TodayView via createTodayView
  const todayView = createTodayView({
    date,
    shift,
    tasks,
    kitchen,
    roleOrDepartment: effectiveRoleOrDept,
    updatedAt,
  });

  return {
    status: "success",
    data: todayView,
    updatedAt: todayView.lastUpdatedAt,
  };
}
