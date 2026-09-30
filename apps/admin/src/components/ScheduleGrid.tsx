"use client";

import {
  Badge,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
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
import { scheduleView } from "./scheduleViewStrings.ts";
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

// Vue Kompakt : le texte du badge (Dienst, Teildienst…) accompagne toujours la couleur.
const COMPACT_COLORS: Record<ScheduleShift["type"], string> = {
  normal: "primary",
  td: "warning",
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
  const [view, setView] = useState<"compact" | "excel">("compact");
  const [legendOpen, setLegendOpen] = useState(false);

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
        <SegmentedControl
          aria-label={scheduleView.viewLabel}
          value={view}
          onChange={(v) => setView(v === "excel" ? "excel" : "compact")}
          data={[
            { value: "compact", label: scheduleView.viewCompact },
            { value: "excel", label: scheduleView.viewExcel },
          ]}
        />
        <Button variant="default" onClick={() => setLegendOpen(true)}>
          {scheduleView.legend}
        </Button>
      </Group>
      <Legend opened={legendOpen} onClose={() => setLegendOpen(false)} />
      {state.status === "loading" && <LoadingState label={de.loading} rows={8} />}
      {state.status === "error" && <ErrorState message={de.schedule.loadError} />}
      {state.status === "ready" &&
        (state.data.employees.length === 0 ? (
          <EmptyState title={de.schedule.empty} />
        ) : view === "compact" ? (
          <CompactGrid month={month} data={state.data} onSelect={setTarget} />
        ) : (
          <ExcelGrid month={month} data={state.data} onSelect={setTarget} />
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

const COMPACT_DATE_COL = 88;
const COMPACT_EMPLOYEE_COL = 144;
const COMPACT_ROW_HEIGHT = 56;
// Fond léger des dimanches (neutre, pas de rose) ; posé par-dessus le fond opaque de la cellule.
const SUNDAY_SOFT =
  "linear-gradient(var(--mantine-color-gray-light), var(--mantine-color-gray-light))";
const HOVER_TINT =
  "linear-gradient(var(--mantine-color-primary-light-hover), var(--mantine-color-primary-light-hover))";

function todayIso(): string {
  // Le jour courant se calcule en Europe/Berlin, quel que soit le fuseau du navigateur.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

function BalanceSummary({
  employee,
  shifts,
}: {
  employee: ScheduleEmployee;
  shifts: ScheduleShift[];
}) {
  const b = employeeBalance(employee, shifts);
  const positive = b.diffMinutes >= 0;
  const saldo = `${positive ? "+" : ""}${formatHHMM(b.diffMinutes)}`;
  return (
    <Stack gap={0} align="center" fz="xs" style={{ fontVariantNumeric: "tabular-nums" }}>
      <Text span fz="xs" fw={400}>
        {scheduleView.istMonth} {formatHHMM(b.istMinutes)}
      </Text>
      <Text span fz="xs" fw={400}>
        {de.schedule.totalSoll} {formatHHMM(b.sollMinutes)}
      </Text>
      <Badge size="sm" radius="xs" color={positive ? "success" : "warning"}>
        {de.schedule.balance} {saldo}
      </Badge>
    </Stack>
  );
}

function CompactGrid({
  month,
  data,
  onSelect,
}: {
  month: string;
  data: Data;
  onSelect: (target: ShiftTarget) => void;
}) {
  const days = useMemo(() => monthDays(month), [month]);
  const today = todayIso();
  const [hovered, setHovered] = useState<string | null>(null);
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
    <Table.ScrollContainer
      minWidth={COMPACT_DATE_COL + COMPACT_EMPLOYEE_COL * 4}
      maxHeight="calc(100vh - 240px)"
      type="scrollarea"
    >
      <Table
        withColumnBorders
        highlightOnHover={false}
        verticalSpacing={0}
        fz="xs"
        aria-label={de.nav.schedule}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ ...stickyHead(0, COMPACT_DATE_COL), top: 0, zIndex: 3 }}>
              {de.schedule.date}
            </Table.Th>
            {data.employees.map((e) => (
              <Table.Th
                key={e.id}
                ta="center"
                style={{
                  minWidth: COMPACT_EMPLOYEE_COL,
                  verticalAlign: "top",
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  backgroundColor: "var(--heute-surface-muted)",
                }}
              >
                <Stack gap={4} align="center" py={4}>
                  <Text fz="sm" fw={600} c="var(--heute-text)">
                    {e.displayName}
                  </Text>
                  <BalanceSummary
                    employee={e}
                    shifts={[...(byEmployee.get(e.id)?.values() ?? [])]}
                  />
                </Stack>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {days.map((d) => {
            const isToday = d.date === today;
            const isHovered = hovered === d.date;
            const tint = [isHovered ? HOVER_TINT : null, d.isSunday ? SUNDAY_SOFT : null]
              .filter(Boolean)
              .join(", ");
            return (
              <Table.Tr
                key={d.date}
                h={COMPACT_ROW_HEIGHT}
                onMouseEnter={() => setHovered(d.date)}
                onMouseLeave={() => setHovered(null)}
              >
                <Table.Td
                  aria-current={isToday ? "date" : undefined}
                  style={{
                    ...stickyRowCell,
                    left: 0,
                    width: COMPACT_DATE_COL,
                    minWidth: COMPACT_DATE_COL,
                    backgroundImage: tint || undefined,
                    boxShadow: isToday
                      ? "inset 4px 0 0 var(--mantine-color-primary-filled)"
                      : undefined,
                  }}
                >
                  <Group gap={4} wrap="nowrap">
                    <Text span fz="xs" fw={600}>
                      {d.weekday} {d.date.slice(8)}.{d.date.slice(5, 7)}.
                    </Text>
                  </Group>
                  {isToday && (
                    <Text span fz="xs" c="primary" display="block">
                      {scheduleView.today}
                    </Text>
                  )}
                  {d.isSunday && (
                    <Text span fz="xs" c="var(--heute-text-muted)" display="block">
                      {scheduleView.sundayFactor}
                    </Text>
                  )}
                </Table.Td>
                {data.employees.map((e) => {
                  const shift = byEmployee.get(e.id)?.get(d.date);
                  const cell = shiftCell(shift);
                  const free = shift?.type === "frei";
                  const select = () => onSelect({ employee: e, date: d.date, shift });
                  return (
                    <Table.Td
                      key={e.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${e.displayName}, ${d.weekday} ${d.date.slice(8)}.${d.date.slice(5, 7)}.${shift ? `, ${scheduleView.badges[shift.type]}` : ""}`}
                      onClick={select}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          select();
                        }
                      }}
                      style={{
                        cursor: "pointer",
                        verticalAlign: "top",
                        backgroundColor: free ? "var(--heute-surface-muted)" : undefined,
                        backgroundImage: tint || undefined,
                      }}
                    >
                      {shift && (
                        <Stack gap={2} py={4} align="flex-start">
                          <Badge
                            size="sm"
                            radius="xs"
                            color={COMPACT_COLORS[shift.type]}
                            variant={free ? "outline" : "light"}
                          >
                            {scheduleView.badges[shift.type]}
                          </Badge>
                          {cell.start && <Text fz="sm">{cell.start}</Text>}
                          {cell.end && <Text fz="sm">{cell.end}</Text>}
                          {shift.note && (
                            <Text fz="xs" c="var(--heute-text-muted)">
                              {shift.note}
                            </Text>
                          )}
                          {cell.start && (
                            <Text fz="xs" c="var(--heute-text-muted)">
                              {scheduleView.istMonth} {cell.ist}
                            </Text>
                          )}
                        </Stack>
                      )}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function Legend({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  return (
    <Modal opened={opened} onClose={onClose} title={scheduleView.legendTitle}>
      <Stack gap="sm">
        {scheduleView.legendCodes.map((c) => (
          <Group key={c.code} gap="sm" wrap="nowrap" align="flex-start">
            <Badge size="sm" radius="xs" color="gray" miw={48}>
              {c.code}
            </Badge>
            <Text fz="sm">{c.meaning}</Text>
          </Group>
        ))}
        <Text fz="sm">{scheduleView.legendIst}</Text>
        <Text fz="sm">{scheduleView.legendSunday}</Text>
        <Text fz="sm">{scheduleView.legendSaldo}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {scheduleView.legendClose}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ExcelGrid({
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
