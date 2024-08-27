import {
  Text,
  View,
  Button,
  Pressable,
  ImageSourcePropType,
  StyleSheet,
} from "react-native";
import {
  Link,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import UserSearch from "@/components/UserSearch";
import GuestList from "@/components/GuestList";
import { useCallback, useContext, useEffect, useState } from "react";
import axiosAuth from "@/api/auth";
import { LinearGradient } from "expo-linear-gradient";
import GradientButton from "@/components/GradientButton";
import { MealDataContext } from "@/components/MealDataContext";
import Oops from "@/components/Oops";
import { Guest } from "@/types/Guest";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";
import HeaderBar from "@/components/HeaderBar";
import { SafeAreaView } from "react-native-safe-area-context";
import Loading from "@/components/Loading";

export default function AddUsers() {
  const router = useRouter();
  const { mealId, action } = useLocalSearchParams<{
    mealId: string;
    action: "create" | "edit" | "view";
    deleted: "yes";
  }>();
  const mealContext = useContext(MealDataContext);
  const [loading, setLoading] = useState(true);
  const [oldGuests, setOldGuests] = useState<Guest[]>();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [searching, setSearching] = useState(false);
  const color = useThemeColor({}, "text");

  const handleSearching = (value: boolean) => {
    setSearching(value);
  };
  const addGuest = async (guest: Guest) => {
    try {
      let response = await axiosAuth.post(`/meals/${mealId}/members/new`, {
        user_id: guest.user_id,
        role: "guest",
      });
      if ((response.status = 200)) {
        setGuests((prev) => [...prev, guest]);
      } else {
        console.log(response);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleDelete = (userId: string) => {
    console.log("deleting");
    router.navigate({
      pathname: "/modal",
      params: { type: "member", mealId: mealId, userId: userId },
    });
  };

  const getMealMembers = async () => {
    try {
      let response = await axiosAuth.get(`/meals/${mealId}/members`);
      if (response.status == 200) {
        setGuests(response.data.members);
      }
      if (loading) setLoading(false);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    mealContext?.setMealData({
      ...mealContext.mealData,
      members: guests.map((guest) => {
        if (guest.name) {
          return guest.name;
        }
        return guest.username;
      }),
      member_ids: guests.map((guest) => Number(guest.user_id)),
    });
  }, [guests]);

  useFocusEffect(
    useCallback(() => {
      console.log(mealContext?.mealData);
      getMealMembers();
    }, [])
  );

  useEffect(() => {
    console.log(guests);
  }, [guests]);

  if (loading) {
    return (
      <ThemedView
        style={{
          flex: 1,
          alignItems: "center",
        }}
      >
        <SafeAreaView
          style={{
            flex: 1,
            alignSelf: "stretch",
          }}
        >
          <HeaderBar
            headerLeft={
              <Pressable onPress={() => router.dismiss(1)}>
                <Ionicons name="chevron-back" color={color} size={18} />
              </Pressable>
            }
            headerCenter={
              <ThemedText type="defaultSemiBold">
                {action != "view" ? "Invite Guests" : "Guests"}
              </ThemedText>
            }
            headerRight={
              searching && (
                <Pressable onPress={() => setSearching(false)}>
                  <ThemedText interactive>Cancel</ThemedText>
                </Pressable>
              )
            }
          />
          <Loading />
        </SafeAreaView>
      </ThemedView>
    );
  } else if (mealContext) {
    return (
      <ThemedView
        style={{
          flex: 1,
          alignItems: "center",
        }}
      >
        <SafeAreaView
          style={{
            flex: 1,
            alignSelf: "stretch",
          }}
        >
          <HeaderBar
            headerLeft={
              <Pressable onPress={() => router.dismiss(1)}>
                <Ionicons name="chevron-back" color={color} size={18} />
              </Pressable>
            }
            headerCenter={
              <ThemedText type="defaultSemiBold">
                {action != "view" ? "Invite Guests" : "Guests"}
              </ThemedText>
            }
            headerRight={
              searching && (
                <Pressable onPress={() => setSearching(false)}>
                  <ThemedText interactive>Cancel</ThemedText>
                </Pressable>
              )
            }
          />

          {(action == "create" || action == "edit") && (
            <UserSearch
              focused={searching}
              handleFocused={handleSearching}
              handleUsers={addGuest}
            />
          )}
          {!searching && (
            <GuestList
              guests={guests}
              canEdit={action != "view"}
              deleteGuest={handleDelete}
            />
          )}
          {action == "create" && (
            <GradientButton
              handlePress={() => {
                router.dismiss(1);
                setTimeout(() => {
                  router.dismiss(1);
                  router.push({
                    pathname: `../${mealContext.mealData.id}`,
                    params: {
                      name: mealContext.mealData.meal_name,
                      location_id: mealContext.mealData.place_id,
                      radius: mealContext.mealData.distance,
                      budget: JSON.stringify(mealContext.mealData.budget),
                      date: mealContext.mealData.date?.toISOString(),
                    },
                  });
                }, 0);
              }}
              buttonText="Get Craving!"
              style={styles.submitButton}
            />
          )}
          {/* <Pressable onPress={} style={styles.submitButton}>
        <LinearGradient
          locations={[0.2, 1]}
          colors={["#F43625", "#F5C341"]}
          style={{ padding: 15 }}
        >
          <ThemedText type="defaultBold" style={styles.submitButtonText}>
            Get Craving!
          </ThemedText>
        </LinearGradient>
      </Pressable> */}
        </SafeAreaView>
      </ThemedView>
    );
  } else {
    return (
      <SafeAreaView>
        <Oops />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  submitButton: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#E91F0C",
    width: 350,
    borderRadius: 8,
    overflow: "hidden",
    bottom: "5%",
  },
  submitButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
