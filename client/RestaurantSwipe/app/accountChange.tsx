import axiosAuth from "@/api/auth";
import ChangePassword from "@/components/accountComponents/ChangePassword";
import ChangeUsername from "@/components/accountComponents/ChangeUsername";
import Oops from "@/components/Oops";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { CreateUsernameInput } from "@/components/userInfoComponents/CreateUsernameInput";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function AccountChange() {
  const { username, name, password } = useLocalSearchParams();

  if (username) {
    return (
      <ThemedView
        style={{
          flex: 1,
        }}
      >
        <ThemedText
          type="subtitle"
          style={{ textAlign: "center", paddingTop: 20 }}
        >
          Update Username
        </ThemedText>
        <ChangeUsername previousUsername={username?.toString() || ""} />
      </ThemedView>
    );
  } else if (password) {
    return (
      <ThemedView
        style={{
          flex: 1,
        }}
      >
        <ThemedText
          type="subtitle"
          style={{ textAlign: "center", paddingTop: 20 }}
        >
          Update Password
        </ThemedText>
        <ChangePassword />
      </ThemedView>
    );
  } else {
    return <Oops />;
  }
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
