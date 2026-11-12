import { useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { clock } from "@/lib/clock";
import { palette, radii, space } from "@/lib/theme";
import { Text } from "@/components/ui";

const EXPIRY_DAYS = 14;

/** The demo bucket deletes files after 14 days (guide §2.6). */
export function isMediaExpired(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  return !Number.isNaN(created) && clock.nowMs() - created > EXPIRY_DAYS * 86_400_000;
}

export interface MediaPhotoProps {
  /** A media DTO ({ key, url }) or null. */
  media: { key: string; url: string } | null;
  createdAt: string | null | undefined;
  /** Refetch the owning query once for a fresh presigned link. */
  onRefresh: () => void;
  label: string;
}

export function MediaMessage({ children }: { children: string }) {
  return (
    <View style={styles.message} accessibilityRole="text">
      <Text variant="caption" tone="muted">
        {children}
      </Text>
    </View>
  );
}

/** Shows the photo, refreshes its link once on error, then "Media unavailable" or "Media expired". */
export function MediaPhoto({ media, createdAt, onRefresh, label }: MediaPhotoProps) {
  const refreshed = useRef(false);
  const [failed, setFailed] = useState(false);
  if (!media) return null;
  if (isMediaExpired(createdAt)) {
    return <MediaMessage>Media expired (files are kept for 14 days)</MediaMessage>;
  }
  if (failed) return <MediaMessage>Media unavailable</MediaMessage>;
  return (
    <Image
      source={{ uri: media.url }}
      style={styles.photo}
      resizeMode="cover"
      accessibilityLabel={label}
      onError={() => {
        if (refreshed.current) {
          setFailed(true);
          return;
        }
        refreshed.current = true;
        onRefresh();
      }}
    />
  );
}

const styles = StyleSheet.create({
  photo: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radii.card,
    backgroundColor: palette.grey200,
  },
  message: {
    padding: space[3],
    borderRadius: radii.card,
    backgroundColor: palette.grey100,
    alignItems: "center",
  },
});
