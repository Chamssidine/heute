import type { Database } from "@heute/domain";
import { rpcErrorMessage } from "@heute/domain/src/errors/index.ts";
import { de } from "../strings/de.ts";

type ShiftType = Database["public"]["Enums"]["shift_type"];

export const SHIFT_TYPES: readonly ShiftType[] = ["normal", "td", "sem", "urlaub", "krank", "frei"];

export type ShiftForm = {
  type: ShiftType;
  start1: string;
  end1: string;
  start2: string;
  end2: string;
  breakMin: string;
  note: string;
  reason: string;
};

export type SaveShiftArgs = Database["public"]["Functions"]["save_shift"]["Args"];

export type FormResult =
  | { ok: true; args: Omit<SaveShiftArgs, "p_employee_id" | "p_date"> }
  | { ok: false; error: string };

export const EMPTY_FORM: ShiftForm = {
  type: "normal",
  start1: "",
  end1: "",
  start2: "",
  end2: "",
  breakMin: "30",
  note: "",
  reason: "",
};

export function parseTime(value: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function hasHours(type: ShiftType): boolean {
  return type === "normal" || type === "td";
}

// La RPC générée type les plages optionnelles en `number` alors que la colonne accepte NULL.
const NULL_MINUTES = null as unknown as number;

export function buildShiftArgs(form: ShiftForm): FormResult {
  if (form.reason.trim() === "") {
    return { ok: false, error: de.shiftDialog.reasonRequired };
  }
  let start1 = NULL_MINUTES;
  let end1 = NULL_MINUTES;
  let start2 = NULL_MINUTES;
  let end2 = NULL_MINUTES;
  if (hasHours(form.type)) {
    const a = parseTime(form.start1);
    const b = parseTime(form.end1);
    if (a === null || b === null || b <= a) {
      return { ok: false, error: de.shiftDialog.invalidRange };
    }
    start1 = a;
    end1 = b;
    if (form.type === "td") {
      const c = parseTime(form.start2);
      const d = parseTime(form.end2);
      if (c === null || d === null || d <= c || c < b) {
        return { ok: false, error: de.shiftDialog.invalidSecondRange };
      }
      start2 = c;
      end2 = d;
    }
  }
  const breakMin = Number(form.breakMin);
  if (!Number.isInteger(breakMin) || breakMin < 0 || breakMin > 240) {
    return { ok: false, error: de.shiftDialog.invalidBreak };
  }
  return {
    ok: true,
    args: {
      p_type: form.type,
      p_start1: start1,
      p_end1: end1,
      p_start2: start2,
      p_end2: end2,
      p_break_min: breakMin,
      p_note: form.note.trim(),
      p_reason: form.reason.trim(),
    },
  };
}

export function serverErrorMessage(error: { code?: string } | null): string {
  return rpcErrorMessage(error?.code);
}
