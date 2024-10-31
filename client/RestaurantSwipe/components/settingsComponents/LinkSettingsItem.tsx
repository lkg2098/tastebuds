import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { LinkProps } from "expo-router/build/link/Link";
import React, { FunctionComponent, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ThemedText } from "../ThemedText";

export type LinkSettingsItemProps = LinkProps<string> & {
  title: string;
  content: ReactNode;
};

export default function LinkSettingsItem({
  href,
  title,
  content,
  style,
  ...rest
}: LinkSettingsItemProps) {
  const iconColor = useThemeColor({}, "subduedText");
  return (
    <Link href={href} asChild>
      <Pressable style={styles.item}>
        <View style={[styles.content, style]}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {content}
        </View>
        <Ionicons name="chevron-forward" size={14} color={iconColor} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 15,
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "row",
    alignSelf: "stretch",
    alignItems: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 15,
    width: "60%",
  },
  title: {
    width: "45%",
  },
});
