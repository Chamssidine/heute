"use client";

import { Badge, Button, Group, Stack, Table, Text, Title } from "@mantine/core";
import { formatHHMM } from "@heute/domain";
import { useEffect, useMemo, useState } from "react";
import {
  currentMonth,
  employeeBalance,
  monthDays,
  monthRange,
  shiftCell,
  shiftMonth,
  type ScheduleEmployee,
  type ScheduleShift,
} from "../lib/schedule.ts";
import { useRealtimeRefresh } from "../lib/realtime.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";
import { ShiftDialog, type ShiftTarget } from "./ShiftDialog.tsx";
import { EmptyState } from "./ui/EmptyState.tsx";
import { ErrorState } from "./ui/ErrorState.tsx";
import { LoadingState } from "./ui/LoadingState.tsx";

type Data = { employees: ScheduleEmployee[]; shifts: ScheduleShift[] };
type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; data: Data };

// Dimanche : teinte danger douce + graisse ; les colonnes collantes restent opaques (surface dessous).
const SUNDAY_TINT =
  "linear-gradient(var(--mantine-color-danger-light), var(--mantine-color-danger-light))";
const DATE_COL = 56;
const WEEKDAY_COL = 48;
const DAY_ROW_HEIGHT = 32;

// Couleur du type de service ; le texte du code reste toujours affiché à côté (jamais la couleur seule).
const TYPE_COLORS: Record<ScheduleShift["type"], string> = {
  normal: "gray",
  td: "primary",
  sem: "success",
  urlaub: "gray",
  krank: "gray",
  frei: "gray",
};

const stickyRowCell = {
  position: "sticky" as const,
  zIndex: 1,
  backgroundColor: "var(--heute-surface)",
};

const stickyHead = (left: number | undefined, width?: number) => ({
  position: "sticky" as const,
  left,
  width,
  minWidth: width,
  zIndex: left === undefined ? undefined : 2,
  backgroundColor: "var(--heute-surface-muted)",
});

async function loadMonth(month: string): Promise<Data> {
  const supabase = getSupabase();
  const { first, last } = monthRange(month);
  const [employees, shifts] = await Promise.all([
    supabase
      .from("employees")
      .select("id, display_name, soll_min_month")
      .eq("active", true)
      .order("display_name"),
    supabase
      .from("shifts")
      .select("id, employee_id, date, type, start1, end1, start2, end2, break_min, note")
      .gte("date", first)
      .lte("date", last),
  ]);
  if (employees.error) {
    throw employees.error;
  }
  if (shifts.error) {
    throw shifts.error;
  }
  return {
    employees: employees.data.map((e) => ({
      id: e.id,
      displayName: e.display_name,
      sollMinutesMonth: e.soll_min_month,
    })),
    shifts: shifts.data.map(({ employee_id, ...rest }) => ({ employeeId: employee_id, ...rest })),
  };
}

