import axiosAuth from "@/api/auth";
import ChangeDisplayName from "@/components/accountComponents/ChangeDisplayName";
import ChangePassword from "@/components/accountComponents/ChangePassword";
import ChangeUsername from "@/components/accountComponents/ChangeUsername";
import HeaderBar from "@/components/HeaderBar";
import Loading from "@/components/Loading";
import Oops from "@/components/Oops";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { CreateUsernameInput } from "@/components/userInfoComponents/CreateUsernameInput";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function AccountChangeHeader({ title }: { title: string }) {
  const color = useThemeColor({}, "text");
  const router = useRouter();
  return (
    <HeaderBar
      headerCenter={
        <ThemedText type="subtitle" style={{ textAlign: "center" }}>
          {title}
        </ThemedText>
      }
      headerLeft={
        <Pressable
          onPress={() => {
            router.navigate("/account");
          }}
        >
          <Ionicons name="chevron-back" color={color} size={25} />
        </Pressable>
      }
    />
  );
}

export default function AccountChange() {
  const { username, name, previousName, password } = useLocalSearchParams<{
    username: string;
    password: string;
    name: string;
    previousName: string;
  }>();

  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const handleCheckPasswordAuth = async () => {
    try {
      let response = await axiosAuth.get("/users/account/password");
      if (response.status == 200) {
        setLoading(false);
      } else {
        router.dismiss(1);
      }
    } catch (err) {
      router.dismiss(1);
    }
  };
  useEffect(() => {
    if (password) {
      handleCheckPasswordAuth();
    } else {
      setLoading(false);
    }
  }, []);

  let formMarkup = loading ? (
    <Loading />
  ) : username ? (
    <ChangeUsername previousUsername={username?.toString() || ""} />
  ) : password ? (
    <ChangePassword />
  ) : name ? (
    <ChangeDisplayName previousName={previousName} />
  ) : (
    <Oops />
  );

  let formTitle = username
    ? "Update Username"
    : password
    ? "Update Password"
    : name
    ? "Change Display Name"
    : "Oops";

  return (
    <ThemedView
      style={{
        flex: 1,
      }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <AccountChangeHeader title={formTitle} />
        {formMarkup}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "80%",
    alignSelf: "center",
  },
  textInput: {
    margin: 5,
  },
  label: {
    marginLeft: 5,
  },
  text: {
    marginLeft: 10,
  },
});
