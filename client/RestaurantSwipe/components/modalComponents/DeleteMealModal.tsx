import axiosAuth from "@/api/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import ConfirmationModal from "./ConfirmationModal";

export default function DeletemealModal({ mealId }: { mealId: string }) {
  const router = useRouter();

  const handleDeleteMeal = async () => {
    console.log(`deleting ${mealId}`);
    try {
      let response = await axiosAuth.delete(`/meals/${mealId}`);
      if (response.status == 200) {
        router.dismiss(3);
      }
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <ConfirmationModal
      title="Delete meal for everyone?"
      content={<View></View>}
      onCancel={() => router.dismiss(1)}
      onConfirm={handleDeleteMeal}
    />
  );
}
