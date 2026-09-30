import { Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" mb="lg" gap="md">
      <Stack gap={4}>
        <Title order={1}>{title}</Title>
        {description ? (
          <Text size="sm" c="dimmed" maw={640}>
            {description}
          </Text>
        ) : null}
      </Stack>
      {actions ? (
        <Group gap="xs" wrap="nowrap">
          {actions}
        </Group>
      ) : null}
    </Group>
  );
}
