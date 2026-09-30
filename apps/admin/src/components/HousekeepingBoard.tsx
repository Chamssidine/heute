"use client";

import { Alert, Badge, Group, Select, Stack, Table, TextInput, Title } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  groupByFloor,
  STATUS_COLORS,
  today,
  type HousekeepingTask,
  type TaskStatus,
} from "../lib/housekeeping.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";
import { EmptyState } from "./ui/EmptyState.tsx";
import { ErrorState } from "./ui/ErrorState.tsx";
import { LoadingState } from "./ui/LoadingState.tsx";
import { PageHeader } from "./ui/PageHeader.tsx";

// tokens.md §4.1 : offen = neutre, in_arbeit = warning, erledigt = success (palettes du thème).
const STATUS_TOKENS: Record<TaskStatus, string> = {
  offen: "gray",
  in_arbeit: "warning",
  erledigt: "success",
};

type Employee = { id: string; displayName: string };
type Data = { tasks: HousekeepingTask[]; employees: Employee[] };
type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; data: Data };

async function loadDay(date: string): Promise<Data> {
  const supabase = getSupabase();
  const [tasks, employees] = await Promise.all([
    supabase
      .from("room_tasks")
      .select("id, task_type, zone, status, assigned_to, rooms(number, floor)")
      .eq("date", date),
    supabase
      .from("employees")
      .select("id, display_name")
      .eq("active", true)
      .eq("department", "housekeeping")
      .order("display_name"),
  ]);
  if (tasks.error) {
    throw tasks.error;
  }
  if (employees.error) {
    throw employees.error;
  }
  return {
    tasks: tasks.data.map((t) => ({
      id: t.id,
      taskType: t.task_type,
      zone: t.zone,
      status: t.status,
      assignedTo: t.assigned_to,
      roomNumber: t.rooms?.number ?? null,
      floor: t.rooms?.floor ?? null,
    })),
    employees: employees.data.map((e) => ({ id: e.id, displayName: e.display_name })),
  };
}

const STATUS_OPTIONS = (Object.keys(STATUS_COLORS) as TaskStatus[]).map((value) => ({
  value,
  label: de.housekeeping.statuses[value],
}));

export function HousekeepingBoard() {
  const [date, setDate] = useState(() => today());
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async (day: string) => {
    try {
      setState({ status: "ready", data: await loadDay(day) });
    } catch (error) {
      console.error("Housekeeping konnte nicht geladen werden", error);
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    setState({ status: "loading" });
    setActionError(null);
    void reload(date);
  }, [date, reload]);

  async function changeStatus(id: string, status: TaskStatus) {
    setActionError(null);
    const { error } = await getSupabase().rpc("set_task_status", { p_id: id, p_status: status });
    if (error) {
      console.error("set_task_status fehlgeschlagen", error);
      // HT002 = forbidden (packages/domain/src/errors, non exporté par l'index du domaine).
      setActionError(
        error.code === "HT002" ? de.housekeeping.forbidden : de.housekeeping.statusError,
      );
      return;
    }
    await reload(date);
  }

  return (
    <Stack>
      <PageHeader
        title={de.nav.housekeeping}
        actions={
          <TextInput
            type="date"
            aria-label={de.housekeeping.date}
            value={date}
            onChange={(e) => {
              if (e.currentTarget.value) {
                setDate(e.currentTarget.value);
              }
            }}
          />
        }
      />
      {actionError && (
        <Alert color="danger" role="alert">
          {actionError}
        </Alert>
      )}
      {state.status === "loading" && <LoadingState label={de.loading} rows={6} />}
      {state.status === "error" && <ErrorState message={de.housekeeping.loadError} />}
      {state.status === "ready" &&
        (state.data.tasks.length === 0 ? (
          <EmptyState title={de.housekeeping.empty} />
        ) : (
          <Floors data={state.data} onStatus={changeStatus} />
        ))}
    </Stack>
  );
}

function Floors({
  data,
  onStatus,
}: {
  data: Data;
  onStatus: (id: string, status: TaskStatus) => Promise<void>;
}) {
  const groups = useMemo(() => groupByFloor(data.tasks), [data.tasks]);
  const options = data.employees.map((e) => ({ value: e.id, label: e.displayName }));

  return (
    <Stack gap="lg">
      {groups.map((group) => (
        <Stack key={group.floor ?? "zones"} gap="xs">
          <Group gap="xs">
            <Title order={2}>
              {group.floor === null
                ? de.housekeeping.noFloor
                : `${de.housekeeping.floor} ${group.floor}`}
            </Title>
            <Badge variant="default" aria-label={String(group.tasks.length)}>
              {group.tasks.length}
            </Badge>
          </Group>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{de.housekeeping.room}</Table.Th>
                <Table.Th>{de.housekeeping.type}</Table.Th>
                <Table.Th>{de.housekeeping.zone}</Table.Th>
                <Table.Th>{de.housekeeping.assignee}</Table.Th>
                <Table.Th>{de.housekeeping.status}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {group.tasks.map((t) => (
                <Table.Tr key={t.id}>
                  <Table.Td>{t.roomNumber ?? "–"}</Table.Td>
                  <Table.Td>{de.housekeeping.types[t.taskType]}</Table.Td>
                  <Table.Td>{t.zone ?? "–"}</Table.Td>
                  <Table.Td>
                    {/* Pas de RPC ni de policy d'écriture pour assigned_to : désactivé (issue « contrat »). */}
                    <Select
                      w={192}
                      data={options}
                      value={t.assignedTo}
                      placeholder={de.housekeeping.unassigned}
                      aria-label={de.housekeeping.assignee}
                      title={de.housekeeping.assignHint}
                      disabled
                    />
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Badge color={STATUS_TOKENS[t.status]} miw={96}>
                        {de.housekeeping.statuses[t.status]}
                      </Badge>
                      <Select
                        w={144}
                        data={STATUS_OPTIONS}
                        value={t.status}
                        allowDeselect={false}
                        aria-label={de.housekeeping.status}
                        onChange={(value) => {
                          const next = STATUS_OPTIONS.find((o) => o.value === value);
                          if (next) {
                            void onStatus(t.id, next.value);
                          }
                        }}
                      />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      ))}
    </Stack>
  );
}
