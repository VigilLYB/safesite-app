import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { actionsApi, incidentsApi, type Role } from "@/lib/api";
import {
  buildStaffAlerts,
  buildWorkerAlerts,
  rememberSeen,
  unreadAlerts,
  type AppAlert,
} from "../lib/build-alerts";
import { isSeenLoaded, loadSeen, setSeen, useSeenAlerts } from "../lib/seen-store";

const REFRESH_MS = 60_000;
/** Detail calls are bounded: only a worker's few newest changed reports are opened for alerts. */
const WORKER_DETAIL_LIMIT = 5;

export const alertKeys = {
  all: ["alerts"] as const,
  feed: (id: string) => ["alerts", id] as const,
};

async function fetchFeed(userId: string, role: Role, signal?: AbortSignal): Promise<AppAlert[]> {
  if (role === "WORKER") {
    const [mine, myActions] = await Promise.all([
      incidentsApi.list({ limit: 20 }, signal),
      actionsApi.list({ mine: true, status: "OPEN,IN_PROGRESS", limit: 20 }, signal),
    ]);
    const changed = mine.items.filter((item) => item.version > 1).slice(0, WORKER_DETAIL_LIMIT);
    const reports = await Promise.all(changed.map((item) => incidentsApi.get(item.id, signal)));
    return buildWorkerAlerts({ userId, reports, myActions });
  }
  const [waiting, resolved, overdue] = await Promise.all([
    incidentsApi.list({ status: "OPEN", rootsOnly: true, limit: 10 }, signal),
    role === "MANAGER"
      ? incidentsApi.list({ status: "RESOLVED", limit: 10 }, signal)
      : Promise.resolve({ items: [], pageInfo: { nextCursor: null } }),
    actionsApi.list({ overdue: true, limit: 10 }, signal),
  ]);
  return buildStaffAlerts({
    role,
    waiting: waiting.items,
    resolved: resolved.items,
    overdueActions: overdue,
  });
}

/** The alerts feed for the signed-in person, refreshed every minute, with unread tracking. */
export function useAlerts(user: { id: string; role: Role } | null) {
  const userId = user?.id;
  const seen = useSeenAlerts(userId);
  useEffect(() => {
    if (userId) void loadSeen(userId);
  }, [userId]);

  const query = useQuery({
    queryKey: alertKeys.feed(userId ?? "none"),
    queryFn: ({ signal }) => fetchFeed(user!.id, user!.role, signal),
    enabled: Boolean(user),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    staleTime: 20_000,
  });

  const alerts = useMemo(() => query.data ?? [], [query.data]);
  const loaded = userId ? isSeenLoaded(userId) : false;
  // Until the saved read-state is loaded, claim nothing is unread (no flash of a stale badge).
  const unread = useMemo(() => (loaded ? unreadAlerts(alerts, seen) : []), [loaded, alerts, seen]);

  const markAllRead = useCallback(() => {
    if (userId) setSeen(userId, rememberSeen(seen, alerts));
  }, [userId, seen, alerts]);

  return { ...query, alerts, unread, unreadCount: unread.length, markAllRead };
}
