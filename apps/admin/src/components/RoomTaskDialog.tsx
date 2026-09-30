"use client";

import {
  Alert,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import {
  buildRoomTaskArgs,
  EMPTY_ROOM_TASK_FORM,
  roomTaskErrorMessage,
  type RoomTaskForm,
} from "../lib/roomTaskForm.ts";
import type { TaskType } from "../lib/housekeeping.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";

export type RoomOption = { id: string; number: string };
export type EmployeeOption = { id: string; displayName: string };

export function RoomTaskDialog({
  date,
  rooms,
  employees,
  onClose,
  onSaved,
}: {
  date: string;
  rooms: RoomOption[];
  employees: EmployeeOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const d = de.housekeeping.dialog;
  const [form, setForm] = useState<RoomTaskForm>(EMPTY_ROOM_TASK_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<RoomTaskForm>) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    const result = buildRoomTaskArgs(form, date);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: dbError } = await getSupabase().rpc("save_room_task", result.args);
    setBusy(false);
    if (dbError) {
      console.error("save_room_task fehlgeschlagen", dbError.code);
      setError(roomTaskErrorMessage(dbError));
      return;
    }
    onSaved();
  }

  return (
    <Modal opened onClose={onClose} title={d.title}>
      <Stack>
        <SegmentedControl
          aria-label={d.target}
          value={form.target}
          onChange={(value) => set({ target: value === "zone" ? "zone" : "room" })}
          data={[
            { value: "room", label: d.targetRoom },
            { value: "zone", label: d.targetZone },
          ]}
        />
        {form.target === "room" ? (
          <Select
            label={d.room}
            required
            searchable
            data={rooms.map((r) => ({ value: r.id, label: r.number }))}
            value={form.roomId}
            onChange={(value) => set({ roomId: value })}
          />
        ) : (
          <TextInput
            label={d.zone}
            required
            value={form.zone}
            onChange={(e) => set({ zone: e.currentTarget.value })}
          />
        )}
        <Select
          label={d.type}
          required
          allowDeselect={false}
          data={(["abreise", "bleiber"] as TaskType[]).map((value) => ({
            value,
            label: de.housekeeping.types[value],
          }))}
          value={form.taskType}
          onChange={(value) => set({ taskType: value === "bleiber" ? "bleiber" : "abreise" })}
        />
        <Select
          label={d.assignee}
          clearable
          placeholder={de.housekeeping.unassigned}
          data={employees.map((e) => ({ value: e.id, label: e.displayName }))}
          value={form.assignedTo}
          onChange={(value) => set({ assignedTo: value })}
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
          <Alert color="danger" role="alert">
            {error}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button loading={busy} onClick={() => void save()}>
            {d.save}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