export function ScheduleGrid() {
  const [month, setMonth] = useState(() => currentMonth());
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadCount, setReloadCount] = useState(0);
  const [target, setTarget] = useState<ShiftTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    loadMonth(month).then(
      (data) => {
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      },
      (error: unknown) => {
        console.error("Dienstplan konnte nicht geladen werden", error);
        if (!cancelled) {
          setState({ status: "error" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [month, reloadCount]);

  // Relecture silencieuse (sans état « loading ») pour ne pas faire clignoter la grille.
  useRealtimeRefresh(["shifts"], () => {
    loadMonth(month).then(
      (data) => setState({ status: "ready", data }),
      (error: unknown) => console.error("Dienstplan konnte nicht aktualisiert werden", error),
    );
  });

  return (
    <Stack>
      <Group>
        <Title order={2}>{de.nav.schedule}</Title>
        <Button
          variant="default"
          aria-label={de.schedule.previousMonth}
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
        >
          ◀
        </Button>
        <Text fw={600}>{month}</Text>
        <Button
          variant="default"
          aria-label={de.schedule.nextMonth}
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
        >
          ▶
        </Button>
      </Group>
      {state.status === "loading" && <LoadingState label={de.loading} rows={8} />}
      {state.status === "error" && <ErrorState message={de.schedule.loadError} />}
      {state.status === "ready" &&
        (state.data.employees.length === 0 ? (
          <EmptyState title={de.schedule.empty} />
        ) : (
          <Grid month={month} data={state.data} onSelect={setTarget} />
        ))}
      {target && (
        <ShiftDialog
          target={target}
          onClose={() => setTarget(null)}
          onCopied={() => setReloadCount((n) => n + 1)}
          onSaved={() => {
            setTarget(null);
            setReloadCount((n) => n + 1);
          }}
        />
      )}
    </Stack>
  );
}

function Grid({
  month,
  data,
  onSelect,
}: {
  month: string;
  data: Data;
  onSelect: (target: ShiftTarget) => void;
}) {
  const days = useMemo(() => monthDays(month), [month]);
  const byEmployee = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleShift>>();
    for (const row of data.shifts) {
      const perDay = map.get(row.employeeId) ?? new Map<string, ScheduleShift>();
      perDay.set(row.date, row);
      map.set(row.employeeId, perDay);
    }
    return map;
  }, [data.shifts]);

  return (
    <Table.ScrollContainer minWidth={800} maxHeight="calc(100vh - 240px)" type="scrollarea">
      <Table withColumnBorders verticalSpacing={0} fz="xs" aria-label={de.nav.schedule}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th rowSpan={2} style={stickyHead(0, DATE_COL)}>
              {de.schedule.date}
            </Table.Th>
            <Table.Th rowSpan={2} style={stickyHead(DATE_COL, WEEKDAY_COL)}>
              {de.schedule.weekday}
            </Table.Th>
            {data.employees.map((e) => (
              <Table.Th key={e.id} colSpan={4} ta="center">
                {e.displayName}
              </Table.Th>
            ))}
          </Table.Tr>
          <Table.Tr>
            {data.employees.flatMap((e) => [
              <Table.Th key={`${e.id}-s`}>{de.schedule.start}</Table.Th>,
              <Table.Th key={`${e.id}-e`}>{de.schedule.end}</Table.Th>,
              <Table.Th key={`${e.id}-c`}>{de.schedule.remark}</Table.Th>,
              <Table.Th key={`${e.id}-i`}>{de.schedule.ist}</Table.Th>,
            ])}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {days.map((d) => {
            const dayStyle = {
              ...stickyRowCell,
              backgroundImage: d.isSunday ? SUNDAY_TINT : undefined,
              fontWeight: d.isSunday ? 600 : undefined,
            };
            return (
              <Table.Tr key={d.date} h={DAY_ROW_HEIGHT}>
                <Table.Td style={{ ...dayStyle, left: 0, width: DATE_COL, minWidth: DATE_COL }}>
                  {d.date.slice(8)}.{d.date.slice(5, 7)}.
                </Table.Td>
                <Table.Td
                  style={{ ...dayStyle, left: DATE_COL, width: WEEKDAY_COL, minWidth: WEEKDAY_COL }}
                >
                  {d.weekday}
                </Table.Td>
                {data.employees.flatMap((e) => {
                  const shift = byEmployee.get(e.id)?.get(d.date);
                  const cell = shiftCell(shift);
                  const style = {
                    cursor: "pointer",
                    backgroundColor:
                      shift?.type === "frei" ? "var(--heute-surface-muted)" : undefined,
                    backgroundImage: d.isSunday ? SUNDAY_TINT : undefined,
                  };
                  const props = {
                    onClick: () => onSelect({ employee: e, date: d.date, shift }),
                    style,
                  };
                  return [
                    <Table.Td key={`${e.id}-s`} {...props}>
                      {cell.start}
                    </Table.Td>,
                    <Table.Td key={`${e.id}-e`} {...props}>
                      {cell.end}
                    </Table.Td>,
                    <Table.Td key={`${e.id}-c`} {...props}>
                      {cell.code && shift ? (
                        <Badge size="xs" radius="xs" color={TYPE_COLORS[shift.type]}>
                          {cell.code}
                        </Badge>
                      ) : null}
                    </Table.Td>,
                    <Table.Td key={`${e.id}-i`} {...props} ta="right">
                      {cell.ist}
                    </Table.Td>,
                  ];
                })}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
        <Table.Tfoot>
          {[de.schedule.totalIst, de.schedule.totalSoll, de.schedule.balance].map((label, i) => (
            <Table.Tr key={label}>
              <Table.Th colSpan={2} style={stickyHead(0)}>
                {label}
              </Table.Th>
              {data.employees.map((e) => {
                const shifts = [...(byEmployee.get(e.id)?.values() ?? [])];
                const b = employeeBalance(e, shifts);
                const value = [b.istMinutes, b.sollMinutes, b.diffMinutes][i] ?? 0;
                return (
                  <Table.Th
                    key={e.id}
                    colSpan={4}
                    ta="right"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatHHMM(value)}
                  </Table.Th>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tfoot>
      </Table>
    </Table.ScrollContainer>
  );
}
