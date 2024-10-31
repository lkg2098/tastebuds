import axiosAuth from "@/api/auth";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { CreateUsernameInput } from "@/components/userInfoComponents/CreateUsernameInput";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CreatePasswordInput } from "../userInfoComponents/CreatePasswordInput";
import { PasswordInput } from "../userInfoComponents/PasswordInput";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setnewPassword] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [errors, setErrors] = useState({
    currentPassword: "Incorrect password",
    newPassword: "New password cannot match old password.",
  });

  const handleSubmit = async () => {
    try {
      let response = await axiosAuth.put("/users/account/password", {
        newPassword,
      });
    } catch (err: any) {
      console.log(err.response.data.error);
    }
  };

  const handleCurrentPassword = (value: string) => {
    setCurrentPassword(value);
  };

  const handleNewPassword = (value: string, valid: boolean) => {
    setnewPassword(value);
    setIsValid(valid);
  };

  return (
    <ThemedView
      style={{
        flex: 1,
        padding: 20,
        paddingBottom: 30,
        justifyContent: "space-between",
      }}
    >
      <View>
        {/* <ThemedText type="defaultSemiBold" style={styles.label}>
          Current Password
        </ThemedText>
        <PasswordInput
          value={currentPassword}
          onChangeText={handleCurrentPassword}
          error={errors.currentPassword}
        /> */}
        <ThemedText
          type="defaultSemiBold"
          style={[styles.label, { paddingTop: 10 }]}
        >
          New Password
        </ThemedText>
        <CreatePasswordInput
          value={newPassword}
          setPassword={handleNewPassword}
        />
      </View>
      <ThemedButton
        style={styles.button}
        text="Update Password"
        type="primary"
        disabled={!isValid || currentPassword.length < 8}
      />
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
    marginBottom: 5,
  },
  text: {
    marginLeft: 10,
  },
});
