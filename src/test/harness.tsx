import { Dimensions } from "react-native";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import * as SecureStore from "expo-secure-store";
import { authBridge } from "@/lib/api";
import { setClock, systemClock } from "@/lib/clock";
import { draftStore } from "@/features/report";
import { queryClient } from "@/providers";
import { PASSWORD, type FakeBackend } from "./fake-backend";

export type View = Awaited<ReturnType<typeof renderRouter>>;

/** Start the real app on a URL, optionally already signed in as one of the seeded users. */
export async function launch(
  backend: FakeBackend | null,
  options: { as?: string; url?: string; phone?: boolean } = {},
): Promise<View> {
  // `null` = the live suites: leave the platform fetch alone and talk to the hosted API.
  if (backend) globalThis.fetch = backend.fetch;
  // Jest's default window counts as a phone; the web client is wide.
  Dimensions.set({
    window: { width: options.phone ? 390 : 1280, height: 900, scale: 1, fontScale: 1 },
  });
  if (options.as) {
    const user = backend?.userByEmail(options.as);
    if (!user) throw new Error(`no seeded user ${options.as}`);
    await SecureStore.setItemAsync(
      "safesite.session",
      JSON.stringify({ accessToken: `tok-${user.id}`, expiresAt: "2099-01-01T00:00:00Z", user }),
    );
  }
  const view = await renderRouter("./src/app", { initialUrl: options.url ?? "/" });
  // renderRouter switches Jest to fake timers. The in-memory backend resolves on microtasks, but
  // real HTTP needs the event loop: under fake timers waitFor/findBy only advance fake time, so live
  // responses never arrive. Live suites (no backend) therefore run on real timers.
  if (!backend) jest.useRealTimers();
  return view;
}

/** Reset every module-level singleton so journeys never leak into each other. */
export async function cleanup() {
  authBridge.setToken(null);
  queryClient.clear();
  draftStore.reset();
  setClock(systemClock);
  await SecureStore.deleteItemAsync("safesite.session");
}

export async function press(view: View, testID: string) {
  await fireEvent.press(await view.findByTestId(testID));
}

export async function type(view: View, label: string, text: string) {
  await fireEvent.changeText(await view.findByLabelText(label), text);
}

export async function signInThroughForm(view: View, email: string, password = PASSWORD) {
  await type(view, "Work email", email);
  await type(view, "Password", password);
  await press(view, "login-submit");
}

export const pathIs = (view: View, expected: string) =>
  waitFor(() => expect(view.getPathname()).toBe(expected));

export { act, fireEvent, waitFor, PASSWORD };

/** Jest has no layout engine: tell the floor plan how wide it is, then tap a point on it. */
export async function tapMap(view: View, x: number, y: number, scale = 0.5) {
  await fireEvent(await view.findByTestId("blueprint-canvas"), "layout", {
    nativeEvent: { layout: { width: 1000 * scale, height: 800 * scale } },
  });
  await fireEvent.press(await view.findByTestId("map-pick"), {
    nativeEvent: { locationX: x * scale, locationY: y * scale },
  });
}
