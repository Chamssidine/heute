"use client";

import { Alert, Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import {
  EMPTY_BOOKING_FORM,
  constraintErrorMessage,
  validateBookingForm,
  type BookingFormValues,
} from "../lib/bookings.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";

export type BookingTarget = { id: string; values: BookingFormValues } | null;

// `target` null = création ; sinon modification / suppression.
export function BookingDialog({
  target,
  defaultDate,
  onClose,
  onSaved,
}: {
  target: BookingTarget;
  defaultDate: string;
  onClose: () => void;
  onSaved: (arrival: string) => void;
}) {
  const d = de.bookings;
  const [form, setForm] = useState<BookingFormValues>(
    () => target?.values ?? { ...EMPTY_BOOKING_FORM, arrival: defaultDate, departure: defaultDate },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const set = (patch: Partial<BookingFormValues>) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    const result = validateBookingForm(form);
    if (!result.ok) {
      setError(d.errors[result.error]);
      return;
    }
    setBusy(true);
    setError(null);
    const table = getSupabase().from("bookings");
    const { error: dbError } = target
      ? await table.update(result.value).eq("id", target.id)
      : await table.insert(result.value);
    setBusy(false);
    if (dbError) {
      console.error("bookings konnte nicht gespeichert werden", dbError.code);
      setError(constraintErrorMessage(dbError));
      return;
    }
    onSaved(result.value.arrival);
  }

  async function remove() {
    if (!target) {
      return;
    }
    setBusy(true);
    setError(null);
    // Les lignes meal_counts partent avec le groupe (on delete cascade).
    const { error: dbError } = await getSupabase().from("bookings").delete().eq("id", target.id);
    setBusy(false);
    if (dbError) {
      console.error("bookings konnte nicht gelöscht werden", dbError.code);
      setError(constraintErrorMessage(dbError));
      return;
    }
    onSaved(form.arrival);
  }

  return (
    <Modal opened onClose={onClose} title={target ? d.titleEdit : d.titleNew}>
      <Stack>
        <TextInput
          label={d.matchcode}
          required
          value={form.matchcode}
          onChange={(e) => set({ matchcode: e.currentTarget.value })}
        />
        <TextInput
          label={d.label}
          required
          value={form.label}
          onChange={(e) => set({ label: e.currentTarget.value })}
        />
        <Group grow>
          <TextInput
            type="date"
            label={d.arrival}
            required
            value={form.arrival}
            onChange={(e) => set({ arrival: e.currentTarget.value })}
          />
          <TextInput
            type="date"
            label={d.departure}
            required
            value={form.departure}
            onChange={(e) => set({ departure: e.currentTarget.value })}
          />
        </Group>
        <TextInput
          label={d.note}
          value={form.note}
          onChange={(e) => set({ note: e.currentTarget.value })}
        />
        {confirming && (
          <Alert color="red" title={d.confirmTitle}>
            <Text size="sm">{d.confirmText}</Text>
            <Button mt="xs" color="red" loading={busy} onClick={() => void remove()}>
              {d.confirmDelete}
            </Button>
          </Alert>
        )}
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        <Group justify="space-between">
          {target ? (
            <Button color="red" variant="light" onClick={() => setConfirming(true)}>
              {d.delete}
            </Button>
          ) : (
            <span />
          )}
          <Group>
            <Button variant="default" onClick={onClose}>
              {d.cancel}
            </Button>
            <Button loading={busy} onClick={() => void save()}>
              {d.save}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
