import { Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { AlertIcon } from "./StateIcons.tsx";

type Props = {
  title?: string;
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function ErrorState({ title, message, icon, action }: Props) {
  return (
    <Stack align="center" gap="sm" py="xl" ta="center" role="alert">
      <ThemeIcon variant="light" color="red" size={48} radius="xl">
        {icon ?? <AlertIcon />}
      </ThemeIcon>
      {title ? (
        <Title order={3} fz="md" fw={600}>
          {title}
        </Title>
      ) : null}
      <Text c="dimmed" fz="sm" maw={420}>
        {message}
      </Text>
      {action}
    </Stack>
  );
}
