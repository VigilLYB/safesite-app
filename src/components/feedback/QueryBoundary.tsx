import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { InlineNotice } from "./InlineNotice";
import { ListSkeleton } from "./Skeleton";

export interface QueryBoundaryProps<T> {
  query: Pick<UseQueryResult<T>, "data" | "error" | "isPending" | "isError" | "refetch">;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode | undefined;
  skeleton?: ReactNode | undefined;
}

/**
 * One consistent loading / empty / error treatment.
 * A failed background refetch keeps the stale data on screen with a slim notice.
 */
export function QueryBoundary<T>({
  query,
  children,
  isEmpty,
  empty,
  skeleton,
}: QueryBoundaryProps<T>) {
  const { data, error, isPending, isError, refetch } = query;

  if (data === undefined) {
    if (isPending) return <>{skeleton ?? <ListSkeleton />}</>;
    if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
    return null;
  }
  if (isEmpty?.(data)) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return (
    <>
      {isError ? <InlineNotice message="Couldn't refresh. Showing the last saved data." /> : null}
      {children(data)}
    </>
  );
}
