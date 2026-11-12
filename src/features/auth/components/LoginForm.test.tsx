import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { authBridge } from "@/lib/api";
import { jsonResponse } from "@/test-utils";
import { SessionProvider } from "../SessionProvider";
import { LoginForm } from "./LoginForm";

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

const user = {
  id: "u1",
  email: "amira@plantx.test",
  fullName: "Amira Haddad",
  role: "SUPERVISOR",
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
};

let fetchMock: jest.Mock;
beforeEach(async () => {
  await SecureStore.deleteItemAsync("safesite.session"); // a previous test signed in
  mockReplace.mockClear();
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  authBridge.setToken(null);
  mockParams = {};
});

const setup = () =>
  render(
    <SessionProvider>
      <LoginForm />
    </SessionProvider>,
  );

describe("LoginForm", () => {
  it("validates before calling the server", async () => {
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your email.")).toBeTruthy();
    expect(screen.getByText("Enter your password.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs in and lands each role in its own home", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse(200, {
        accessToken: "tok",
        tokenType: "Bearer",
        expiresAt: "2099-01-01T00:00:00Z",
        user,
      }),
    );
    await setup();
    await fireEvent.changeText(screen.getByLabelText("Work email"), "amira@plantx.test");
    await fireEvent.changeText(screen.getByLabelText("Password"), "correct horse");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/incidents?tab=triage"));
    expect(authBridge.getToken()).toBe("tok");
  });

  it.each([
    ["/actions", "/actions"],
    ["//evil.example", "/incidents?tab=triage"],
  ])("next=%s lands on %s", async (next, expected) => {
    mockParams = { next };
    fetchMock.mockReturnValueOnce(
      jsonResponse(200, {
        accessToken: "tok",
        tokenType: "Bearer",
        expiresAt: "2099-01-01T00:00:00Z",
        user,
      }),
    );
    await setup();
    await fireEvent.changeText(screen.getByLabelText("Work email"), "amira@plantx.test");
    await fireEvent.changeText(screen.getByLabelText("Password"), "correct horse");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(expected));
  });

  it("shows a plain message for a wrong password and keeps the person on the form", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", message: "nope" } }),
    );
    await setup();
    await fireEvent.changeText(screen.getByLabelText("Work email"), "amira@plantx.test");
    await fireEvent.changeText(screen.getByLabelText("Password"), "wrong");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Invalid email or password")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(authBridge.getToken()).toBeNull();
  });
});
