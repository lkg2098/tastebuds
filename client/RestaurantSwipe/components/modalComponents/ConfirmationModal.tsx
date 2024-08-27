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
      style={{ width: "90%", transform: [{ translateY: slide }], opacity }}
    >
      <ThemedView style={styles.modalBox}>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        <View style={styles.contentBox}>{content}</View>
      </ThemedView>
      <ThemedView style={styles.buttonGroup}>
        <ThemedButton
          style={[
            styles.button,
            { borderWidth: 0, borderTopWidth: 1, borderBottomRightRadius: 0 },
          ]}
          onPress={() => onCancel()}
          type="secondary"
          text={cancelText || "Cancel"}
        />
        <ThemedButton
          style={[styles.button, { borderBottomLeftRadius: 0 }]}
          onPress={() => onConfirm()}
          type="primary"
          text={confirmText || "Confirm"}
        />
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modalBox: {
    padding: 15,
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
  },
  title: { padding: 5 },
  contentBox: {
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  buttonGroup: {
    flexDirection: "row",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  button: {
    paddingHorizontal: 30,
    padding: 10,
    margin: 0,
    width: "50%",
    borderTopRightRadius: 0,
    borderTopLeftRadius: 0,
  },
});
