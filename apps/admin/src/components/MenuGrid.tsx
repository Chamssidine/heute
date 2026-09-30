"use client";

import { Alert, Button, Group, Loader, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import {
  currentWeekStart,
  isRlsDenied,
  menuKey,
  menuRow,
  MENU_MEALS,
  shiftWeek,
  weekDates,
  type MenuDraft,
  type MenuMeal,
} from "../lib/menu.ts";
import { getSupabase } from "../lib/supabase.ts";
import { de } from "../strings/de.ts";

type Menu = Map<string, MenuDraft>;
type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; menu: Menu };

const EMPTY_DRAFT: MenuDraft = { mainDish: "", vegVariant: "", dessert: "" };
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

async function loadWeek(weekStart: string): Promise<Menu> {
  const dates = weekDates(weekStart);
  const first = dates[0] ?? weekStart;
  const last = dates[6] ?? weekStart;
  const { data, error } = await getSupabase()
    .from("menu_items")
    .select("date, meal, main_dish, veg_variant, dessert")
    .gte("date", first)
    .lte("date", last);
  if (error) {
    throw error;
  }
  const menu: Menu = new Map();
  for (const row of data) {
    if (row.meal === "mittag" || row.meal === "abend") {
      menu.set(menuKey(row.date, row.meal), {
        mainDish: row.main_dish,
        vegVariant: row.veg_variant ?? "",
        dessert: row.dessert ?? "",
      });
    }
  }
  return menu;
}

export function MenuGrid() {
  const [weekStart, setWeekStart] = useState(() => currentWeekStart());
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    loadWeek(weekStart).then(
      (menu) => {
        if (!cancelled) {
          setState({ status: "ready", menu });
        }
      },
      (error: unknown) => {
        console.error("Speiseplan konnte nicht geladen werden", error);
        if (!cancelled) {
          setState({ status: "error" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  const dates = weekDates(weekStart);

  return (
    <Stack>
      <Group>
        <Title order={2}>{de.nav.menu}</Title>
        <Button
          variant="default"
          aria-label={de.menu.previousWeek}
          onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
        >
          ◀
        </Button>
        <Text fw={600}>
          {de.menu.week} {weekStart}
        </Text>
        <Button
          variant="default"
          aria-label={de.menu.nextWeek}
          onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
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
          {de.menu.loadError}
        </Alert>
      )}
      {state.status === "ready" && (
        <>
          {state.menu.size === 0 && <Text>{de.menu.empty}</Text>}
          <Table.ScrollContainer minWidth={800}>
            <Table withTableBorder withColumnBorders verticalSpacing="xs" fz="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th />
                  {MENU_MEALS.map((meal) => (
                    <Table.Th key={meal}>{de.menu[meal]}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {dates.map((date, i) => (
                  <Table.Tr key={date}>
                    <Table.Th>
                      {WEEKDAYS[i]} {date.slice(8)}.{date.slice(5, 7)}.
                    </Table.Th>
                    {MENU_MEALS.map((meal) => (
                      <Table.Td key={meal}>
                        <MenuCell
                          key={`${weekStart}-${menuKey(date, meal)}`}
                          date={date}
                          meal={meal}
                          initial={state.menu.get(menuKey(date, meal)) ?? EMPTY_DRAFT}
                        />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </>
      )}
    </Stack>
  );
}

type SaveState = "idle" | "saving" | "saved" | { error: string };

function MenuCell({ date, meal, initial }: { date: string; meal: MenuMeal; initial: MenuDraft }) {
  const [draft, setDraft] = useState(initial);
  const [save, setSave] = useState<SaveState>("idle");

  const update = (field: keyof MenuDraft) => (value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setSave("idle");
  };

  async function onSave() {
    if (draft.mainDish.trim() === "") {
      setSave({ error: de.menu.mainDishRequired });
      return;
    }
    setSave("saving");
    const { error } = await getSupabase()
      .from("menu_items")
      .upsert(menuRow(date, meal, draft), { onConflict: "date,meal" });
    if (error) {
      console.error("Speiseplan konnte nicht gespeichert werden", error);
      setSave({ error: isRlsDenied(error) ? de.menu.forbidden : de.menu.saveError });
      return;
    }
    setSave("saved");
  }

  return (
    <Stack gap={4}>
      <TextInput
        size="xs"
        aria-label={de.menu.mainDish}
        placeholder={de.menu.mainDish}
        value={draft.mainDish}
        onChange={(e) => update("mainDish")(e.currentTarget.value)}
      />
      <TextInput
        size="xs"
        aria-label={de.menu.vegVariant}
        placeholder={de.menu.vegVariant}
        value={draft.vegVariant}
        onChange={(e) => update("vegVariant")(e.currentTarget.value)}
      />
      <TextInput
        size="xs"
        aria-label={de.menu.dessert}
        placeholder={de.menu.dessert}
        value={draft.dessert}
        onChange={(e) => update("dessert")(e.currentTarget.value)}
      />
      <Group gap="xs">
        <Button size="compact-xs" loading={save === "saving"} onClick={onSave}>
          {de.menu.save}
        </Button>
        {save === "saved" && <Text size="xs">{de.menu.saved}</Text>}
      </Group>
      {typeof save === "object" && (
        <Text size="xs" c="red" role="alert">
          {save.error}
        </Text>
      )}
    </Stack>
  );
}
