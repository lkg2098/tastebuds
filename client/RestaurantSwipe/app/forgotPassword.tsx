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
  Redirect,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import axiosAuth from "@/api/auth";
import axios, { AxiosError } from "axios";
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
import { CreatePasswordInput } from "@/components/userInfoComponents/CreatePasswordInput";
import { ThemedButton } from "@/components/ThemedButton";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { username, password } = useLocalSearchParams<{
    username: string;
    password: string;
  }>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>();

  const [input, setInput] = useState("");
  const [validated, setValidated] = useState<boolean>();

  const validatePermissions = async () => {
    try {
      let response = await axiosAuth.get("/users/account/password");
    } catch (err) {
      slideOut("./login", {});
    }
  };

  const handleResetPassword = async () => {
    try {
      let response = await axiosAuth.put("/users/account/password", {
        newPassword: input,
      });
      if (response.status == 200) {
        setValidated(true);
      } else {
        console.log("something went wrong!");
        setValidated(false);
      }
    } catch (err) {
      console.log(err);
      setValidated(false);
    }
  };

  const handleSubmitUsername = async () => {
    try {
      let response = await axiosAuth.post("/users/verifyUser", {
        username: input,
        phoneNumber: "",
      });
      setError("Invalid username");
    } catch (err: any) {
      if (err.response?.status == 401 && err.response?.data?.usernameExists) {
        console.log("Username exists");
        slideOut("./forgotPasswordCode", { username: input });
      } else {
        setError("Invalid username");
      }
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (validated) {
      timeout = setTimeout(() => {
        slideOut("./login", {});
      }, 2000);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [validated]);

  useEffect(() => {
    if (password) {
      validatePermissions();
    }
  }, []);

  const formMarkup = password ? (
    <View style={{ alignSelf: "stretch", alignItems: "center" }}>
      <ThemedText type="title" interactive style={{ paddingBottom: 20 }}>
        Reset your password
      </ThemedText>
      <View style={styles.textInput}>
        <CreatePasswordInput
          placeholder="New Password"
          setPassword={setInput}
        />
      </View>
      <ThemedButton
        style={{ width: "70%" }}
        type="primary"
        text="Reset Password"
        onPress={handleResetPassword}
      />
    </View>
  ) : username ? (
    <View style={{ alignSelf: "stretch", alignItems: "center" }}>
      <ThemedText type="title">Tell us your account username.</ThemedText>

      <ThemedTextInput
        style={styles.textInput}
        placeholder="Username"
        value={input}
        onChangeText={setInput}
      />
      <ThemedText interactive style={{ paddingBottom: 10 }}>
        {error}
      </ThemedText>
      <ThemedButton
        type="primary"
        text="Confirm"
        onPress={handleSubmitUsername}
      />
    </View>
  ) : (
    <Redirect href={"/login"} />
  );

  const fade = useRef(new Animated.Value(1)).current;

  const slideOut = (url: "./forgotPasswordCode" | "./login", params?: any) => {
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
    <Animated.View
      style={{
        flex: 1,
        opacity: fade,
      }}
    >
      <ScrollView
        keyboardDismissMode="interactive"
        contentContainerStyle={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {formMarkup}
        <DividerText subdued text="or" dividerLength={"10%"} />
        <Pressable
          onPress={() => {
            slideOut("./login", {});
          }}
        >
          <ThemedText type="defaultBold" interactive>
            Back to Login
          </ThemedText>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flavorText: {
    paddingBottom: 10,
  },
  textInput: { width: "70%", margin: 5, alignSelf: "center" },
});
