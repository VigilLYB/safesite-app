import { screen } from "@testing-library/react-native";
import { SessionProvider } from "@/features/auth";
import { jsonResponse, renderWithQuery } from "@/test-utils";
import { WorkerHomeScreen } from "./WorkerHomeScreen";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => false,
    back: jest.fn(),
  }),
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const summary = {
  id: "3f1c2a9e-6d7b-4b8a-9f0e-1a2b3c4d5e6f",
  version: 1,
  title: "Corroded valve on line 7",
  category: null,
  severity: "CRITICAL",
  status: "OPEN",
  areaName: "Unit 3 pump bay",
  reporter: { id: "u1", fullName: "Amira Haddad" },
  clusterParentId: null,
  duplicateCount: 2,
  createdAt: "2026-11-12T08:30:00Z",
};

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("WorkerHomeScreen", () => {
  it("shows the big action and the worker's own reports with severity in words", async () => {
    fetchMock.mockReturnValue(
      jsonResponse(200, { items: [summary], pageInfo: { nextCursor: null } }),
    );
    await renderWithQuery(
      <SessionProvider>
        <WorkerHomeScreen />
      </SessionProvider>,
    );
    expect(screen.getByRole("button", { name: "Report a hazard" })).toBeTruthy();
    expect(await screen.findByText("Corroded valve on line 7")).toBeTruthy();
    expect(screen.getByLabelText("Critical severity")).toBeTruthy();
    expect(screen.getByText("2 duplicates")).toBeTruthy();
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("mine=true");
  });

  it("explains an empty list instead of showing a blank screen", async () => {
    fetchMock.mockReturnValue(jsonResponse(200, { items: [], pageInfo: { nextCursor: null } }));
    await renderWithQuery(
      <SessionProvider>
        <WorkerHomeScreen />
      </SessionProvider>,
    );
    expect(await screen.findByText("No reports yet")).toBeTruthy();
  });

  it("offers a retry when the server is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    await renderWithQuery(
      <SessionProvider>
        <WorkerHomeScreen />
      </SessionProvider>,
    );
    expect(await screen.findByText("Can't reach the server")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
