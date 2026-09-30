"use client";

import { Alert, Button, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import type { ScheduleEmployee, ScheduleShift } from "../lib/schedule.ts";
import {
  EMPTY_FORM,
  SHIFT_TYPES,
  buildShiftArgs,
  hasHours,
  serverErrorMessage,
  type ShiftForm,
} from "../lib/shiftForm.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";
import { formatHHMM } from "@heute/domain";

export type ShiftTarget = {
  employee: ScheduleEmployee;
  date: string;
  shift: ScheduleShift | undefined;
};

function initialForm(shift: ScheduleShift | undefined): ShiftForm {
  if (!shift) {
    return EMPTY_FORM;
  }
  const t = (v: number | null | undefined) => (v == null ? "" : formatHHMM(v));
  return {
    type: shift.type,
    start1: t(shift.start1),
    end1: t(shift.end1),
    start2: t(shift.start2),
    end2: t(shift.end2),
    breakMin: String(shift.break_min ?? 30),
    note: shift.note ?? "",
    reason: "",
  };
}

export function ShiftDialog({
  target,
  onClose,
  onSaved,
}: {
  target: ShiftTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ShiftForm>(() => initialForm(target.shift));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<ShiftForm>) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    const built = buildShiftArgs(form);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: rpcError } = await getSupabase().rpc("save_shift", {
      p_employee_id: target.employee.id,
      p_date: target.date,
      ...built.args,
    });
    setBusy(false);
    if (rpcError) {
      console.error("save_shift", rpcError);
      setError(serverErrorMessage(rpcError));
      return;
    }
    onSaved();
  }

  async function remove() {
    const id = target.shift?.id;
    if (!id) {
      return;
    }
    if (form.reason.trim() === "") {
      setError(de.shiftDialog.reasonRequired);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: rpcError } = await getSupabase().rpc("delete_shift", {
      p_id: id,
      p_reason: form.reason.trim(),
    });
    setBusy(false);
    if (rpcError) {
      console.error("delete_shift", rpcError);
      setError(serverErrorMessage(rpcError));
      return;
    }
    onSaved();
  }

  const d = de.shiftDialog;
  return (
    <Modal opened onClose={onClose} title={d.title}>
      <Stack>
        <Text size="sm">
          {target.employee.displayName} · {target.date.slice(8)}.{target.date.slice(5, 7)}.
          {target.date.slice(0, 4)}
        </Text>
        <Select
          label={d.type}
          allowDeselect={false}
          data={SHIFT_TYPES.map((value) => ({ value, label: d.types[value] }))}
          value={form.type}
          onChange={(value) => {
            const next = SHIFT_TYPES.find((t) => t === value);
            if (next) {
              set({ type: next });
            }
          }}
        />
        {hasHours(form.type) && (
          <Group grow>
            <TextInput
              label={d.start1}
              placeholder="06:00"
              value={form.start1}
              onChange={(e) => set({ start1: e.currentTarget.value })}
            />
            <TextInput
              label={d.end1}
              placeholder="14:30"
              value={form.end1}
              onChange={(e) => set({ end1: e.currentTarget.value })}
            />
          </Group>
        )}
        {form.type === "td" && (
          <Group grow>
            <TextInput
              label={d.start2}
              placeholder="17:00"
              value={form.start2}
              onChange={(e) => set({ start2: e.currentTarget.value })}
            />
            <TextInput
              label={d.end2}
              placeholder="21:00"
              value={form.end2}
              onChange={(e) => set({ end2: e.currentTarget.value })}
            />
          </Group>
        )}
        <TextInput
          label={d.breakMin}
          value={form.breakMin}
          onChange={(e) => set({ breakMin: e.currentTarget.value })}
        />
        <TextInput
          label={d.note}
          value={form.note}
          onChange={(e) => set({ note: e.currentTarget.value })}
        />
        <TextInput
          label={d.reason}
          required
          value={form.reason}
          onChange={(e) => set({ reason: e.currentTarget.value })}
        />
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        <Group justify="space-between">
          {target.shift?.id ? (
            <Button color="red" variant="light" loading={busy} onClick={() => void remove()}>
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
