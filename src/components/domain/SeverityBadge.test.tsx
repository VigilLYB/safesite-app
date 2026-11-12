import { render, screen } from "@testing-library/react-native";
import { SeverityBadge } from "./SeverityBadge";

describe("SeverityBadge", () => {
  it.each([
    ["LOW", "Low"],
    ["MEDIUM", "Medium"],
    ["HIGH", "High"],
    ["CRITICAL", "Critical"],
  ] as const)("says %s in words, never by colour alone", async (severity, label) => {
    await render(<SeverityBadge severity={severity} />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByLabelText(`${label} severity`)).toBeTruthy();
  });
});
