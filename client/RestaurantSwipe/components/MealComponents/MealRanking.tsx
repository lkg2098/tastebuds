import React, { useEffect, useState } from "react";
import RankList from "../MealComponents/RankList";
import axiosAuth from "@/api/auth";
import { useLocalSearchParams } from "expo-router";
import { ThemedText } from "../ThemedText";
import { View } from "react-native";
import { ThemedButton } from "../ThemedButton";
import { MealRestaurant, Photo } from "@/types/Restaurant";
import Loading from "../Loading";
import RestaurantDragCard from "./RestaurantDragCard";

export default function MealRanking({
  mealRestaurants,
  memberRound,
  handleMemberRound,
  updateRound,
  handleNewPhotoData,
}: {
  mealRestaurants: MealRestaurant;
  memberRound?: number;
  handleMemberRound: (round: number) => void;
  updateRound: () => Promise<void | Array<number>>;
  handleNewPhotoData: (id: string, photos: Array<Photo>) => void;
}) {
  const { meal } = useLocalSearchParams<{ meal: string }>();
  const [dataFetched, setDataFetched] = useState(false);
  const [restaurants, setRestaurants] = useState<Array<number>>([]);
  const [remainingMembers, setRemainingMembers] = useState<Array<number>>([]);
  const fetchDislikes = async () => {
    try {
      let response = await axiosAuth.get(`/meals/${meal}/restaurants/dislikes`);
      console.log(response.data);
      if (response.data.restaurants) {
        setRestaurants(response.data.restaurants);
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (mealRestaurants) {
      setDataFetched(true);
    }
  }, [mealRestaurants]);

  useEffect(() => {
    if (dataFetched) {
      fetchDislikes();
    }
  }, [dataFetched]);

  useEffect(() => {
    handleUpdate();
  }, [memberRound]);

  const handleUpdate = async () => {
    let remainingMembers = await updateRound();
    if (remainingMembers) {
      setRemainingMembers(remainingMembers);
    }
  };

  const handleSubmit = async (ranks: Array<number>) => {
    try {
      let response = await axiosAuth.post(`/meals/${meal}/restaurants/rank`, {
        ranks,
      });
      if (response.data) {
        console.log(response.data);
        handleMemberRound(response.data.member_round);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const renderItem = (item: number) => {
    let data = mealRestaurants[item];
    if (data) {
      return (
        <RestaurantDragCard
          data={data}
          handleNewPhotoData={(photos) => handleNewPhotoData(`${item}`, photos)}
        />
      );
    }
    return <Loading />;
  };
  return (
    <View>
      {memberRound == 1 ? (
        <RankList
          data={restaurants}
          renderData={renderItem}
          onSubmit={handleSubmit}
        />
      ) : (
        <View>
          <ThemedText>Successfully Subimtted!</ThemedText>
        </View>
      )}
    </View>
  );
}
