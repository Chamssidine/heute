import { Stack, Text, Title } from "@mantine/core";
import { de } from "../strings/de.ts";

export function ComingSoon({ title }: { title: string }) {
  return (
    <Stack>
      <Title order={2}>{title}</Title>
      <Text>{de.comingSoon}</Text>
    </Stack>
  );
}
