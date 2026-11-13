import { act } from "@testing-library/react-native";
import { onlineManager } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { authBridge } from "@/lib/api";
import { queryClient } from "@/providers";
import { createFakeBackend, type FakeBackend } from "../fake-backend";
import { cleanup, fireEvent, launch, press, tapMap, waitFor, type View } from "../harness";

let be: FakeBackend;
const W = "worker@plantx.demo";
const S = "supervisor@plantx.demo";
const DAY = 24 * 60 * 60_000;

beforeEach(() => {
  be = createFakeBackend();
});
afterEach(async () => {
  onlineManager.setOnline(true);
  await cleanup();
});

const wid = () => be.userByEmail(W)!.id;

const goOffline = () => act(() => onlineManager.setOnline(false));
const goOnline = () => act(() => onlineManager.setOnline(true));

/** A backend the device cannot reach: every API call fails like a dropped connection. */
function unreachable(backend: FakeBackend): FakeBackend {
  return {
    ...backend,
    fetch: (async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch,
  };
}

async function storeSession(email: string, expiresAt: string) {
  const user = be.userByEmail(email)!;
  await SecureStore.setItemAsync(
    "safesite.session",
    JSON.stringify({ accessToken: `tok-${user.id}`, expiresAt, user }),
  );
}

/**
 * Close the app without signing out: memory goes, the device keeps its files and keychain.
 * (Like the other journeys, the old tree is left to the test's own cleanup: unmounting a router
 * tree by hand breaks the next renderRouter in this file.)
 */
function closeApp(_view: View) {
  queryClient.clear();
  authBridge.setToken(null);
}

describe("Journey: sessions survive time offline", () => {
  it("a 401 refreshes the token and repeats the call instead of signing out", async () => {
    be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: W, url: "/incidents" });
    await view.findByText("Leak");
    be.flags.failNext.push({ match: /^GET \/v1\/incidents$/, status: 401 });
    await fireEvent.press(await view.findByLabelText("Refresh"));
    await waitFor(() => expect(be.called("POST", "/v1/auth/refresh")).toHaveLength(1));
    expect(view.getPathname()).toBe("/incidents");
    expect(view.queryByTestId("login-reason")).toBeNull();
  });

  it("a session whose token ended a day ago still opens (inside the 7-day grace)", async () => {
    await storeSession(W, new Date(Date.now() - DAY).toISOString());
    const view = await launch(be, { url: "/incidents" });
    expect(await view.findByTestId("incidents-screen")).toBeTruthy();
  });

  it("a session past the grace period asks to sign in again", async () => {
    await storeSession(W, new Date(Date.now() - 8 * DAY).toISOString());
    const view = await launch(be, { url: "/incidents" });
    await waitFor(() => expect(view.getPathname()).toBe("/login"));
    expect(await view.findByTestId("login-reason")).toBeTruthy();
  });
});

describe("Journey: opening the app with no connection", () => {
  it("shows what was saved on the device, with an offline notice", async () => {
    be.seedIncident({ reporter: wid(), title: "Steam leak at P-301" });
    const first = await launch(be, { as: W, url: "/incidents" });
    await first.findByText("Steam leak at P-301");
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1_500); // the saved-reads write is debounced
    });
    closeApp(first);

    onlineManager.setOnline(false);
    const view = await launch(unreachable(be), { url: "/incidents" });
    expect(await view.findByText("Steam leak at P-301")).toBeTruthy();
    expect(await view.findByTestId("offline-banner")).toBeTruthy();
    expect(view.getPathname()).toBe("/incidents"); // not the login page, not "unavailable"
  });

  it("a different person signing in never sees the previous person's saved reads", async () => {
    be.seedIncident({ reporter: wid(), title: "Worker only" });
    const first = await launch(be, { as: W, url: "/incidents" });
    await first.findByText("Worker only");
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1_500);
    });
    await fireEvent.press(await first.findByTestId("tab-account"));
    await press(first, "sign-out");
    await waitFor(() => expect(first.getPathname()).toBe("/login"));
    closeApp(first);

    onlineManager.setOnline(false);
    await storeSession(S, "2099-01-01T00:00:00Z");
    const view = await launch(unreachable(be), { url: "/incidents" });
    await view.findByTestId("offline-banner");
    expect(view.queryByText("Worker only")).toBeNull();
  });
});

describe("Journey: reporting with no connection", () => {
  it("a report with a photo is saved on the phone, the form starts fresh, and it is sent later", async () => {
    const view = await launch(be, { as: W, url: "/report" });
    await press(view, "take-photo");
    await fireEvent.changeText(await view.findByTestId("report-title"), "Oil on stairs");

    await goOffline();
    await press(view, "report-submit");
    expect(await view.findByTestId("report-saved-offline")).toBeTruthy();
    expect(view.getByText("Oil on stairs")).toBeTruthy();
    expect(view.getByText(/With photo/)).toBeTruthy();
    expect(view.queryByText("Retry now")).toBeNull();
    // Nothing was attempted against the server while clearly offline.
    expect(be.called("POST", "/v1/uploads")).toHaveLength(0);
    expect(be.called("POST", "/v1/incidents")).toHaveLength(0);
    expect(await view.findByText(/1 change saved on this device/)).toBeTruthy();

    // "Report another" opens a clean form: the saved report cannot be edited and resent.
    await press(view, "saved-another");
    expect((await view.findByTestId("report-title")).props.value).toBe("");

    await goOnline();
    await waitFor(() => expect(be.incidents.size).toBe(1));
    const [rec] = [...be.incidents.values()];
    expect(rec?.title).toBe("Oil on stairs");
    expect(be.called("POST", "/v1/uploads")).toHaveLength(1);
    await waitFor(() => expect(view.queryByTestId("offline-queue-banner")).toBeNull());
  });
});

