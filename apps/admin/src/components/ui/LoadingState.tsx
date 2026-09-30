import { Skeleton, Stack, VisuallyHidden } from "@mantine/core";

type Props = {
  label: string;
  rows?: number;
};

export function LoadingState({ label, rows = 4 }: Props) {
  return (
    <Stack gap="sm" role="status" aria-busy="true">
      <VisuallyHidden>{label}</VisuallyHidden>
      <Skeleton height={24} width="30%" aria-hidden="true" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={32} aria-hidden="true" />
      ))}
    </Stack>
  );
}
