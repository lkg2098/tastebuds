import axiosAuth from "@/api/auth";
import socket from "@/utils/socket";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import ConfirmationModal from "./ConfirmationModal";
import { ThemedText } from "../ThemedText";

export default function DeleteModal({
  mealId,
  userId,
  type,
}: {
  mealId?: string;
  userId?: string;
  type: "meal" | "account" | "member" | "leave";
}) {
  const router = useRouter();

  const handleDeleteMeal = async () => {
    console.log(`deleting ${mealId}`);
    try {
      let response = await axiosAuth.delete(`/meals/${mealId}`);
      if (response.status == 200) {
        socket.emit("deleteMeal", mealId);
        router.dismiss(3);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleDeleteMember = async () => {
    console.log(type, mealId, userId);
    try {
      if (type == "leave" && mealId) {
        let response = await axiosAuth.delete(`/meals/${mealId}/members`);
        if (response.status == 200) {
          socket.emit("memberRemoved", mealId);
          router.navigate("/(tabs)");
        } else {
          console.log("Could not remove member");
        }
      } else if (type == "member" && mealId && userId) {
        let response = await axiosAuth.delete(
          `/meals/${mealId}/members/${userId}`
        );
        if (response.status == 200) {
          socket.emit("memberRemoved", mealId);
          router.dismiss(1);
        } else {
          console.log("Could not remove member");
        }
      } else {
        console.log("Could not remove member");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      let response = await axiosAuth.delete(`/users`);
      if (response.status == 200) {
        router.navigate("/login");
      } else {
        console.log("Could not delete account");
      }
    } catch (err) {
      console.log(err);
    }
  };
  if (type == "meal") {
    return (
      <ConfirmationModal
        title="Delete meal for everyone?"
        content={
          <View>
            <ThemedText>
              As the host, deleting this meal will get rid of it for everyone.
            </ThemedText>
          </View>
        }
        onCancel={() => router.dismiss(1)}
        onConfirm={handleDeleteMeal}
      />
    );
  } else if (type == "member") {
    return (
      <ConfirmationModal
        title="Remove this guest?"
        content={
          <View>
            <ThemedText>
              If you uninvite this guest, all of their swipe history will be
              deleted.
            </ThemedText>
          </View>
        }
        onCancel={() => {
          router.setParams({ mealId: mealId, deleted: "yes" });
          router.dismiss(1);
        }}
        onConfirm={handleDeleteMember}
      />
    );
  } else if (type == "leave") {
    return (
      <ConfirmationModal
        title="Leave this meal?"
        content={
          <ThemedText>
            You'll have to ask the host to invite you again if you want to
            rejoin.
          </ThemedText>
        }
        onCancel={() => router.dismiss(1)}
        onConfirm={handleDeleteMember}
      />
    );
  } else if (type == "account") {
    return (
      <ConfirmationModal
        title="Delete your account?"
        content={
          <View>
            <ThemedText>This cannot be undone.</ThemedText>
          </View>
        }
        onCancel={() => router.dismiss(1)}
        onConfirm={handleDeleteAccount}
      />
    );
  }
}
