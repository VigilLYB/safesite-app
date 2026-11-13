import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { fonts, palette, radii, space, touch } from "@/lib/theme";
import { Button, IconButton } from "../actions";
import { Icon } from "../icons";
import { Text } from "../Text";
import { isDay, MONTHS, monthGrid, parts, short, WEEKDAYS, ymd } from "./calendar";

export interface DayPickerButtonProps {
  /** What the day is for, e.g. "Milestone 1 due date". */
  label: string;
  /** "YYYY-MM-DD" or "" when not set. */
  value: string;
  open: boolean;
  onPress: () => void;
  testID?: string | undefined;
}

/**
 * The calendar control that sits at the right edge of a text box: a calendar icon, and the chosen
 * day ("12 Nov") next to it once one is picked.
 */
export function DayPickerButton({ label, value, open, onPress, testID }: DayPickerButtonProps) {
  const { handlers, ringStyle } = useFocusRing();
  const set = isDay(value);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${set ? short(value) : "not set"}`}
      accessibilityHint="Opens a calendar"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      testID={testID}
      {...handlers}
      style={({ pressed }) => [
        styles.trigger,
        set && styles.triggerSet,
        (pressed || open) && styles.triggerPressed,
        ringStyle as ViewStyle,
      ]}
    >
      <Icon name="calendar" size={16} color={set ? palette.onInk : palette.ink2} />
      {set ? (
        <Text variant="caption" style={styles.triggerText} numberOfLines={1}>
          {short(value)}
        </Text>
      ) : null}
    </Pressable>
  );
}

export interface DayCalendarProps {
  label: string;
  value: string;
  onChange: (day: string) => void;
  onClose: () => void;
  /** Today ("YYYY-MM-DD"): the calendar opens on this month and greys out earlier days. */
  today: string;
  testID?: string | undefined;
}

/** A small inline month calendar for one day (today or later), with Clear and Done. */
export function DayCalendar({ label, value, onChange, onClose, today, testID }: DayCalendarProps) {
  const [view, setView] = useState(() => parts(isDay(value) ? value : today).slice(0, 2));
  const [year, month] = view as [number, number];
  const step = (delta: number) => {
    const index = year * 12 + (month - 1) + delta;
    setView([Math.floor(index / 12), (index % 12) + 1]);
  };
  const canGoBack = ymd(year, month, 1) > ymd(...(parts(today).slice(0, 2) as [number, number]), 1);

  return (
    <View style={styles.panel} accessibilityLabel={label} testID={testID}>
      <View style={styles.monthRow}>
        <IconButton
          icon="back"
          label="Previous month"
          onPress={() => step(-1)}
          disabled={!canGoBack}
        />
        <Text variant="label" style={styles.month}>
          {MONTHS[month - 1]} {year}
        </Text>
        <IconButton icon="chevron" label="Next month" onPress={() => step(1)} />
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`h${i}`} variant="caption" tone="muted" style={styles.weekday}>
            {d}
          </Text>
        ))}
        {monthGrid(year, month).map((day, i) => {
          if (!day) return <View key={`b${i}`} style={styles.cell} />;
          const past = day < today;
          const picked = day === value;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={day}
              accessibilityState={{ selected: picked, disabled: past }}
              disabled={past}
              onPress={() => {
                onChange(day);
                onClose();
              }}
              testID={testID ? `${testID}-${day}` : undefined}
              style={styles.cell}
            >
              <View style={[styles.dayDot, picked && styles.dayPicked]}>
                <Text
                  variant="caption"
                  style={[
                    picked ? styles.dayPickedText : past ? styles.past : null,
                    day === today && !picked ? styles.todayText : null,
                  ]}
                >
                  {Number(day.slice(8))}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Button
          label="Clear"
          variant="tertiary"
          size="desk"
          disabled={!value}
          onPress={() => {
            onChange("");
            onClose();
          }}
        />
        <Button label="Done" variant="secondary" size="desk" onPress={onClose} />
      </View>
    </View>
  );
}

const CELL = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    minHeight: touch.desk - 8,
    minWidth: touch.desk - 8,
    justifyContent: "center",
    paddingHorizontal: space[2],
    borderRadius: radii.card,
  },
  triggerSet: { backgroundColor: palette.ink },
  triggerPressed: { opacity: 0.85 },
  triggerText: { color: palette.onInk, fontFamily: fonts.semibold },
  panel: {
    borderWidth: 1,
    borderColor: palette.grey300,
    borderRadius: radii.card,
    backgroundColor: palette.surface,
    padding: space[2],
    gap: space[1],
  },
  monthRow: { flexDirection: "row", alignItems: "center" },
  month: { flex: 1, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: CELL, textAlign: "center", paddingVertical: space[1] },
  cell: { width: CELL, height: 36, alignItems: "center", justifyContent: "center" },
  dayDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPicked: { backgroundColor: palette.ink },
  dayPickedText: { color: palette.onInk, fontFamily: fonts.semibold },
  todayText: { fontFamily: fonts.semibold, textDecorationLine: "underline" },
  past: { color: palette.grey400 },
  footer: { flexDirection: "row", justifyContent: "space-between" },
});
