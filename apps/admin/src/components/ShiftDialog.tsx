"use client";

import { Alert, Button, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { currentWeekStart, shiftWeek, weekDates } from "../lib/menu.ts";
import type { ScheduleEmployee, ScheduleShift } from "../lib/schedule.ts";
import {
  EMPTY_FORM,
  SHIFT_TYPES,
  buildShiftArgs,
  hasHours,
  planShiftCopy,
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
  onCopied,
}: {
  target: ShiftTarget;
  onClose: () => void;
  onSaved: () => void;
  onCopied: () => void;
}) {
  const [form, setForm] = useState<ShiftForm>(() => initialForm(target.shift));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [copyStep, setCopyStep] = useState<"idle" | "confirm" | "busy">("idle");
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

  // Semaine lun.-dim. contenant la cellule -> semaine suivante, pour cette personne.
  async function copyWeek() {
    setCopyStep("busy");
    setInfo(null);
    setError(null);
    const first = weekDates(currentWeekStart(new Date(`${target.date}T12:00:00`)));
    const supabase = getSupabase();
    const { data, error: loadError } = await supabase
      .from("shifts")
      .select("date, type, start1, end1, start2, end2, break_min, note")
      .eq("employee_id", target.employee.id)
      .gte("date", first[0] ?? target.date)
      .lte("date", first[6] ?? target.date);
    if (loadError) {
      console.error("copy week: load", loadError);
      setCopyStep("idle");
      setError(de.shiftDialog.copyWeekLoadError);
      return;
    }
    const nextWeek = weekDates(shiftWeek(first[0] ?? target.date, 1));
    const { data: existing, error: existingError } = await supabase
      .from("shifts")
      .select("date")
      .eq("employee_id", target.employee.id)
      .gte("date", nextWeek[0] ?? target.date)
      .lte("date", nextWeek[6] ?? target.date);
    if (existingError) {
      console.error("copy week: load target", existingError);
      setCopyStep("idle");
      setError(de.shiftDialog.copyWeekLoadError);
      return;
    }
    const plan = planShiftCopy(data, new Set(existing.map((r) => r.date)));
    if (plan.calls.length === 0) {
      setCopyStep("idle");
      setInfo(de.shiftDialog.copyWeekNothing);
      return;
    }
    let copied = 0;
    for (const { p_date, ...args } of plan.calls) {
      const { error: rpcError } = await supabase.rpc("save_shift", {
        p_employee_id: target.employee.id,
        p_date,
        ...args,
      });
      if (rpcError) {
        console.error("save_shift (copy week)", rpcError);
        setError(
          de.shiftDialog.copyWeekFailed(
            copied,
            plan.calls.length - copied,
            serverErrorMessage(rpcError),
          ),
        );
        setCopyStep("idle");
        if (copied > 0) {
          onCopied();
        }
        return;
      }
      copied += 1;
    }
    setCopyStep("idle");
    setInfo(de.shiftDialog.copyWeekDone(copied, plan.skipped));
    onCopied();
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
        {info && <Alert role="status">{info}</Alert>}
        {copyStep === "confirm" ? (
          <Group gap="xs">
            <Text size="sm">{d.copyWeekConfirm}</Text>
            <Button size="compact-sm" onClick={() => void copyWeek()}>
              {d.copyWeekConfirmYes}
            </Button>
            <Button size="compact-sm" variant="default" onClick={() => setCopyStep("idle")}>
              {d.cancel}
            </Button>
          </Group>
        ) : (
          <Button
            variant="default"
            loading={copyStep === "busy"}
            onClick={() => setCopyStep("confirm")}
          >
            {d.copyWeek}
          </Button>
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
