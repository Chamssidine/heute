import type { Database } from "@heute/domain";
import { de } from "../strings/de.ts";
import type { TaskType } from "./housekeeping.ts";

export type RoomTaskForm = {
  target: "room" | "zone";
  roomId: string | null;
  zone: string;
  taskType: TaskType;
  assignedTo: string | null;
  note: string;
  reason: string;
};

export const EMPTY_ROOM_TASK_FORM: RoomTaskForm = {
  target: "room",
  roomId: null,
  zone: "",
  taskType: "abreise",
  assignedTo: null,
  note: "",
  reason: "",
};

export type SaveRoomTaskArgs = Database["public"]["Functions"]["save_room_task"]["Args"];

// Les RPC générées typent les arguments optionnels en `string` alors que SQL accepte NULL.
export const NULL_ARG = null as unknown as string;

export type BuildResult = { ok: true; args: SaveRoomTaskArgs } | { ok: false; error: string };

export function buildRoomTaskArgs(form: RoomTaskForm, date: string): BuildResult {
  const d = de.housekeeping.dialog;
  const zone = form.zone.trim();
  if (form.target === "room" && form.roomId === null) {
    return { ok: false, error: d.roomRequired };
  }
  if (form.target === "zone" && zone === "") {
    return { ok: false, error: d.zoneRequired };
  }
  if (form.reason.trim() === "") {
    return { ok: false, error: d.reasonRequired };
  }
  return {
    ok: true,
    args: {
      p_id: NULL_ARG,
      p_date: date,
      p_room_id: form.target === "room" && form.roomId !== null ? form.roomId : NULL_ARG,
      p_task_type: form.taskType,
      p_zone: form.target === "zone" ? zone : NULL_ARG,
      p_assigned_to: form.assignedTo ?? NULL_ARG,
      p_note: form.note.trim() === "" ? NULL_ARG : form.note.trim(),
      p_reason: form.reason.trim(),
    },
  };
}

export type RoomForm = { number: string; floor: string; beds: string; hasBath: boolean };

export const EMPTY_ROOM_FORM: RoomForm = { number: "", floor: "", beds: "", hasBath: false };

export type RoomResult =
  | { ok: true; value: { number: string; floor: number; beds: number; has_bath: boolean } }
  | { ok: false; error: string };

export function buildRoomInsert(form: RoomForm): RoomResult {
  const d = de.housekeeping.roomDialog;
  const number = form.number.trim();
  if (number === "") {
    return { ok: false, error: d.numberRequired };
  }
  const floor = Number(form.floor);
  if (form.floor.trim() === "" || !Number.isInteger(floor) || floor < -1 || floor > 20) {
    return { ok: false, error: d.floorInvalid };
  }
  const beds = Number(form.beds);
  if (form.beds.trim() === "" || !Number.isInteger(beds) || beds < 1 || beds > 50) {
    return { ok: false, error: d.bedsInvalid };
  }
  return { ok: true, value: { number, floor, beds, has_bath: form.hasBath } };
}

// SQLSTATE HT001/HT002/HT006/HT007/HT008 : packages/domain/src/errors (non exporté par l'index).
export function roomTaskErrorMessage(error: { code?: string } | null): string {
  switch (error?.code) {
    case "HT001":
      return de.housekeeping.dialog.reasonRequired;
    case "HT002":
      return de.housekeeping.forbidden;
    case "HT006":
      return de.housekeeping.dialog.invalidTask;
    case "HT007":
      return de.housekeeping.dialog.invalidAssignee;
    case "HT008":
      return de.housekeeping.dialog.taskDone;
    default:
      return de.housekeeping.dialog.saveError;
  }
}

export function roomInsertErrorMessage(error: { code?: string } | null): string {
  // 23505 = numéro déjà utilisé (contrainte unique).
  return error?.code === "23505"
    ? de.housekeeping.roomDialog.duplicate
    : de.housekeeping.roomDialog.saveError;
}
