import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button } from "./actions";
import { TextField } from "./form";

describe("Button", () => {
  it("calls onPress and exposes a button role with its name", async () => {
    const onPress = jest.fn();
    await render(<Button label="Submit report" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Submit report" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ignores presses while loading and reports itself busy", async () => {
    const onPress = jest.fn();
    await render(<Button label="Submit report" onPress={onPress} loading />);
    const button = screen.getByRole("button", { name: "Submit report" });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  it("is at least 56pt tall for gloved hands by default and 44pt in desk size", async () => {
    await render(
      <>
        <Button label="Worker" onPress={() => {}} />
        <Button label="Desk" onPress={() => {}} size="desk" />
      </>,
    );
    const heights = ["Worker", "Desk"].map((name) => {
      const style = [screen.getByRole("button", { name }).props.style].flat(3) as {
        minHeight?: number;
      }[];
      return style.find((item) => item?.minHeight)?.minHeight;
    });
    expect(heights).toEqual([56, 44]);
  });
});

describe("TextField", () => {
  it("shows a visible label and announces its error", async () => {
    await render(
      <TextField
        label="Work email"
        value=""
        onChangeText={() => {}}
        error="Enter a valid email address."
      />,
    );
    expect(screen.getByText("Work email")).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
  });

  it("forwards typing", async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Title" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText("Title"), "Leak");
    expect(onChangeText).toHaveBeenCalledWith("Leak");
  });
});
