"use client";

import { Alert, Button, Group, Loader, Stack, Table, Text, Title } from "@mantine/core";
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
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";
import { ShiftDialog, type ShiftTarget } from "./ShiftDialog.tsx";

type Data = { employees: ScheduleEmployee[]; shifts: ScheduleShift[] };
type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; data: Data };

const SUNDAY_BG = "var(--mantine-color-red-light)";

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
      {state.status === "loading" && (
        <Group>
          <Loader size="sm" />
          <Text>{de.loading}</Text>
        </Group>
      )}
      {state.status === "error" && (
        <Alert color="red" role="alert">
          {de.schedule.loadError}
        </Alert>
      )}
      {state.status === "ready" &&
        (state.data.employees.length === 0 ? (
          <Text>{de.schedule.empty}</Text>
        ) : (
          <Grid month={month} data={state.data} onSelect={setTarget} />
        ))}
      {target && (
        <ShiftDialog
          target={target}
          onClose={() => setTarget(null)}
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
    <Table.ScrollContainer minWidth={800}>
      <Table withTableBorder withColumnBorders verticalSpacing={2} fz="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th rowSpan={2}>{de.schedule.date}</Table.Th>
            <Table.Th rowSpan={2}>{de.schedule.weekday}</Table.Th>
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
          {days.map((d) => (
            <Table.Tr key={d.date} bg={d.isSunday ? SUNDAY_BG : undefined}>
              <Table.Td fw={d.isSunday ? 700 : undefined}>
                {d.date.slice(8)}.{d.date.slice(5, 7)}.
              </Table.Td>
              <Table.Td fw={d.isSunday ? 700 : undefined}>{d.weekday}</Table.Td>
              {data.employees.flatMap((e) => {
                const shift = byEmployee.get(e.id)?.get(d.date);
                const cell = shiftCell(shift);
                const open = () => onSelect({ employee: e, date: d.date, shift });
                const props = { onClick: open, style: { cursor: "pointer" } };
                return [
                  <Table.Td key={`${e.id}-s`} {...props}>
                    {cell.start}
                  </Table.Td>,
                  <Table.Td key={`${e.id}-e`} {...props}>
                    {cell.end}
                  </Table.Td>,
                  <Table.Td key={`${e.id}-c`} {...props}>
                    {cell.code}
                  </Table.Td>,
                  <Table.Td key={`${e.id}-i`} {...props}>
                    {cell.ist}
                  </Table.Td>,
                ];
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
        <Table.Tfoot>
          {[de.schedule.totalIst, de.schedule.totalSoll, de.schedule.balance].map((label, i) => (
            <Table.Tr key={label}>
              <Table.Th colSpan={2}>{label}</Table.Th>
              {data.employees.map((e) => {
                const shifts = [...(byEmployee.get(e.id)?.values() ?? [])];
                const b = employeeBalance(e, shifts);
                const value = [b.istMinutes, b.sollMinutes, b.diffMinutes][i] ?? 0;
                return (
                  <Table.Th key={e.id} colSpan={4} ta="center">
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
