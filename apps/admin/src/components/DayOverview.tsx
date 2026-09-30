"use client";

import {
  Anchor,
  Badge,
  Card,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ACTION_LABELS, TABLE_LABELS, formatTimestamp } from "../lib/auditLog.ts";
import { today, type TaskStatus } from "../lib/housekeeping.ts";
import { PAGE_MEALS, mealTotals } from "../lib/meals.ts";
import {
  TEAM_DEPARTMENTS,
  taskCounts,
  teamByDepartment,
  type TeamShiftRow,
} from "../lib/overview.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";
import { EmptyState } from "./ui/EmptyState.tsx";
import { ErrorState } from "./ui/ErrorState.tsx";
import { LoadingState } from "./ui/LoadingState.tsx";
import { PageHeader } from "./ui/PageHeader.tsx";

type LoadState<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

function useLoad<T>(label: string, load: () => Promise<T>): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      },
      (error: unknown) => {
        console.error(`${label} konnte nicht geladen werden`, error);
        if (!cancelled) {
          setState({ status: "error" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // `load` est recréée à chaque rendu ; le chargement ne dépend que du montage.
  }, []);
  return state;
}

function Block<T>(props: {
  title: string;
  href: string;
  state: LoadState<T>;
  errorMessage: string;
  emptyMessage: string;
  isEmpty: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  const { title, href, state, errorMessage, emptyMessage, isEmpty, children } = props;
  return (
    <Card withBorder>
      <Group justify="space-between" mb="sm">
        <Title order={3} fz="lg">
          {title}
        </Title>
        <Anchor
          component={Link}
          href={href}
          size="sm"
          aria-label={`${title}: ${de.overview.openPage}`}
        >
          {de.overview.openPage}
        </Anchor>
      </Group>
      {state.status === "loading" && <LoadingState label={de.loading} rows={2} />}
      {state.status === "error" && <ErrorState message={errorMessage} />}
      {state.status === "ready" &&
        (isEmpty(state.data) ? <EmptyState title={emptyMessage} /> : children(state.data))}
    </Card>
  );
}

type AuditItem = { id: string; table_name: string; action: string; changed_at: string };

export function DayOverview() {
  const [date] = useState(() => today());

  const team = useLoad("Team", async () => {
    const { data, error } = await getSupabase().rpc("team_shifts", { day: date });
    if (error) {
      throw error;
    }
    return data satisfies TeamShiftRow[];
  });
  const meals = useLoad("Verpflegung", async () => {
    const { data, error } = await getSupabase().rpc("meal_totals", {
      from_date: date,
      to_date: date,
    });
    if (error) {
      throw error;
    }
    return mealTotals(data);
  });
  const cleaning = useLoad("Housekeeping", async () => {
    const { data, error } = await getSupabase()
      .from("room_tasks")
      .select("status")
      .eq("date", date);
    if (error) {
      throw error;
    }
    return taskCounts(data.map((t) => t.status));
  });
  const changes = useLoad("Änderungen", async () => {
    const { data, error } = await getSupabase()
      .from("audit_log")
      .select("id, table_name, action, changed_at")
      .order("changed_at", { ascending: false })
      .limit(5);
    if (error) {
      throw error;
    }
    return data satisfies AuditItem[];
  });

  return (
    <Stack>
      <PageHeader title={de.overview.title} description={date.split("-").reverse().join(".")} />
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Block
          title={de.overview.team}
          href="/dienstplan"
          state={team}
          errorMessage={de.overview.teamError}
          emptyMessage={de.overview.teamEmpty}
          isEmpty={(rows) => rows.length === 0}
        >
          {(rows) => {
            const groups = teamByDepartment(rows);
            return (
              <Stack gap="sm">
                {TEAM_DEPARTMENTS.filter((d) => groups.has(d)).map((d) => (
                  <Stack key={d} gap={2}>
                    <Text fw={600}>{de.overview.departments[d]}</Text>
                    {groups.get(d)?.map((e) => (
                      <Group key={e.id} justify="space-between">
                        <Text size="sm">{e.name}</Text>
                        <Text size="sm" c="dimmed">
                          {e.label}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                ))}
              </Stack>
            );
          }}
        </Block>
        <Block
          title={de.overview.meals}
          href="/gaeste"
          state={meals}
          errorMessage={de.overview.mealsError}
          emptyMessage={de.overview.mealsEmpty}
          isEmpty={(totals) => PAGE_MEALS.every((m) => totals[m].total === 0)}
        >
          {(totals) => (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th />
                  <Table.Th>{de.guests.total}</Table.Th>
                  <Table.Th>{de.guests.veg}</Table.Th>
                  <Table.Th>{de.guests.vegan}</Table.Th>
                  <Table.Th>{de.guests.mos}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {PAGE_MEALS.map((m) => (
                  <Table.Tr key={m}>
                    <Table.Td>{de.guests.meals[m]}</Table.Td>
                    <Table.Td>{totals[m].total}</Table.Td>
                    <Table.Td>{totals[m].veg}</Table.Td>
                    <Table.Td>{totals[m].vegan}</Table.Td>
                    <Table.Td>{totals[m].mos}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Block>
        <Block
          title={de.overview.cleaning}
          href="/housekeeping"
          state={cleaning}
          errorMessage={de.overview.cleaningError}
          emptyMessage={de.overview.cleaningEmpty}
          isEmpty={(counts) => counts.total === 0}
        >
          {(counts) => (
            <Stack gap="sm">
              <Progress
                value={counts.percentDone}
                color="success"
                aria-label={de.overview.progress}
              />
              <Text size="sm">{counts.percentDone} %</Text>
              <Group>
                {(["offen", "in_arbeit", "erledigt"] as const satisfies readonly TaskStatus[]).map(
                  (status) => (
                    <Badge
                      key={status}
                      variant="light"
                      color={
                        status === "offen" ? "gray" : status === "in_arbeit" ? "warning" : "success"
                      }
                    >
                      {de.housekeeping.statuses[status]}: {counts[status]}
                    </Badge>
                  ),
                )}
              </Group>
            </Stack>
          )}
        </Block>
        <Block
          title={de.overview.changes}
          href="/aenderungsprotokoll"
          state={changes}
          errorMessage={de.overview.changesError}
          emptyMessage={de.overview.changesEmpty}
          isEmpty={(rows) => rows.length === 0}
        >
          {(rows) => (
            <Stack gap={4}>
              {rows.map((r) => (
                <Group key={r.id} justify="space-between">
                  <Text size="sm">
                    {TABLE_LABELS[r.table_name] ?? r.table_name} ·{" "}
                    {ACTION_LABELS[r.action] ?? r.action}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {formatTimestamp(r.changed_at)}
                  </Text>
                </Group>
              ))}
            </Stack>
          )}
        </Block>
      </SimpleGrid>
    </Stack>
  );
}
