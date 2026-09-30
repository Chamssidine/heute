"use client";

import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EMPTY_FORM,
  MEAL_NOTE_MAX,
  PAGE_MEALS,
  mealTotals,
  todayIso,
  validateMealForm,
  type MealFormValues,
  type PageMeal,
} from "../lib/meals.ts";
import { useRealtimeRefresh } from "../lib/realtime.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";

type Booking = { id: string; matchcode: string; label: string };
type Count = {
  booking_id: string;
  meal: string;
  total: number;
  veg: number;
  vegan: number;
  mos: number;
  note: string | null;
  allergies: unknown;
};
type Data = { bookings: Booking[]; counts: Count[] };
type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; data: Data };

async function loadDay(date: string): Promise<Data> {
  const supabase = getSupabase();
  const [bookings, counts] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, matchcode, label")
      .lte("arrival", date)
      .gte("departure", date)
      .order("matchcode"),
    supabase
      .from("meal_counts")
      .select("booking_id, meal, total, veg, vegan, mos, note, allergies")
      .eq("date", date),
  ]);
  if (bookings.error) {
    throw bookings.error;
  }
  if (counts.error) {
    throw counts.error;
  }
  return { bookings: bookings.data, counts: counts.data };
}

// Les allergies ont déjà été validées par le schéma ; affichage seul, jamais journalisé.
function allergySummary(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return "";
  }
  return Object.entries(value)
    .map(([name, n]) => `${name} ${String(n)}`)
    .join(", ");
}

function toForm(count: Count | undefined): MealFormValues {
  if (!count) {
    return EMPTY_FORM;
  }
  return {
    total: String(count.total),
    veg: String(count.veg),
    vegan: String(count.vegan),
    mos: String(count.mos),
    note: count.note ?? "",
  };
}

export function GuestMeals() {
  const [date, setDate] = useState(() => todayIso());
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const reload = useCallback(async (day: string, isCancelled: () => boolean) => {
    try {
      const data = await loadDay(day);
      if (!isCancelled()) {
        setState({ status: "ready", data });
      }
    } catch (error: unknown) {
      console.error("Gäste konnten nicht geladen werden", error);
      if (!isCancelled()) {
        setState({ status: "error" });
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void reload(date, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [date, reload]);

  useRealtimeRefresh(["bookings", "meal_counts"], () => void reload(date, () => false));

  return (
    <Stack>
      <Group>
        <Title order={2}>{de.nav.guests}</Title>
        <TextInput
          type="date"
          aria-label={de.guests.date}
          value={date}
          onChange={(e) => {
            if (e.currentTarget.value) {
              setDate(e.currentTarget.value);
            }
          }}
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
          {de.guests.loadError}
        </Alert>
      )}
      {state.status === "ready" &&
        (state.data.bookings.length === 0 ? (
          <Text>{de.guests.empty}</Text>
        ) : (
          <Day date={date} data={state.data} onSaved={() => reload(date, () => false)} />
        ))}
    </Stack>
  );
}

function Day({ date, data, onSaved }: { date: string; data: Data; onSaved: () => Promise<void> }) {
  const totals = useMemo(() => mealTotals(data.counts), [data.counts]);
  return (
    <Stack>
      <Card withBorder>
        <Title order={4}>{de.guests.totalsTitle}</Title>
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
            {PAGE_MEALS.map((meal) => (
              <Table.Tr key={meal}>
                <Table.Td>{de.guests.meals[meal]}</Table.Td>
                <Table.Td>{totals[meal].total}</Table.Td>
                <Table.Td>{totals[meal].veg}</Table.Td>
                <Table.Td>{totals[meal].vegan}</Table.Td>
                <Table.Td>{totals[meal].mos}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
      {data.bookings.map((b) => (
        <Card key={b.id} withBorder>
          <Title order={4}>
            {b.matchcode} · {b.label}
          </Title>
          <Stack gap="xs" mt="xs">
            {PAGE_MEALS.map((meal) => (
              <MealRow
                key={`${b.id}-${date}-${meal}`}
                bookingId={b.id}
                date={date}
                meal={meal}
                count={data.counts.find((c) => c.booking_id === b.id && c.meal === meal)}
                onSaved={onSaved}
              />
            ))}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

type SaveState = "idle" | "saving" | "saved" | "error";

function MealRow(props: {
  bookingId: string;
  date: string;
  meal: PageMeal;
  count: Count | undefined;
  onSaved: () => Promise<void>;
}) {
  const { bookingId, date, meal, count, onSaved } = props;
  const [form, setForm] = useState<MealFormValues>(() => toForm(count));
  const [formError, setFormError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const allergies = allergySummary(count?.allergies);

  const set = (field: keyof MealFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.currentTarget.value }));
    setSave("idle");
  };

  const submit = async () => {
    const result = validateMealForm(form);
    if (!result.ok) {
      setFormError(de.guests.errors[result.error]);
      return;
    }
    setFormError(null);
    setSave("saving");
    // allergies volontairement absentes : l'upsert conserve la valeur existante.
    const { error } = await getSupabase()
      .from("meal_counts")
      .upsert(
        { booking_id: bookingId, date, meal, ...result.value },
        { onConflict: "booking_id,date,meal" },
      );
    if (error) {
      console.error("meal_counts konnte nicht gespeichert werden", error.code);
      setSave("error");
      return;
    }
    setSave("saved");
    await onSaved();
  };

  return (
    <Stack gap={2}>
      <Group align="flex-end" wrap="wrap">
        <Text w={90} fw={600}>
          {de.guests.meals[meal]}
        </Text>
        <TextInput
          w={80}
          label={de.guests.total}
          inputMode="numeric"
          value={form.total}
          onChange={set("total")}
        />
        <TextInput
          w={80}
          label={de.guests.veg}
          inputMode="numeric"
          value={form.veg}
          onChange={set("veg")}
        />
        <TextInput
          w={80}
          label={de.guests.vegan}
          inputMode="numeric"
          value={form.vegan}
          onChange={set("vegan")}
        />
        <TextInput
          w={80}
          label={de.guests.mos}
          inputMode="numeric"
          value={form.mos}
          onChange={set("mos")}
        />
        <TextInput
          w={260}
          label={de.guests.note}
          maxLength={MEAL_NOTE_MAX}
          value={form.note}
          onChange={set("note")}
        />
        <Button onClick={() => void submit()} loading={save === "saving"}>
          {de.guests.save}
        </Button>
        {save === "saved" && <Text size="sm">{de.guests.saved}</Text>}
      </Group>
      {allergies && (
        <Text size="xs">
          {de.guests.allergies}: {allergies}
        </Text>
      )}
      {formError && (
        <Text size="sm" c="red" role="alert">
          {formError}
        </Text>
      )}
      {save === "error" && (
        <Text size="sm" c="red" role="alert">
          {de.guests.saveError}
        </Text>
      )}
    </Stack>
  );
}
