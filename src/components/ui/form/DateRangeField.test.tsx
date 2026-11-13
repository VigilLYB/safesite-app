import { fireEvent, render, screen } from "@testing-library/react-native";
import { DateRangeField, describeRange } from "./DateRangeField";

const TODAY = "2026-11-12";
const setup = async (value = {}) => {
  const onChange = jest.fn();
  await render(
    <DateRangeField
      label="Reported between"
      value={value}
      today={TODAY}
      onChange={onChange}
      testID="dates"
    />,
  );
  await fireEvent.press(screen.getByTestId("dates"));
  return onChange;
};

describe("DateRangeField", () => {
  it("describes a range in short plant-time days", () => {
    expect(describeRange({})).toBe("Any date");
    expect(describeRange({ fromDay: "2026-11-03", toDay: "2026-11-03" })).toBe("3 Nov");
    expect(describeRange({ fromDay: "2026-11-03", toDay: "2026-11-10" })).toBe("3 Nov – 10 Nov");
  });

  it("picks a first then a last day and applies them", async () => {
    const onChange = await setup();
    await fireEvent.press(screen.getByTestId("day-2026-11-03"));
    await fireEvent.press(screen.getByTestId("day-2026-11-10"));
    await fireEvent.press(screen.getByTestId("range-apply"));
    expect(onChange).toHaveBeenCalledWith({ fromDay: "2026-11-03", toDay: "2026-11-10" });
  });

  it("tapping the last day first still gives an ordered range", async () => {
    const onChange = await setup();
    await fireEvent.press(screen.getByTestId("day-2026-11-10"));
    await fireEvent.press(screen.getByTestId("day-2026-11-03"));
    await fireEvent.press(screen.getByTestId("range-apply"));
    expect(onChange).toHaveBeenCalledWith({ fromDay: "2026-11-03", toDay: "2026-11-10" });
  });

  it("a single tapped day becomes a one-day range", async () => {
    const onChange = await setup();
    await fireEvent.press(screen.getByTestId("day-2026-11-05"));
    await fireEvent.press(screen.getByTestId("range-apply"));
    expect(onChange).toHaveBeenCalledWith({ fromDay: "2026-11-05", toDay: "2026-11-05" });
  });

  it("presets and clear", async () => {
    const onChange = await setup({ fromDay: "2026-11-01", toDay: "2026-11-02" });
    await fireEvent.press(screen.getByTestId("range-preset-7"));
    expect(onChange).toHaveBeenLastCalledWith({ fromDay: "2026-11-06", toDay: TODAY });
    await fireEvent.press(screen.getByTestId("dates"));
    await fireEvent.press(screen.getByTestId("range-clear"));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("From and To boxes pick which end the next tapped day fills", async () => {
    const onChange = await setup({ fromDay: "2026-11-01", toDay: "2026-11-05" });
    await fireEvent.press(screen.getByTestId("range-to"));
    await fireEvent.press(screen.getByTestId("day-2026-11-09"));
    await fireEvent.press(screen.getByTestId("range-apply"));
    expect(onChange).toHaveBeenLastCalledWith({ fromDay: "2026-11-01", toDay: "2026-11-09" });
  });

  it("only a To day becomes a one-day range", async () => {
    const onChange = await setup();
    await fireEvent.press(screen.getByTestId("range-to"));
    await fireEvent.press(screen.getByTestId("day-2026-11-07"));
    await fireEvent.press(screen.getByTestId("range-apply"));
    expect(onChange).toHaveBeenCalledWith({ fromDay: "2026-11-07", toDay: "2026-11-07" });
  });

  it("days after today can't be chosen", async () => {
    await setup();
    expect(screen.getByTestId("day-2026-11-13").props.accessibilityState?.disabled).toBe(true);
  });
});
