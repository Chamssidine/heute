"use client";

import {
  Alert,
  Button,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import {
  ACTION_LABELS,
  AUDIT_TABLES,
  PAGE_SIZE,
  TABLE_LABELS,
  dayStartIso,
  diffRow,
  formatTimestamp,
  nextDayStartIso,
  pageCount,
  type AuditRow,
} from "../lib/auditLog.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";

type Filters = { from: string; to: string; table: string; person: string; author: string };
type Page = { rows: AuditRow[]; total: number };
type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; page: Page };

const NO_FILTERS: Filters = { from: "", to: "", table: "", person: "", author: "" };

async function loadEmployees(): Promise<Map<string, string>> {
  const { data, error } = await getSupabase().from("employees").select("id, display_name");
  if (error) {
    throw error;
  }
  return new Map(data.map((e) => [e.id, e.display_name]));
}

async function loadPage(filters: Filters, page: number): Promise<Page> {
  let query = getSupabase()
    .from("audit_log")
    .select("id, table_name, action, old, new, changed_by, changed_at, reason, employee_id, date", {
      count: "exact",
    })
    .order("changed_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (filters.from) {
    query = query.gte("changed_at", dayStartIso(filters.from));
  }
  if (filters.to) {
    query = query.lt("changed_at", nextDayStartIso(filters.to));
  }
  if (filters.table) {
    query = query.eq("table_name", filters.table);
  }
  if (filters.person) {
    query = query.eq("employee_id", filters.person);
  }
  if (filters.author) {
    query = query.eq("changed_by", filters.author);
  }
  const { data, error, count } = await query;
  if (error) {
    throw error;
  }
  return {
    rows: data.map((r) => ({
      id: r.id,
      tableName: r.table_name,
      action: r.action,
      old: r.old,
      new: r.new,
      changedBy: r.changed_by,
      changedAt: r.changed_at,
      reason: r.reason,
      employeeId: r.employee_id,
      date: r.date,
    })),
    total: count ?? 0,
  };
}

export function AuditLogView() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(0);
  const [names, setNames] = useState<ReadonlyMap<string, string>>(new Map());
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const update = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  useEffect(() => {
    let cancelled = false;
    loadEmployees().then(
      (map) => {
        if (!cancelled) {
          setNames(map);
        }
      },
      (error: unknown) => {
        console.error("Mitarbeitende konnten nicht geladen werden", error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    loadPage(filters, page).then(
      (result) => {
        if (!cancelled) {
          setState({ status: "ready", page: result });
        }
      },
      (error: unknown) => {
        console.error("Änderungsprotokoll konnte nicht geladen werden", error);
        if (!cancelled) {
          setState({ status: "error" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  const people = useMemo(
    () =>
      [...names.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "de")),
    [names],
  );
  const tables = AUDIT_TABLES.map((t) => ({ value: t, label: TABLE_LABELS[t] ?? t }));

  return (
    <Stack>
      <Title order={2}>{de.nav.auditLog}</Title>
      <Group align="flex-end">
        <TextInput
          type="date"
          label={de.auditLog.from}
          value={filters.from}
          onChange={(e) => update({ from: e.currentTarget.value })}
        />
        <TextInput
          type="date"
          label={de.auditLog.to}
          value={filters.to}
          onChange={(e) => update({ to: e.currentTarget.value })}
        />
        <Select
          label={de.auditLog.table}
          placeholder={de.auditLog.all}
          data={tables}
          value={filters.table || null}
          onChange={(v) => update({ table: v ?? "" })}
          clearable
        />
        <Select
          label={de.auditLog.person}
          placeholder={de.auditLog.all}
          data={people}
          value={filters.person || null}
          onChange={(v) => update({ person: v ?? "" })}
          searchable
          clearable
        />
        <Select
          label={de.auditLog.author}
          placeholder={de.auditLog.all}
          data={people}
          value={filters.author || null}
          onChange={(v) => update({ author: v ?? "" })}
          searchable
          clearable
        />
      </Group>
      {state.status === "loading" && (
        <Group>
          <Loader size="sm" />
          <Text>{de.loading}</Text>
        </Group>
      )}
      {state.status === "error" && (
        <Alert color="red" role="alert">
          {de.auditLog.loadError}
        </Alert>
      )}
      {state.status === "ready" &&
        (state.page.rows.length === 0 ? (
          <Text>{de.auditLog.empty}</Text>
        ) : (
          <>
            <Table.ScrollContainer minWidth={800}>
              <Table withTableBorder verticalSpacing="xs" fz="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{de.auditLog.when}</Table.Th>
                    <Table.Th>{de.auditLog.what}</Table.Th>
                    <Table.Th>{de.auditLog.by}</Table.Th>
                    <Table.Th>{de.auditLog.reason}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {state.page.rows.map((row) => (
                    <Entry key={row.id} row={row} names={names} />
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Group>
              <Button variant="default" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                {de.auditLog.previous}
              </Button>
              <Text>
                {page + 1} / {pageCount(state.page.total)}
              </Text>
              <Button
                variant="default"
                disabled={page + 1 >= pageCount(state.page.total)}
                onClick={() => setPage((p) => p + 1)}
              >
                {de.auditLog.next}
              </Button>
            </Group>
          </>
        ))}
    </Stack>
  );
}

function Entry({ row, names }: { row: AuditRow; names: ReadonlyMap<string, string> }) {
  const changes = diffRow(row, names);
  const person = row.employeeId ? (names.get(row.employeeId) ?? "Unbekannt") : null;
  return (
    <Table.Tr>
      <Table.Td>{formatTimestamp(row.changedAt)}</Table.Td>
      <Table.Td>
        <Text fw={600} size="sm">
          {ACTION_LABELS[row.action] ?? row.action} · {TABLE_LABELS[row.tableName] ?? row.tableName}
          {person ? ` · ${person}` : ""}
          {row.date ? ` · ${row.date.slice(8)}.${row.date.slice(5, 7)}.` : ""}
        </Text>
        {changes.length === 0 ? (
          <Text size="sm" c="dimmed">
            {de.auditLog.noChanges}
          </Text>
        ) : (
          changes.map((c) => (
            <Text key={c.field} size="sm">
              {c.field}: {c.before ?? "–"} → {c.after ?? "–"}
            </Text>
          ))
        )}
      </Table.Td>
      <Table.Td>
        {row.changedBy ? (names.get(row.changedBy) ?? "Unbekannt") : de.auditLog.system}
      </Table.Td>
      <Table.Td>{row.reason ?? "–"}</Table.Td>
    </Table.Tr>
  );
}
