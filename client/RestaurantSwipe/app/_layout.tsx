import {
  Stack,
  useGlobalSearchParams,
  useLocalSearchParams,
} from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  Button,
  Image,
  ImageBackground,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import socket from "@/utils/socket";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "@/components/ThemedText";
import * as Linking from "expo-linking";

// // Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

socket.connect();
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [loaded] = useFonts({
    JuliusSansOne: require("../assets/fonts/JuliusSansOne-Regular.ttf"),
    DancingScriptBold: require("../assets/fonts/DancingScript-Bold.ttf"),
    Playwrite: require("../assets/fonts/PlaywriteIN-Regular.ttf"),
  });

  const { meal } = useLocalSearchParams();

  let url = Linking.useURL();
  const handleUrl = (url: string) => {
    const { hostname, path, queryParams } = Linking.parse(url);
    if (path) {
      router.navigate(path);
    }
    console.log(
      `hostname: ${hostname}, path: ${path}, queryParams: ${queryParams}`
    );
  };
  useEffect(() => {
    if (url) {
      handleUrl(url);
    } else {
      console.log("NO URL");
    }
  }, [url]);

  useEffect(() => {
    socket.on("connect_error", (err) => {
      // the reason of the error, for example "xhr poll error"
      console.log("WEBSOCKET ERROR", err.message);

      // some additional description, for example the status code of the initial HTTP response
      console.log(err.description);
    });
    return () => {
      socket.off("connect_error");
    };
  }, [socket]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <Image
          source={require("../assets/images/Crave background.png")}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            backgroundColor: Colors[colorScheme ?? "light"].background,
          }}
        />
        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{
              animation: "slide_from_bottom",
              animationTypeForReplace: "push",
              contentStyle: {
                backgroundColor: Colors[colorScheme ?? "light"].background,
              },
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="createMeal"
            options={{
              presentation: "fullScreenModal",
              gestureEnabled: false,
              headerShown: false,
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="account"
            options={{
              presentation: "fullScreenModal",
              gestureEnabled: false,
              headerShown: false,
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              animation: "fade",
              animationTypeForReplace: "push",
              contentStyle: { backgroundColor: "transparent" },
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="signup"
            options={{
              animation: "fade_from_bottom",
              contentStyle: { backgroundColor: "transparent" },
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="verifyCode"
            options={{
              animation: "fade_from_bottom",
              contentStyle: { backgroundColor: "transparent" },
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="forgotPassword"
            options={{
              animation: "fade_from_bottom",
              animationTypeForReplace: "push",
              contentStyle: { backgroundColor: "transparent" },
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="forgotPasswordCode"
            options={{
              animation: "fade_from_bottom",
              animationTypeForReplace: "push",
              contentStyle: { backgroundColor: "transparent" },
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="profileInfo"
            options={{
              animation: "fade_from_bottom",
              contentStyle: { backgroundColor: "transparent" },
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="[meal]"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="match"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="matchAnim"
            options={{
              animation: "fade",
              contentStyle: { backgroundColor: "transparent" },
              headerTransparent: true,
              presentation: "containedModal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="webView"
            options={{
              contentStyle: { backgroundColor: "transparent" },
              headerTransparent: true,
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="preferences"
            options={{ presentation: "transparentModal", headerShown: false }}
          />
          <Stack.Screen
            name="modal"
            options={{
              animation: "fade",
              presentation: "transparentModal",
              headerShown: false,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
