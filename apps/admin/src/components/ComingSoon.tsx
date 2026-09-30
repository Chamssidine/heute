import { de } from "../strings/de.ts";
import { EmptyState } from "./ui/EmptyState.tsx";

export function ComingSoon({ title }: { title: string }) {
  return <EmptyState title={title} message={de.comingSoon} />;
}
