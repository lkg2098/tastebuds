import {
  Text,
  View,
  Button,
  TextInput,
  ImageBackground,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import {
  Link,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import axiosAuth from "@/api/auth";
import axios from "axios";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import GradientButton from "@/components/GradientButton";
import DividerText from "@/components/DividerText";
import { PasswordInput } from "@/components/userInfoComponents/PasswordInput";
import PhoneInput from "react-native-phone-input";
import { ThemedPhoneInput } from "@/components/ThemedPhoneInput";
import VerifyCodeInput from "@/components/VerifyCodeInput";
import HeaderBar from "@/components/HeaderBar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerifyForgotCode() {
  const router = useRouter();

  const color = useThemeColor({}, "text");
  const [message, setMessage] = useState("");

  const verifyCode = async (code: string) => {
    try {
      let response = await axiosAuth.put("/users/account/passwordCode", {
        code,
      });
      if (response.status == 200) {
        return true;
      } else {
        console.log("something went wrong!");
        return false;
      }
      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const handleSendCode = async () => {
    try {
      let response = await axiosAuth.get("/users/account/passwordCode");
      if (response.status == 200) {
        setMessage(response.data.message);
      }
    } catch (err) {
      console.log("Could not send code");
      router.back();
    }
  };

  const fade = useRef(new Animated.Value(1)).current;

  const slideOut = (
    url: "/account" | "/account/accountChange",
    params?: any
  ) => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 175,
      useNativeDriver: true,
    }).start(() => {
      router.replace({ pathname: url, params: params });
      fade.setValue(1);
    });
  };

  return (
    <ThemedView style={{ flex: 1, alignSelf: "stretch" }}>
      <SafeAreaView style={{ flex: 1, alignSelf: "stretch" }}>
        <HeaderBar
          headerCenter={
            <ThemedText type="subtitle" style={{ textAlign: "center" }}>
              Verification Code
            </ThemedText>
          }
          headerLeft={
            <Pressable
              onPress={() => {
                router.back();
              }}
            >
              <Ionicons name="chevron-back" color={color} size={25} />
            </Pressable>
          }
        />
        <ScrollView
          keyboardDismissMode="interactive"
          contentContainerStyle={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ThemedText type="title" style={{ textAlign: "center" }}>
            {message.replace("to ", "to\n")}
          </ThemedText>
          <VerifyCodeInput
            handleNav={() =>
              slideOut("/account/accountChange", { password: true })
            }
            sendCode={handleSendCode}
            submitCode={verifyCode}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flavorText: {
    paddingBottom: 10,
  },
});
