"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import {
  CONTRACTS,
  DEPARTMENTS,
  ROLES,
  buildEmployeeArgs,
  employeeErrorMessage,
  formatDuration,
  initialEmployeeForm,
  sortEmployees,
  type EmployeeForm,
  type EmployeeRow,
} from "../lib/employeeForm.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";
import { useAuth } from "./AuthProvider.tsx";
import { EmptyState } from "./ui/EmptyState.tsx";
import { ErrorState } from "./ui/ErrorState.tsx";
import { LoadingState } from "./ui/LoadingState.tsx";
import { PageHeader } from "./ui/PageHeader.tsx";

type LoadState =
  { status: "loading" } | { status: "error" } | { status: "ready"; rows: EmployeeRow[] };

// `employee: null` = nouvelle personne.
type Dialog =
  { kind: "edit"; employee: EmployeeRow | null } | { kind: "active"; employee: EmployeeRow };

export function EmployeesView() {
  const { state: auth } = useAuth();
  const isAdmin = auth.status === "ready" && auth.role === "admin";
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from("employees").select("*");
    if (error) {
      console.error("employees", error);
      setState({ status: "error" });
      return;
    }
    setState({ status: "ready", rows: sortEmployees(data) });
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void load();
    }
  }, [isAdmin, load]);

  // La base refuse de toute façon : on masque seulement la page.
  if (!isAdmin) {
    return <ErrorState message={de.noAccessHint} />;
  }

  return (
    <Stack>
      <PageHeader
        title={de.nav.employees}
        description={de.employees.description}
        actions={
          <Button onClick={() => setDialog({ kind: "edit", employee: null })}>
            {de.employees.add}
          </Button>
        }
      />
      {state.status === "loading" && <LoadingState label={de.loading} rows={8} />}
      {state.status === "error" && <ErrorState message={de.employees.loadError} />}
      {state.status === "ready" &&
        (state.rows.length === 0 ? (
          <EmptyState title={de.employees.empty} />
        ) : (
          <Table.ScrollContainer minWidth={800}>
            <Table fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{de.employees.name}</Table.Th>
                  <Table.Th>{de.employees.department}</Table.Th>
                  <Table.Th>{de.employees.role}</Table.Th>
                  <Table.Th>{de.employees.contract}</Table.Th>
                  <Table.Th>{de.employees.soll}</Table.Th>
                  <Table.Th>{de.employees.status}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {state.rows.map((e) => (
                  <Table.Tr key={e.id} c={e.active ? undefined : "dimmed"}>
                    <Table.Td>{e.display_name}</Table.Td>
                    <Table.Td>{de.employees.departments[e.department]}</Table.Td>
                    <Table.Td>{de.employees.roles[e.role]}</Table.Td>
                    <Table.Td>
                      {e.contract === "VZ" || e.contract === "TZ"
                        ? de.employees.contracts[e.contract]
                        : e.contract}
                    </Table.Td>
                    <Table.Td>
                      {formatDuration(e.soll_min_day)} / {formatDuration(e.soll_min_month)}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={e.active ? "green" : "gray"} variant="light">
                        {e.active ? de.employees.active : de.employees.inactive}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Button
                          size="xs"
                          variant="default"
                          onClick={() => setDialog({ kind: "edit", employee: e })}
                        >
                          {de.employees.edit}
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          color={e.active ? "red" : undefined}
                          onClick={() => setDialog({ kind: "active", employee: e })}
                        >
                          {e.active ? de.employees.deactivate : de.employees.reactivate}
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ))}
      {dialog?.kind === "edit" && (
        <EditDialog
          employee={dialog.employee}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void load();
          }}
        />
      )}
      {dialog?.kind === "active" && (
        <ActiveDialog
          employee={dialog.employee}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void load();
          }}
        />
      )}
    </Stack>
  );
}

function EditDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: EmployeeRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EmployeeForm>(() => initialEmployeeForm(employee ?? undefined));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<EmployeeForm>) => setForm((f) => ({ ...f, ...patch }));
  const d = de.employees;

  async function save() {
    const built = buildEmployeeArgs(form);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setBusy(true);
    setError(null);
    // p_id est typé `string` alors que la RPC crée une personne quand il est nul.
    const { error: rpcError } = await getSupabase().rpc("save_employee", {
      p_id: employee?.id ?? (null as unknown as string),
      ...built.args,
    });
    setBusy(false);
    if (rpcError) {
      console.error("save_employee", rpcError);
      setError(employeeErrorMessage(rpcError));
      return;
    }
    onSaved();
  }

  return (
    <Modal opened onClose={onClose} title={employee ? d.editTitle : d.addTitle}>
      <Stack>
        <TextInput
          label={d.name}
          required
          value={form.displayName}
          onChange={(e) => set({ displayName: e.currentTarget.value })}
        />
        <Select
          label={d.department}
          allowDeselect={false}
          data={DEPARTMENTS.map((value) => ({ value, label: d.departments[value] }))}
          value={form.department}
          onChange={(value) => {
            const next = DEPARTMENTS.find((x) => x === value);
            if (next) {
              set({ department: next });
            }
          }}
        />
        <Select
          label={d.role}
          allowDeselect={false}
          data={ROLES.map((value) => ({ value, label: d.roles[value] }))}
          value={form.role}
          onChange={(value) => {
            const next = ROLES.find((x) => x === value);
            if (next) {
              set({ role: next });
            }
          }}
        />
        <Select
          label={d.contract}
          allowDeselect={false}
          data={CONTRACTS.map((value) => ({
            value,
            label: value === "VZ" || value === "TZ" ? d.contracts[value] : value,
          }))}
          value={form.contract}
          onChange={(value) => {
            const next = CONTRACTS.find((x) => x === value);
            if (next) {
              set({ contract: next });
            }
          }}
        />
        <Group grow>
          <TextInput
            label={d.sollDay}
            value={form.sollDay}
            onChange={(e) => set({ sollDay: e.currentTarget.value })}
          />
          <TextInput
            label={d.sollMonth}
            value={form.sollMonth}
            onChange={(e) => set({ sollMonth: e.currentTarget.value })}
          />
        </Group>
        <TextInput
          label={d.reason}
          required
          value={form.reason}
          onChange={(e) => set({ reason: e.currentTarget.value })}
        />
        <Text size="xs" c="dimmed">
          {d.description}
        </Text>
        {error && (
          <Alert color="red" role="alert">
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

function ActiveDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: EmployeeRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const d = de.employees;
  const target = !employee.active;

  async function confirm() {
    if (reason.trim() === "") {
      setError(d.reasonRequired);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: rpcError } = await getSupabase().rpc("set_employee_active", {
      p_id: employee.id,
      p_active: target,
      p_reason: reason.trim(),
    });
    setBusy(false);
    if (rpcError) {
      console.error("set_employee_active", rpcError);
      setError(employeeErrorMessage(rpcError));
      return;
    }
    onSaved();
  }

  return (
    <Modal opened onClose={onClose} title={target ? d.reactivateTitle : d.deactivateTitle}>
      <Stack>
        <Text size="sm">{employee.display_name}</Text>
        <TextInput
          label={d.reason}
          required
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
        />
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button color={target ? undefined : "red"} loading={busy} onClick={() => void confirm()}>
            {d.confirm}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
