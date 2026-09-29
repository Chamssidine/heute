export type ShiftType = "normal" | "td" | "sem" | "urlaub" | "krank" | "frei";

// Same field names as the `shifts` table, but independent of database.types.ts.
export interface ShiftInput {
  type: ShiftType;
  date?: string;
  start1?: number | null;
  end1?: number | null;
  start2?: number | null;
  end2?: number | null;
  break_min?: number | null;
  isSunday?: boolean;
}

export interface MonthBalance {
  istMinutes: number;
  sollMinutes: number;
  diffMinutes: number;
}
