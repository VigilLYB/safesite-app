import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { authBridge } from "@/lib/api";
import { jsonResponse } from "@/test-utils";
import { SessionProvider } from "../SessionProvider";
import { LoginForm } from "./LoginForm";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
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
beforeEach(() => {
  mockReplace.mockClear();
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  authBridge.setToken(null);
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
    expect(await screen.findByText("Enter your work email.")).toBeTruthy();
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
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(supervisor)"));
    expect(authBridge.getToken()).toBe("tok");
  });

  it("shows a plain message for a wrong password and keeps the person on the form", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", message: "nope" } }),
    );
    await setup();
    await fireEvent.changeText(screen.getByLabelText("Work email"), "amira@plantx.test");
    await fireEvent.changeText(screen.getByLabelText("Password"), "wrong");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Email or password is incorrect.")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(authBridge.getToken()).toBeNull();
  });
});
