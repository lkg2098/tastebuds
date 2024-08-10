import { Text, View, Button, Image, StyleSheet, Pressable } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import LinkSettingsItem from "@/components/settingsComponents/LinkSettingsItem";
import { useThemeColor } from "@/hooks/useThemeColor";
import axiosAuth from "@/api/auth";
import React, { useCallback, useEffect, useState } from "react";
import * as SecureStorage from "expo-secure-store";

export default function Account() {
  const router = useRouter();
  const [userData, setUserData] = useState({ username: "", name: "" });

  const getUserData = async () => {
    try {
      let response = await axiosAuth.get("/users/account");
      return response.data.user;
    } catch (err) {
      return false;
    }
  };

  const handleSignout = () => {
    SecureStorage.deleteItemAsync("accessToken");
    SecureStorage.deleteItemAsync("refreshToken");
    router.navigate("../login");
  };

  useFocusEffect(
    useCallback(() => {
      getUserData()
        .then((value) => {
          console.log(value);
          setUserData({ username: value.username, name: value.name });
        })
        .catch((err) => console.log(err));
    }, [])
  );
  return (
    <ThemedView
      style={{
        flex: 1,
        alignItems: "center",
        paddingTop: 15,
        paddingHorizontal: 20,
        paddingBottom: 100,
      }}
    >
      {/* <Image
        source={require("@/assets/images/dining out.jpeg")}
        style={styles.groupImage}
      />
      <Pressable>
        <ThemedText interactive type="defaultSemiBold" style={styles.editPhoto}>
          Change profile photo
        </ThemedText>
      </Pressable> */}
      <ThemedText
        type="subtitle"
        style={{ textAlign: "left", alignSelf: "stretch" }}
      >
        Account Info
      </ThemedText>
      <LinkSettingsItem
        title="Username"
        href={{
          pathname: "../accountChange",
          params: { username: userData.username },
        }}
        content={<ThemedText interactive>{userData.username}</ThemedText>}
      />
      <LinkSettingsItem
        title="Password"
        href={{ pathname: "../accountChange", params: { password: "true" } }}
        content={<ThemedText interactive>Update password</ThemedText>}
      />
      <LinkSettingsItem
        title="Display Name"
        style={{ alignItems: "center" }}
        href=""
        content={<ThemedText interactive>{userData.name}</ThemedText>}
      />
      <View
        style={{
          borderColor: useThemeColor({}, "subduedText"),
          opacity: 0.3,
          alignSelf: "stretch",
          borderBottomWidth: 1,
          marginVertical: 10,
        }}
      ></View>
      <ThemedText
        type="subtitle"
        style={{ textAlign: "left", alignSelf: "stretch", marginTop: 20 }}
      >
        Personal Settings
      </ThemedText>
      <LinkSettingsItem
        title="Diet"
        href=""
        content={
          <ThemedText interactive>No dietary restrictions...</ThemedText>
        }
      />
      <View
        style={{
          borderColor: useThemeColor({}, "subduedText"),
          opacity: 0.3,
          alignSelf: "stretch",
          borderBottomWidth: 1,
          marginVertical: 10,
        }}
      ></View>
      <ThemedText
        type="subtitle"
        style={{ textAlign: "left", alignSelf: "stretch", marginTop: 20 }}
      >
        Support
      </ThemedText>
      <LinkSettingsItem
        title="Bug Report"
        href=""
        content={<ThemedText interactive>Got an issue?</ThemedText>}
      />
      <LinkSettingsItem
        title="Suggestions"
        href=""
        content={<ThemedText interactive>Send us a message...</ThemedText>}
      />

      <Pressable style={styles.signout} onPress={() => handleSignout()}>
        <ThemedText interactive type="defaultSemiBold">
          Sign Out
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  groupImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  editPhoto: {
    padding: 12,
    marginBottom: 10,
  },
  signout: {
    paddingVertical: 15,
  },
});
