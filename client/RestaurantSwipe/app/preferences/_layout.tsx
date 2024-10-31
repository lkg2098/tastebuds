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
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "@/components/ThemedText";
import * as Linking from "expo-linking";
import HeaderBar from "@/components/HeaderBar";
// // Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const { meal } = useLocalSearchParams();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerLeft: () => (
              <Pressable onPress={() => router.navigate("/(tabs)")}>
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={Colors[colorScheme ?? "light"].text}
                />
              </Pressable>
            ),
            headerTitle: "Your Preferences",
            headerTitleStyle: { fontSize: 20, fontWeight: "semibold" },
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: Colors[colorScheme ?? "light"].background,
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="cuisineSelection" />
        </Stack>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
