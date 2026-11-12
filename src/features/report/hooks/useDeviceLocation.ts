import { useEffect, useState } from "react";
import * as Location from "expo-location";

export type GpsState =
  | { status: "pending" }
  | { status: "ok"; lat: number; lng: number; accuracyM: number | undefined }
  | { status: "unavailable" };

const TIMEOUT_MS = 10_000;
const MAX_AGE_MS = 30_000;

/**
 * GPS as soon as the page opens (high accuracy, 10 s timeout, a fix up to 30 s old is fine).
 * Denial or a timeout is a state, never an error: it must not block a report (guide §4.2).
 */
export function useDeviceLocation(): GpsState {
  const [state, setState] = useState<GpsState>({ status: "pending" });
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) throw new Error("denied");
        const recent = await Location.getLastKnownPositionAsync({ maxAge: MAX_AGE_MS });
        const position =
          recent ??
          (await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS),
            ),
          ]));
        if (active) {
          setState({
            status: "ok",
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy ?? undefined,
          });
        }
      } catch {
        if (active) setState({ status: "unavailable" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return state;
}
