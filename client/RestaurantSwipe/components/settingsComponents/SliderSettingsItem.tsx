import { useThemeColor } from "@/hooks/useThemeColor";
import MultiSlider, {
  MultiSliderProps,
} from "@ptomasroos/react-native-multi-slider";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemedText } from "../ThemedText";

type SliderSettingsItemProps = MultiSliderProps & {
  title: string;
  content: string;
  handleValues: (values: Array<number>) => void;
  handleScroll: (val: boolean) => void;
};

export default function SliderSettingsItem({
  title,
  content,
  values,
  handleValues,
  min,
  max,
  step,
  snapped,
  handleScroll,
  ...rest
}: SliderSettingsItemProps) {
  const color = useThemeColor({}, "interactive");
  return (
    <View style={styles.item}>
      <View style={styles.header}>
        <ThemedText type="defaultMedium" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText subdued style={styles.subduedText}>
          {content}
        </ThemedText>
      </View>
      <MultiSlider
        values={values}
        min={min}
        max={max}
        step={step}
        snapped={snapped}
        customMarker={() => (
          <View style={styles.markerBox}>
            <View
              style={[styles.sliderMarker, { backgroundColor: color }]}
            ></View>
          </View>
        )}
        onValuesChange={(values) => {
          console.log(values);
          handleValues(values);
        }}
        onValuesChangeStart={() => handleScroll(false)}
        onValuesChangeFinish={() => handleScroll(true)}
        containerStyle={styles.sliderContainer}
        markerStyle={{ ...styles.sliderMarker, backgroundColor: color }}
        trackStyle={{ ...styles.sliderTrack, backgroundColor: color }}
        selectedStyle={{ ...styles.sliderSelected, backgroundColor: color }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingTop: 25,
    alignSelf: "stretch",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    flex: 1,
  },
  title: {
    width: 90,
  },
  subduedText: {
    textAlign: "right",
  },
  sliderTrack: { opacity: 0.4 },
  sliderMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 0,
    shadowOpacity: 0,
    margin: 30,
  },
  markerBox: {
    backgroundColor: "transparent",
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderSelected: { opacity: 1 },
  sliderContainer: { alignSelf: "center", paddingTop: 25 },
});
