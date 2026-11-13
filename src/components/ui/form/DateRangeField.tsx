import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { fonts, palette, radii, space, touch } from "@/lib/theme";
import { Button, IconButton } from "../actions";
import { Icon } from "../icons";
import { BottomSheet } from "../overlay";
import { Text } from "../Text";

export interface DayRangeValue {
  /** First day, inclusive, "YYYY-MM-DD" (plant time). */
  fromDay?: string | undefined;
  /** Last day, inclusive. */
  toDay?: string | undefined;
}

export interface DateRangeFieldProps {
  label: string;
  value: DayRangeValue;
  onChange: (value: DayRangeValue) => void;
  /** Today in plant time ("YYYY-MM-DD"): the calendar opens on this month and greys out the future. */
  today: string;
  testID?: string | undefined;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const parts = (ymd: string) => ymd.split("-").map(Number) as [number, number, number];
const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const shift = (day: string, days: number) => {
  const [y, m, d] = parts(day);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
};
const short = (day: string) => {
  const [, m, d] = parts(day);
  return `${d} ${MONTHS[m - 1]}`;
};

/** "Any date", "12 Nov", or "3 Nov – 12 Nov". */
export function describeRange({ fromDay, toDay }: DayRangeValue): string {
  if (!fromDay && !toDay) return "Any date";
  if (fromDay && toDay && fromDay !== toDay) return `${short(fromDay)} – ${short(toDay)}`;
  return short((fromDay ?? toDay) as string);
}

/** Monday-first grid of one month: leading blanks, then the days. */
function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  const lead = (first + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => ymd(year, month, i + 1)),
  ];
}

type End = "from" | "to";

/**
 * A compact date-range filter: one calendar button that shows the current range, opening a small
 * month calendar (like Gmail's). From and To boxes sit on top: tap one, then a day to fill it
 * (picking From moves on to To). Quick presets, Clear and Apply. Days are plant-time calendar
 * days; the future is not selectable.
 */
