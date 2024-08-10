import { useThemeColor } from "@/hooks/useThemeColor";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { ThemedButton } from "../ThemedButton";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";

export default function ConfirmationModal({
  title,
  content,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: {
  title: string;
  content: JSX.Element;
  confirmText?: string;
  cancelText?: string;
  onConfirm: Function;
  onCancel: Function;
}) {
  const color = useThemeColor({}, "text");
  const slide = useRef(new Animated.Value(30)).current;
  const opacity = useRef(
    slide.interpolate({ inputRange: [0, 30], outputRange: [1, 0] })
  ).current;
  useFocusEffect(
    useCallback(() => {
      Animated.timing(slide, {
        toValue: 0,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }, [])
  );
  return (
    <Animated.View
      style={{ width: "80%", transform: [{ translateY: slide }], opacity }}
    >
      <ThemedView style={styles.modalBox}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <View style={styles.contentBox}>{content}</View>
        <View style={styles.buttonGroup}>
          <ThemedButton
            style={styles.button}
            onPress={() => onCancel()}
            type="secondary"
            text={cancelText || "Cancel"}
          />
          <ThemedButton
            style={styles.button}
            onPress={() => onConfirm()}
            type="primary"
            text={confirmText || "Confirm"}
          />
        </View>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modalBox: {
    padding: 15,
    borderRadius: 10,
  },
  contentBox: {
    padding: 10,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 5,
  },
  button: {
    paddingHorizontal: 30,
  },
});
