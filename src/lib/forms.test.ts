import { act, renderHook } from "@testing-library/react-native";
import { z } from "zod";
import { useZodForm } from "./forms";

const schema = z.object({ email: z.email("Bad email"), name: z.string().min(1, "Required") });
const initial = { email: "", name: "" };

describe("useZodForm", () => {
  it("returns parsed values when valid and null with per-field errors when not", async () => {
    const { result } = await renderHook(() => useZodForm(schema, initial));
    let parsed: unknown;
    await act(async () => {
      parsed = result.current.validate();
    });
    expect(parsed).toBeNull();
    expect(result.current.errors).toEqual({ email: "Bad email", name: "Required" });

    await act(async () => {
      result.current.set("email", "a@b.co");
      result.current.set("name", "Amira");
    });
    expect(result.current.errors).toEqual({ email: undefined, name: undefined });
    await act(async () => {
      parsed = result.current.validate();
    });
    expect(parsed).toEqual({ email: "a@b.co", name: "Amira" });
  });
});
