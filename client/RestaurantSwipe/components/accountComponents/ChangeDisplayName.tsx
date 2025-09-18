import axiosAuth from "@/api/auth";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { CreateUsernameInput } from "@/components/userInfoComponents/CreateUsernameInput";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";

export default function ChangeDisplayName({
  previousName,
}: {
  previousName?: string;
}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState<string>(previousName || "");
  const [isValid, setIsValid] = useState(true);

  const handleSubmit = async () => {
    if (inputValue != previousName) {
      try {
        let response = await axiosAuth.put("/users/account", {
          name: inputValue,
        });
        if (response.status == 200) {
          setTimeout(() => {
            router.dismiss(1);
          }, 200);
          console.log("succesfully changed display name");
        } else {
          console.log("something went wrong");
        }
      } catch (err) {
        console.log(err);
      }
    } else {
      router.dismiss(1);
    }
  };

  const handleName = (value: string) => {
    setInputValue(value);
  };

  const handleValid = (valid: boolean) => {
    setIsValid(valid);
  };

  useEffect(() => {
    if (previousName) {
      setInputValue(previousName.toString());
    }
  }, [previousName]);
  return (
    <ScrollView
      keyboardDismissMode="interactive"
      contentContainerStyle={{
        flex: 1,
        padding: 20,
        paddingBottom: "5%",
        justifyContent: "space-between",
      }}
    >
      <View>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Name
        </ThemedText>
        <ThemedTextInput
          value={inputValue}
          onChangeText={handleName}
          testID="display-name-input"
        />
      </View>
      <ThemedButton
        style={styles.button}
        text="Update Username"
        type="primary"
        testID="display-name-submit"
        disabled={inputValue == "" || inputValue == previousName}
        onPress={() => handleSubmit()}
      />
    </ScrollView>
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
