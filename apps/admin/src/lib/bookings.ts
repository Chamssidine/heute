import { de } from "../strings/de.ts";

export const MATCHCODE_MAX = 40;
export const LABEL_MAX = 120;
export const BOOKING_NOTE_MAX = 500;

export type BookingFormValues = {
  matchcode: string;
  label: string;
  arrival: string;
  departure: string;
  note: string;
};

export type BookingFormError =
  | "matchcodeRequired"
  | "matchcodeTooLong"
  | "labelRequired"
  | "labelTooLong"
  | "invalidDate"
  | "departureBeforeArrival"
  | "noteTooLong";

export type BookingFormResult =
  | {
      ok: true;
      value: {
        matchcode: string;
        label: string;
        arrival: string;
        departure: string;
        note: string | null;
      };
    }
  | { ok: false; error: BookingFormError };

export const EMPTY_BOOKING_FORM: BookingFormValues = {
  matchcode: "",
  label: "",
  arrival: "",
  departure: "",
  note: "",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function validateBookingForm(form: BookingFormValues): BookingFormResult {
  const matchcode = form.matchcode.trim();
  const label = form.label.trim();
  const note = form.note.trim();
  if (matchcode === "") {
    return { ok: false, error: "matchcodeRequired" };
  }
  if (matchcode.length > MATCHCODE_MAX) {
    return { ok: false, error: "matchcodeTooLong" };
  }
  if (label === "") {
    return { ok: false, error: "labelRequired" };
  }
  if (label.length > LABEL_MAX) {
    return { ok: false, error: "labelTooLong" };
  }
  if (!isRealDate(form.arrival) || !isRealDate(form.departure)) {
    return { ok: false, error: "invalidDate" };
  }
  // Les dates ISO se comparent lexicographiquement.
  if (form.departure < form.arrival) {
    return { ok: false, error: "departureBeforeArrival" };
  }
  if (note.length > BOOKING_NOTE_MAX) {
    return { ok: false, error: "noteTooLong" };
  }
  return {
    ok: true,
    value: {
      matchcode,
      label,
      arrival: form.arrival,
      departure: form.departure,
      note: note === "" ? null : note,
    },
  };
}

// Mêmes clés que public.is_valid_allergies.
export const ALLERGY_KEYS = [
  "gluten",
  "krebstiere",
  "eier",
  "fisch",
  "erdnuesse",
  "soja",
  "milch",
  "schalenfruechte",
  "sellerie",
  "senf",
  "sesam",
  "sulfite",
  "lupinen",
  "weichtiere",
  "sonstige",
] as const;

export type AllergyError = "allergyFormat" | "allergyUnknown";

export type AllergyResult =
  { ok: true; value: Record<string, number> } | { ok: false; error: AllergyError };

// Saisie « gluten 2, milch 1 » -> objet JSON { gluten: 2, milch: 1 }.
export function parseAllergies(text: string): AllergyResult {
  const value: Record<string, number> = {};
  const trimmed = text.trim();
  if (trimmed === "") {
    return { ok: true, value };
  }
  for (const part of trimmed.split(",")) {
    const match = /^\s*([A-Za-zäöüÄÖÜ]+)\s*[: ]\s*(\d{1,4})\s*$/.exec(part);
    if (!match) {
      return { ok: false, error: "allergyFormat" };
    }
    const key = (match[1] ?? "").toLowerCase();
    const count = Number(match[2]);
    if (!(ALLERGY_KEYS as readonly string[]).includes(key)) {
      return { ok: false, error: "allergyUnknown" };
    }
    if (count < 1) {
      return { ok: false, error: "allergyFormat" };
    }
    value[key] = count;
  }
  return { ok: true, value };
}

export function formatAllergies(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return "";
  }
  return Object.entries(value)
    .map(([name, n]) => `${name} ${String(n)}`)
    .join(", ");
}

// Traduit une erreur PostgREST ; le texte brut peut contenir la ligne fautive (allergies) :
// on ne s'appuie que sur le code et le nom de contrainte, et rien n'est journalisé.
export function constraintErrorMessage(error: { code?: string; message?: string } | null): string {
  const message = error?.message ?? "";
  switch (error?.code) {
    case "23514":
      if (message.includes("diets_within_total")) {
        return de.guests.errors.dietsExceedTotal;
      }
      if (message.includes("allergies")) {
        return de.guests.errors.allergyInvalid;
      }
      if (message.includes("note")) {
        return de.guests.errors.noteTooLong;
      }
      if (message.includes("bookings")) {
        return de.bookings.errors.departureBeforeArrival;
      }
      return de.guests.errors.constraint;
    case "23505":
      return de.guests.errors.duplicate;
    case "42501":
      return de.guests.errors.forbidden;
    default:
      return de.guests.saveError;
  }
}
