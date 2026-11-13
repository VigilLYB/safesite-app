import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";
import { clock } from "@/lib/clock";
import { offlineFiles, type OfflineFiles } from "./files";

/**
 * Saves what the person has looked at (reports, actions, floor plans, analytics) to the device,
 * so the app opens with data when there is no signal. One file per person; it is deleted on sign
 * out because plant devices are shared.
 */
const DIR = "query-cache";
/** Bump when a schema change makes old saved data unreadable. */
const BUSTER = "1";
/** Saved data older than this is not shown. */
export const MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const WRITE_DELAY_MS = 1_000;

interface SavedCache {
  buster: string;
  userId: string;
  savedAt: number;
  state: DehydratedState;
}

const fileFor = (userId: string) => [DIR, `${userId}.json`];

/** Only finished, successful reads. Files (CSV export) and in-flight data stay out. */
function shouldSave(query: Query): boolean {
  return query.state.status === "success" && query.queryKey[0] !== "health";
}

/** Loads the person's saved data into the cache. Drops anything left by other people. */
export async function restoreQueryCache(
  queryClient: QueryClient,
  userId: string,
  files: OfflineFiles = offlineFiles,
): Promise<void> {
  try {
    for (const name of await files.list([DIR])) {
      if (name !== `${userId}.json`) await files.remove([DIR, name]);
    }
    const raw = await files.readText(fileFor(userId));
    if (!raw) return;
    const saved = JSON.parse(raw) as SavedCache;
    if (
      saved.buster !== BUSTER ||
      saved.userId !== userId ||
      clock.nowMs() - saved.savedAt > MAX_AGE_MS
    ) {
      await files.remove(fileFor(userId));
      return;
    }
    hydrate(queryClient, saved.state);
  } catch {
    // Unreadable saved data is not worth a crash: start empty and overwrite it on the next save.
  }
}

/** Saves the cache (debounced) whenever a read succeeds. Returns a stop function. */
export function persistQueryCache(
  queryClient: QueryClient,
  userId: string,
  files: OfflineFiles = offlineFiles,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  const save = async () => {
    timer = null;
    if (stopped) return;
    const saved: SavedCache = {
      buster: BUSTER,
      userId,
      savedAt: clock.nowMs(),
      state: dehydrate(queryClient, { shouldDehydrateQuery: shouldSave }),
    };
    try {
      await files.writeText(fileFor(userId), JSON.stringify(saved));
    } catch {
      // Full disk or similar: the app still works online.
    }
  };
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;
    if (timer === null) timer = setTimeout(() => void save(), WRITE_DELAY_MS);
  });
  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    unsubscribe();
  };
}

/** Sign out, or a session too old to resume: nothing of the person's reads stays on the device. */
export async function clearQueryCache(files: OfflineFiles = offlineFiles): Promise<void> {
  try {
    await files.remove([DIR]);
  } catch {
    // Already gone.
  }
}
