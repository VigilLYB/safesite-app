import { render, screen } from "@testing-library/react-native";
import type { IncidentSummary } from "@/lib/api";
import { IncidentCard } from "./IncidentCard";

const base: IncidentSummary = {
  id: "11111111-1111-4111-8111-111111111111",
  version: 1,
  title: "No helmet at the press",
  category: null,
  severity: "HIGH",
  status: "OPEN",
  areaName: null,
  reporter: { id: "22222222-2222-4222-8222-222222222222", fullName: "Ravi Kumar" },
  clusterParentId: null,
  duplicateCount: 0,
  createdAt: "2026-11-13T05:00:00.000Z",
};

describe("IncidentCard PPE flag", () => {
  it("shows 'PPE missing' only for a very confident AI result", async () => {
    await render(<IncidentCard incident={{ ...base, ppeViolation: true }} onPress={() => {}} />);
    expect(screen.getByText("PPE missing")).toBeTruthy();
  });

  it("shows nothing when the result is not confident, or there is none", async () => {
    await render(<IncidentCard incident={{ ...base, ppeViolation: false }} onPress={() => {}} />);
    expect(screen.queryByText("PPE missing")).toBeNull();
    await render(<IncidentCard incident={base} onPress={() => {}} />);
    expect(screen.queryByText("PPE missing")).toBeNull();
  });
});
