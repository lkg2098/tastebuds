import React, { useMemo, useState } from "react";
import { ThemedView } from "../ThemedView";
import { ThemedText } from "../ThemedText";
import { Pressable, StyleSheet, View } from "react-native";

export default function HoursCollapsible({
  hours,
  day,
}: {
  hours: Array<string>;
  day: number;
}) {
  const [open, setOpen] = useState(false);

  const dayHours = useMemo(() => {
    let dayString = hours[day];
    let dayArr = dayString.split(": ");
    return `${dayArr[1]}`;
  }, [hours, day]);
  const allHoursMarkup = useMemo(() => {
    let output = "";
    for (let i in hours) {
      output += hours[i];
      if (Number(i) != hours.length - 1) {
        output += "\n";
      }
    }
    return output;
  }, [hours]);

  return (
    <View style={styles.container}>
      <ThemedText type="secondary">Hours:</ThemedText>
      <ThemedText type="secondary">
        {open ? allHoursMarkup : dayHours}
      </ThemedText>
      <Pressable onPress={() => setOpen(!open)}>
        <ThemedText interactive type="secondary">
          {open ? "Close" : "See all hours"}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
  },
});
