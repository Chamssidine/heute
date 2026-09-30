import { Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { InboxIcon } from "./StateIcons.tsx";

type Props = {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, message, icon, action }: Props) {
  return (
    <Stack align="center" gap="sm" py="xl" ta="center">
      <ThemeIcon variant="light" color="gray" size={48} radius="xl">
        {icon ?? <InboxIcon />}
      </ThemeIcon>
      <Title order={3} fz="md" fw={600}>
        {title}
      </Title>
      {message ? (
        <Text c="dimmed" fz="sm" maw={420}>
          {message}
        </Text>
      ) : null}
      {action}
    </Stack>
  );
}