/** Every image URI drawn on screen. */
function imageUris(view: View): string[] {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const n = node as { props?: { source?: { uri?: unknown } }; children?: unknown };
    if (typeof n.props?.source?.uri === "string") found.push(n.props.source.uri);
    walk(n.children);
  };
  walk(view.toJSON());
  return found;
}

describe("Journey: floor plans offline", () => {
  it("the floor-plan image is downloaded after sign-in, and a pin can be placed on it offline", async () => {
    const plan = be.blueprints[0] as {
      id: string;
      imageKey: string | null;
      imageUrl: string | null;
    };
    plan.imageKey = "blueprint/m/plant-x.png";
    plan.imageUrl = "https://media.test/blueprint/m/plant-x.png?X-Amz-Expires=3600";

    const view = await launch(be, { as: W, url: "/report" });
    // Pre-loaded after sign-in: the plan's details (areas) and its image, without opening it.
    await waitFor(() =>
      expect(be.called("GET", `/v1/blueprints/${plan.id}`).length).toBeGreaterThan(0),
    );

    await goOffline();
    await fireEvent.changeText(await view.findByTestId("report-title"), "Spill by pump");
    await press(view, "place-pin");
    expect(await view.findByTestId("blueprint-offline-banner")).toBeTruthy();
    await tapMap(view, 300, 200);
    // Drawn from the copy on the device, not the expired link.
    await waitFor(() =>
      expect(imageUris(view)).toContain("memory://floor-plans/blueprint_m_plant-x.png"),
    );
    await press(view, "report-submit");
    expect(await view.findByTestId("report-saved-offline")).toBeTruthy();

    await goOnline();
    await waitFor(() => expect(be.incidents.size).toBe(1));
    const body = be.called("POST", "/v1/incidents").at(-1)?.body as { location: unknown };
    expect(body.location).toMatchObject({ blueprintId: plan.id, pin: { x: 300, y: 200 } });
  });
});

describe("Journey: changes made offline", () => {
  it("an approval is saved on the device and sent when the connection returns", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await view.findByTestId("action-approve");

    await goOffline();
    await press(view, "action-approve");
    await press(view, "note-confirm");
    await waitFor(() => expect(view.queryByTestId("note-confirm")).toBeNull());
    expect(be.called("POST", "/transitions")).toHaveLength(0);
    expect(await view.findByText(/1 change saved on this device/)).toBeTruthy();

    await goOnline();
    await waitFor(() => expect(rec.status).toBe("APPROVED"));
    expect(be.called("POST", "/transitions")[0]?.body).toEqual({
      event: "approve",
      expectedVersion: 1,
    });
    await waitFor(() => expect(view.queryByTestId("offline-queue-banner")).toBeNull());
  });

  it("if someone else changed the report first, the person decides; 'send mine anyway' rebases", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await view.findByTestId("action-approve");

    await goOffline();
    await press(view, "action-approve");
    await press(view, "note-confirm");
    be.touch(rec.id); // a colleague edits it while this phone is offline (now v2)

    await goOnline();
    expect(await view.findByText(/needs your attention/)).toBeTruthy();
    expect(rec.status).toBe("OPEN");
    await fireEvent.press(await view.findByText("Review"));
    expect(await view.findByText("Needs your decision", { exact: false })).toBeTruthy();
    await fireEvent.press(await view.findByText("Send mine anyway"));

    await waitFor(() => expect(rec.status).toBe("APPROVED"));
    const sent = be.called("POST", "/transitions").map((c) => c.body);
    expect(sent.at(-1)).toEqual({ event: "approve", expectedVersion: 2 });
  });

  it("a completed milestone shows at once offline and is sent on reconnect", async () => {
    const ACTION_ID = "00000000-0000-4000-8000-0000000000a1";
    const MS_ID = "00000000-0000-4000-8000-0000000000b1";
    const rec = be.seedIncident({ reporter: wid(), title: "Valve", status: "ACTION_ASSIGNED" });
    be.actions.set(ACTION_ID, {
      id: ACTION_ID,
      incidentId: rec.id,
      type: "PREBUILT",
      templateCode: "REPLACE_VALVE",
      title: "Replace valve",
      description: null,
      status: "OPEN",
      assigneeId: wid(),
      assignedBy: be.userByEmail(S)!.id,
      dueAt: "2026-11-20T00:00:00Z",
      completedAt: null,
      createdAt: "2026-11-12T10:00:00Z",
      milestones: [
        { id: MS_ID, seq: 1, title: "Ordered", dueAt: null, completedAt: null, completedBy: null },
      ],
    });
    const view = await launch(be, { as: W, url: `/actions/${ACTION_ID}` });
    await view.findByTestId("mark-done-1");

    await goOffline();
    await press(view, "mark-done-1");
    await press(view, "confirm-complete-yes");
    await waitFor(() => expect(view.queryByTestId("mark-done-1")).toBeNull());
    expect(be.called("POST", `/milestones/${MS_ID}/complete`)).toHaveLength(0);

    await goOnline();
    await waitFor(() => expect(be.called("POST", `/milestones/${MS_ID}/complete`)).toHaveLength(1));
  });
});
