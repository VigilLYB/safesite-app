import { render, screen } from "@testing-library/react-native";
import { SeverityBadge } from "./SeverityBadge";

describe("SeverityBadge", () => {
  it.each([
    ["LOW", "Low", 1],
    ["MEDIUM", "Medium", 2],
    ["HIGH", "High", 3],
    ["CRITICAL", "Critical", 4],
  ] as const)(
    "shows %s as filled columns and names it for screen readers",
    async (severity, label, on) => {
      await render(<SeverityBadge severity={severity} />);
      expect(screen.getByLabelText(`${label} severity`)).toBeTruthy();
      // Never colour alone: the number of filled columns carries the level too.
      expect(screen.getAllByTestId("severity-column-on")).toHaveLength(on);
      expect(screen.queryAllByTestId("severity-column-off")).toHaveLength(4 - on);
    },
  );
});
