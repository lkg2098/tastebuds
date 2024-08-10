import {
  Text,
  View,
  Button,
  Pressable,
  ImageSourcePropType,
  StyleSheet,
} from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import UserSearch from "@/components/UserSearch";
import GuestList from "@/components/GuestList";
import { useState } from "react";
import axiosAuth from "@/api/auth";
import { LinearGradient } from "expo-linear-gradient";
import GradientButton from "@/components/GradientButton";

type Guest = { username: string; profileImage: ImageSourcePropType };
export default function AddUsers() {
  const router = useRouter();
  const { mealId } = useLocalSearchParams();
  const addGuest = async (guest: Guest) => {
    try {
      let response = await axiosAuth.post(`/meals/${mealId}/members/new`, {
        users: [guest.username],
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
  const [guests, setGuests] = useState([] as Guest[]);

  const handleDelete = (username: string) => {
    console.log("deleting");
    console.log(guests.filter((guest) => guest.username != username));
    setGuests(guests.filter((guest) => guest.username != username));
  };
  return (
    <ThemedView
      style={{
        flex: 1,
        alignItems: "center",
      }}
    >
      <UserSearch handleUsers={addGuest} />
      <GuestList guests={guests} deleteGuest={handleDelete} />
      <GradientButton
        handlePress={() => {
          router.dismiss(1);
          setTimeout(() => {
            router.dismiss(1);
            router.push(`../${mealId}`);
          }, 0);
        }}
        buttonText="Get Craving!"
        style={styles.submitButton}
      />
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  submitButton: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#E91F0C",
    width: 350,
    borderRadius: 8,
    overflow: "hidden",
    top: "88%",
  },
  submitButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
