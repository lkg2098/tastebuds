import { Text, View, Button, Image, StyleSheet, Pressable } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import LinkSettingsItem from "@/components/settingsComponents/LinkSettingsItem";
import { useThemeColor } from "@/hooks/useThemeColor";
import axiosAuth from "@/api/auth";
import React, { useCallback, useEffect, useState } from "react";
import * as SecureStorage from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function Account() {
  const router = useRouter();
  const [userData, setUserData] = useState({ username: "", name: "" });
  const tintColor = useThemeColor({}, "tint");

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
    router.dismiss(1);
    router.navigate("/login");
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
        paddingHorizontal: 20,
        paddingTop: 10,
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
          pathname: "/account/accountChange",
          params: { username: userData.username },
        }}
        content={<ThemedText interactive>{userData.username}</ThemedText>}
      />
      <LinkSettingsItem
        title="Password"
        href={{
          pathname: "/account/verifyCode",
          params: { password: "true" },
        }}
        content={<ThemedText interactive>Update password</ThemedText>}
      />
      <LinkSettingsItem
        title="Display Name"
        style={{ alignItems: "center" }}
        href={{
          pathname: "/account/accountChange",
          params: { name: "true", previousName: userData.name },
        }}
        content={<ThemedText interactive>{userData.name}</ThemedText>}
      />
      {/*<View
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
      /> */}

      <Pressable
        style={[styles.signout, { borderColor: tintColor }]}
        onPress={() => handleSignout()}
      >
        <Ionicons name="exit" color={tintColor} size={16} />
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
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 5,
    gap: 5,
    paddingHorizontal: 25,
    paddingVertical: 10,
  },
});
