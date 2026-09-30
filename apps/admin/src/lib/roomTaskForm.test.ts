import assert from "node:assert/strict";
import { test } from "node:test";
import { de } from "../strings/de.ts";
import {
  buildRoomInsert,
  buildRoomTaskArgs,
  EMPTY_ROOM_FORM,
  EMPTY_ROOM_TASK_FORM,
  NULL_ARG,
  roomInsertErrorMessage,
  roomTaskErrorMessage,
} from "./roomTaskForm.ts";

test("buildRoomTaskArgs : chambre, motif et note rognés", () => {
  const r = buildRoomTaskArgs(
    { ...EMPTY_ROOM_TASK_FORM, roomId: "r1", note: "  ", reason: " Neu " },
    "2026-09-30",
  );
  assert.ok(r.ok);
  assert.deepEqual(r.args, {
    p_id: NULL_ARG,
    p_date: "2026-09-30",
    p_room_id: "r1",
    p_task_type: "abreise",
    p_zone: NULL_ARG,
    p_assigned_to: NULL_ARG,
    p_note: NULL_ARG,
    p_reason: "Neu",
  });
});

test("buildRoomTaskArgs : une zone exclut la chambre", () => {
  const r = buildRoomTaskArgs(
    { ...EMPTY_ROOM_TASK_FORM, target: "zone", roomId: "r1", zone: " Bäder ", reason: "x" },
    "2026-09-30",
  );
  assert.ok(r.ok);
  assert.equal(r.args.p_room_id, NULL_ARG);
  assert.equal(r.args.p_zone, "Bäder");
});

test("buildRoomTaskArgs : refuse chambre, zone ou motif manquants", () => {
  const d = de.housekeeping.dialog;
  const base = { ...EMPTY_ROOM_TASK_FORM, reason: "x" };
  assert.deepEqual(buildRoomTaskArgs(base, "2026-09-30"), { ok: false, error: d.roomRequired });
  assert.deepEqual(buildRoomTaskArgs({ ...base, target: "zone" }, "2026-09-30"), {
    ok: false,
    error: d.zoneRequired,
  });
  assert.deepEqual(buildRoomTaskArgs({ ...base, roomId: "r1", reason: " " }, "2026-09-30"), {
    ok: false,
    error: d.reasonRequired,
  });
});

test("buildRoomInsert : valeurs valides et refus", () => {
  const ok = buildRoomInsert({ number: " 101 ", floor: "1", beds: "4", hasBath: true });
  assert.deepEqual(ok, {
    ok: true,
    value: { number: "101", floor: 1, beds: 4, has_bath: true },
  });
  const d = de.housekeeping.roomDialog;
  assert.deepEqual(buildRoomInsert(EMPTY_ROOM_FORM), { ok: false, error: d.numberRequired });
  assert.deepEqual(buildRoomInsert({ number: "1", floor: "x", beds: "4", hasBath: false }), {
    ok: false,
    error: d.floorInvalid,
  });
  assert.deepEqual(buildRoomInsert({ number: "1", floor: "1", beds: "0", hasBath: false }), {
    ok: false,
    error: d.bedsInvalid,
  });
});

test("messages d'erreur selon le code", () => {
  assert.equal(roomTaskErrorMessage({ code: "HT002" }), de.housekeeping.forbidden);
  assert.equal(roomTaskErrorMessage({ code: "HT008" }), de.housekeeping.dialog.taskDone);
  assert.equal(roomTaskErrorMessage({ code: "??" }), de.housekeeping.dialog.saveError);
  assert.equal(roomInsertErrorMessage({ code: "23505" }), de.housekeeping.roomDialog.duplicate);
  assert.equal(roomInsertErrorMessage(null), de.housekeeping.roomDialog.saveError);
});
