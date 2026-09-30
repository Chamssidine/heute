"use client";

import { Alert, Button, Checkbox, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import {
  buildRoomInsert,
  EMPTY_ROOM_FORM,
  roomInsertErrorMessage,
  type RoomForm,
} from "../lib/roomTaskForm.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";

export function RoomDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const d = de.housekeeping.roomDialog;
  const [form, setForm] = useState<RoomForm>(EMPTY_ROOM_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<RoomForm>) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    const result = buildRoomInsert(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBusy(true);
    setError(null);
    // Écriture directe permise à l'admin par la policy rooms_admin_write.
    const { error: dbError } = await getSupabase().from("rooms").insert(result.value);
    setBusy(false);
    if (dbError) {
      console.error("rooms konnte nicht gespeichert werden", dbError.code);
      setError(roomInsertErrorMessage(dbError));
      return;
    }
    onSaved();
  }

  return (
    <Modal opened onClose={onClose} title={d.title}>
      <Stack>
        <TextInput
          label={d.number}
          required
          value={form.number}
          onChange={(e) => set({ number: e.currentTarget.value })}
        />
        <Group grow>
          <TextInput
            type="number"
            label={d.floor}
            required
            value={form.floor}
            onChange={(e) => set({ floor: e.currentTarget.value })}
          />
          <TextInput
            type="number"
            label={d.beds}
            required
            value={form.beds}
            onChange={(e) => set({ beds: e.currentTarget.value })}
          />
        </Group>
        <Checkbox
          label={d.hasBath}
          checked={form.hasBath}
          onChange={(e) => set({ hasBath: e.currentTarget.checked })}
        />
        {error && (
          <Alert color="danger" role="alert">
            {error}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {de.housekeeping.dialog.cancel}
          </Button>
          <Button loading={busy} onClick={() => void save()}>
            {de.housekeeping.dialog.save}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
