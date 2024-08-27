import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Button, Pressable, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GoogleDataProvider } from "@/components/GoogleDataContext";
import { MealDataProvider } from "@/components/MealDataContext";

// // Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerRight: () => (
              <Pressable onPress={() => router.navigate("/(tabs)")}>
                <Ionicons
                  name="close"
                  size={30}
                  color={Colors[colorScheme ?? "light"].text}
                />
              </Pressable>
            ),
            headerStyle: {
              backgroundColor: Colors[colorScheme ?? "light"].background,
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{ title: "Account", headerShadowVisible: false }}
          />
          <Stack.Screen name="verifyCode" options={{ headerShown: false }} />
          <Stack.Screen name="accountChange" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
