import type { IconName } from "@/components/ui";
import { StateLayout } from "./StateLayout";

export interface EmptyStateProps {
  title: string;
  message?: string | undefined;
  icon?: IconName | undefined;
  actionLabel?: string | undefined;
  onAction?: () => void;
}

export function EmptyState({
  title,
  message,
  icon = "list",
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <StateLayout
      icon={icon}
      title={title}
      message={message}
      secondary={actionLabel && onAction ? { label: actionLabel, onPress: onAction } : undefined}
    />
  );
}