export function DateRangeField({ label, value, onChange, today, testID }: DateRangeFieldProps) {
  const { handlers, ringStyle } = useFocusRing();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayRangeValue>(value);
  const [editing, setEditing] = useState<End>("from");
  const [view, setView] = useState(() => parts(value.toDay ?? value.fromDay ?? today).slice(0, 2));
  const [year, month] = view as [number, number];
  const active = Boolean(value.fromDay || value.toDay);

  const openSheet = () => {
    setDraft(value);
    setEditing("from");
    setView(parts(value.toDay ?? value.fromDay ?? today).slice(0, 2));
    setOpen(true);
  };
  const pick = (day: string) => {
    const { fromDay, toDay } = draft;
    if (editing === "from") {
      setDraft({ fromDay: day, toDay: toDay && toDay < day ? undefined : toDay });
      setEditing("to");
    } else if (fromDay && day < fromDay) {
      setDraft({ fromDay: day, toDay: fromDay });
    } else {
      setDraft({ fromDay, toDay: day });
    }
  };
  const focusEnd = (end: End) => {
    setEditing(end);
    const day = end === "from" ? draft.fromDay : draft.toDay;
    if (day) setView(parts(day).slice(0, 2));
  };
  const step = (delta: number) => {
    const index = year * 12 + (month - 1) + delta;
    setView([Math.floor(index / 12), (index % 12) + 1]);
  };
  /** A single filled end is a one-day range. */
  const apply = ({ fromDay, toDay }: DayRangeValue) => {
    const one = fromDay ?? toDay;
    onChange(one ? { fromDay: fromDay ?? one, toDay: toDay ?? one } : {});
    setOpen(false);
  };
  const preset = (days: number) => apply({ fromDay: shift(today, -(days - 1)), toDay: today });
  const canGoForward =
    ymd(year, month, 1) < ymd(...(parts(today).slice(0, 2) as [number, number]), 1);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${describeRange(value)}`}
        accessibilityHint="Opens a calendar"
        onPress={openSheet}
        testID={testID}
        {...handlers}
        style={({ pressed }) => [
          styles.button,
          active && styles.buttonActive,
          pressed && { backgroundColor: palette.grey50 },
          ringStyle as ViewStyle,
        ]}
      >
        <Icon name="calendar" size={16} color={active ? palette.ink : palette.ink2} />
        <Text variant="label" style={active ? styles.on : styles.off} numberOfLines={1}>
          {describeRange(value)}
        </Text>
      </Pressable>

      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        <View style={styles.ends}>
          {(["from", "to"] as const).map((end) => {
            const day = end === "from" ? draft.fromDay : draft.toDay;
            const on = editing === end;
            return (
              <Pressable
                key={end}
                accessibilityRole="button"
                accessibilityLabel={`${end === "from" ? "From" : "To"}: ${day ? short(day) : "not set"}`}
                accessibilityHint="Then pick a day in the calendar"
                accessibilityState={{ selected: on }}
                onPress={() => focusEnd(end)}
                testID={`range-${end}`}
                style={[styles.end, on && styles.endOn]}
              >
                <Text variant="caption" tone="muted">
                  {end === "from" ? "From" : "To"}
                </Text>
                <Text variant="label" style={day ? styles.on : styles.off}>
                  {day ? short(day) : "Pick a day"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.presets}>
          {[
            ["Today", 1],
            ["Last 7 days", 7],
            ["Last 30 days", 30],
          ].map(([name, days]) => (
            <Button
              key={name}
              label={String(name)}
              variant="secondary"
              size="desk"
              onPress={() => preset(Number(days))}
              testID={`range-preset-${days}`}
            />
          ))}
        </View>
        <View style={styles.monthRow}>
          <IconButton icon="back" label="Previous month" onPress={() => step(-1)} />
          <Text variant="label" style={styles.month}>
            {MONTHS[month - 1]} {year}
          </Text>
          <IconButton
            icon="chevron"
            label="Next month"
            onPress={() => step(1)}
            disabled={!canGoForward}
          />
        </View>
        <View style={styles.grid}>
          {WEEKDAYS.map((d, i) => (
            <Text key={`h${i}`} variant="caption" tone="muted" style={styles.weekday}>
              {d}
            </Text>
          ))}
          {monthGrid(year, month).map((day, i) => {
            if (!day) return <View key={`b${i}`} style={styles.cell} />;
            const future = day > today;
            const isEnd = day === draft.fromDay || day === draft.toDay;
            const inside =
              draft.fromDay && draft.toDay ? day > draft.fromDay && day < draft.toDay : false;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={day}
                accessibilityState={{ selected: isEnd, disabled: future }}
                disabled={future}
                onPress={() => pick(day)}
                testID={`day-${day}`}
                style={[styles.cell, inside && styles.inside]}
              >
                <View style={[styles.dayDot, isEnd && styles.dayEnd]}>
                  <Text
                    variant="caption"
                    style={[
                      isEnd ? styles.dayEndText : future ? styles.future : null,
                      day === today && !isEnd ? styles.todayText : null,
                    ]}
                  >
                    {Number(day.slice(8))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption" tone="muted">
          Days are in plant time.
        </Text>
        <View style={styles.footer}>
          <Button
            label="Clear"
            variant="tertiary"
            size="desk"
            onPress={() => apply({})}
            testID="range-clear"
          />
          <Button
            label="Apply"
            size="desk"
            disabled={!draft.fromDay && !draft.toDay}
            onPress={() => apply(draft)}
            testID="range-apply"
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const CELL = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: touch.desk,
    paddingHorizontal: space[3],
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: palette.grey300,
    backgroundColor: palette.surface,
    alignSelf: "flex-start",
  },
  buttonActive: { borderColor: palette.ink },
  on: { color: palette.ink },
  off: { color: palette.ink2, fontFamily: fonts.medium },
  ends: { flexDirection: "row", gap: space[2] },
  end: {
    flex: 1,
    gap: 2,
    minHeight: touch.desk,
    justifyContent: "center",
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: palette.grey300,
    backgroundColor: palette.surface,
  },
  endOn: { borderColor: palette.ink, borderWidth: 2 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  monthRow: { flexDirection: "row", alignItems: "center", marginTop: space[2] },
  month: { flex: 1, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: CELL, textAlign: "center", paddingVertical: space[1] },
  cell: { width: CELL, height: 38, alignItems: "center", justifyContent: "center" },
  inside: { backgroundColor: palette.grey100 },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayEnd: { backgroundColor: palette.ink },
  dayEndText: { color: palette.onInk, fontFamily: fonts.semibold },
  todayText: { fontFamily: fonts.semibold, textDecorationLine: "underline" },
  future: { color: palette.grey400 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: space[2] },
});
