import { useState } from "react";
import { Banner } from "@/components/feedback";
import { useIsOnline } from "@/lib/offline/network";
import { useOfflineFloorPlans } from "@/features/blueprints";
import { useSync } from "../hooks/useSync";
import { OutboxSheet } from "./OutboxSheet";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Offline and outbox banners for the signed-in shell. Mount once: it also runs the sync
 * (at launch, when the connection returns, and when something is queued).
 */
export function SyncBanners({ userId }: { userId: string }) {
  const online = useIsOnline();
  const sync = useSync(userId);
  useOfflineFloorPlans(userId);
  const [open, setOpen] = useState(false);

  const outboxMessage =
    sync.attention > 0
      ? `${plural(sync.attention, "saved change needs", "saved changes need")} your attention.`
      : sync.waiting > 0
        ? `${plural(sync.waiting, "change", "changes")} saved on this device${online ? " — sending now." : ", sent when you're back online."}`
        : null;

  return (
    <>
      {!online ? (
        <Banner
          icon="wifi"
          message="You're offline. You're seeing what was saved on this device; new reports and changes are kept and sent later."
          testID="offline-banner"
        />
      ) : null}
      {outboxMessage ? (
        <Banner
          icon={sync.attention > 0 ? "warn" : "history"}
          message={outboxMessage}
          actionLabel="Review"
          onAction={() => setOpen(true)}
          testID="offline-queue-banner"
        />
      ) : null}
      <OutboxSheet visible={open} onClose={() => setOpen(false)} sync={sync} />
    </>
  );
}
