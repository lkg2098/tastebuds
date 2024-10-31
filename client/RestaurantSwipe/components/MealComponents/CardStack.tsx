import {
  MealRestaurant,
  Photo,
  Restaurant,
  RestaurantScore,
} from "@/types/Restaurant";
import { SocketResData } from "@/types/SocketData";
import RestaurantList, { RestaurantNode } from "@/utils/restaurantList";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import socket from "@/utils/socket";
import { useLocalSearchParams } from "expo-router";
import SwipeCard from "./SwipeCard";
import { MealSettings } from "@/types/MealSettings";
import axiosAuth from "@/api/auth";

export default function CardStack({
  memberId,
  mealRestaurants,
  handleMealRestaurants,
  handleNewPhotoData,
  socketResData,
  scoresOutOfDate,
  updateRestaurant,
  handleMatch,
  round,
  handleUpdateRound,
  handleNextRound,
  handleScoresOOD,
}: {
  memberId: number;
  mealRestaurants: MealRestaurant;
  handleMealRestaurants: (data: MealRestaurant) => void;
  handleNewPhotoData: (id: string, photos: Array<Photo>) => void;
  socketResData?: SocketResData;
  scoresOutOfDate: boolean;
  updateRestaurant: (
    id: string,
    action: "like" | "dislike" | "veto"
  ) => Promise<void>;
  handleMatch: (id: string) => Promise<void>;
  round?: number;
  handleUpdateRound: () => Promise<void>;
  handleNextRound: () => Promise<void>;
  handleScoresOOD: (value: boolean) => void;
}) {
  const { meal } = useLocalSearchParams<{ meal: string }>();

  const [liked, setLiked] = useState<RestaurantList>(new RestaurantList());
  const [unseen, setUnseen] = useState<RestaurantList>(new RestaurantList());
  const [disliked, setDisliked] = useState<RestaurantList>(
    new RestaurantList()
  );

  const [topCard, setTopCard] = useState<{
    id: string;
    score: number;
  } | null>();
  const [cardNext, setCardNext] = useState<RestaurantNode | null>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log(memberId, socketResData);
    if (socketResData) {
      const { data, action } = socketResData;
      if (action != "match") {
        handleLike(`${data.id}`, data.score, action == "like");
      }
    }
  }, [socketResData]);

  useEffect(() => {
    if (scoresOutOfDate && Object.keys(mealRestaurants).length > 0) {
      createRestaurantLists();
      handleScoresOOD(false);
    }
  }, [scoresOutOfDate, mealRestaurants]);

  useEffect(() => {
    if (cardNext === null && topCard === null) {
      handleUpdateRound();
    }
  }, [cardNext, topCard]);

  const getMealScores = async () => {
    try {
      let response = await axiosAuth.get(`/meals/${meal}/restaurants`);
      if (response.data) {
        return response.data.scores;
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const createRestaurantLists = async () => {
    let scores = await getMealScores();
    let restaurantMap = { ...mealRestaurants };
    let liked = new RestaurantList();
    let disliked = new RestaurantList();
    let unseen = new RestaurantList();
    let match;

    for (let res of scores) {
      if (restaurantMap[res.res_id]) {
        // console.log(restaurantMap[res.res_id].name, res.total_score);
        if (res.total_score == 1 && !match) {
          match = res.res_id;
        }

        restaurantMap[res.res_id].id = res.res_id;
        restaurantMap[res.res_id].approvedByUser = res.approved_by_user;
        restaurantMap[res.res_id].score = res.total_score;
        restaurantMap[res.res_id].userScore = res.user_raw_score;
        restaurantMap[res.res_id].hidden = res.hidden_from_user;
        restaurantMap[res.res_id].vetoed = res.vetoed;
        restaurantMap[res.res_id].disliked = res.disliked;
        restaurantMap[res.res_id].unseen = res.unseen;

        // if not vetoed and approved by user = 0
        if (
          !res.vetoed &&
          res.approved_by_user == 0 &&
          (!topCard || topCard.id != res.res_id)
        ) {
          // restaurants that are hidden are only hidden if
          // no one else in the session has voted on them
          if (res.unseen) {
            if (!res.hidden_from_user) {
              unseen.append({
                id: res.res_id,
                score: Number(res.total_score),
              });
            }
          } else if (res.disliked) {
            disliked.append({
              id: `${res.res_id}`,
              score: Number(res.total_score),
            });
          } else if (!res.disliked) {
            liked.append({ id: res.res_id, score: Number(res.total_score) });
          }
        }
      }
    }

    if (topCard && restaurantMap[topCard.id]) {
      setTopCard({
        id: topCard.id,
        score: restaurantMap[topCard.id].score || topCard.score,
      });
    } else {
      if (liked.head) {
        setTopCard(liked.head.value);
        liked.pop();
      } else if (unseen.head) {
        setTopCard(unseen.head.value);
        unseen.pop();
      } else if (disliked.head) {
        setTopCard(disliked.head.value);
        disliked.pop();
      } else {
        setTopCard(null);
      }
    }
    if (liked.head) {
      setCardNext(liked.head);
    } else if (unseen.head) {
      setCardNext(unseen.head);
    } else if (disliked.head) {
      setCardNext(disliked.head);
    } else {
      setCardNext(null);
    }

    handleMealRestaurants(restaurantMap);
    setLiked(liked);
    setUnseen(unseen);
    setDisliked(disliked);

    if (match) {
      return match;
    }
    return;
  };

  const handleSwipe = async (approved: boolean, id: string, score: number) => {
    // console.log(approved);
    // console.log(id);
    // console.log(score);
    // console.log(mealRestaurants[id].userScore);
    const newScore =
      approved && mealRestaurants[id].userScore
        ? score / mealRestaurants[id].userScore
        : score * 10;
    // console.log(newScore);
    const mealResCopy = { ...mealRestaurants };

    mealResCopy[id] = {
      ...mealResCopy[id],
      approvedByUser: approved ? 1 : -1,
      score: newScore,
      disliked: mealResCopy[id].disliked || !approved,
    };

    handleMealRestaurants(mealResCopy);
    if (cardNext) {
      setTopCard(cardNext.value);
      if (cardNext.value.id == liked.head?.value.id) {
        liked.pop();
      } else if (cardNext.value.id == unseen.head?.value.id) {
        unseen.pop();
      } else if (cardNext.value.id == disliked.head?.value.id) {
        disliked.pop();
      }
      if (liked.head) {
        setCardNext(liked.head);
      } else if (unseen.head) {
        setCardNext(unseen.head);
      } else if (disliked.head) {
        setCardNext(disliked.head);
      } else {
        setCardNext(null);
      }
    } else {
      setTopCard(null);
    }

    if (approved) {
      socket.emit("like", meal, {
        id: id,
        score: newScore,
      });
      await updateRestaurant(id, "like");
      if (newScore == 1) {
        await handleMatch(id);
      }
    } else {
      socket.emit("dislike", meal, {
        id: id,
        score: newScore,
      });
      await updateRestaurant(id, "dislike");
    }
  };

  const handleLike = (id: string, score: number, liked: boolean) => {
    console.log(id, score);
    let restaurantMap = { ...mealRestaurants };
    let resData = restaurantMap[id];
    console.log(memberId, resData.score, id, score);
    if (resData && resData.score != score && resData.approvedByUser == 0) {
      if (topCard?.id != id) {
        sortIntoLists(resData, score, liked);
      } else {
        setTopCard({ id, score });
      }
      restaurantMap[id] = { ...resData, score: score };
      if (!liked) {
        restaurantMap[id].disliked = true;
      }
      handleMealRestaurants(restaurantMap);
    } else if (!resData) {
      //call google data and add it to the map
    }
  };

  const swapLists = (
    deleteFrom: RestaurantList,
    addTo: RestaurantList,
    id: string,
    score: number
  ) => {
    deleteFrom.delete(id);
    let success = addTo.append({ id, score });
    if (!success) {
      addTo.insert({ id, score });
    }
  };

  const sortIntoLists = (
    data: Restaurant,
    score: number,
    approved: boolean
  ) => {
    console.log("sorting into lists");
    // console.log(memberId);
    // console.log(data, score, approved);
    let likedList = liked.copy();
    let unseenList = unseen.copy();
    let dislikedList = disliked.copy();

    // console.log(memberId, "LIKED BEFORE: ", likedList.toString(), "\n");
    // console.log(memberId, "DISLIKED BEFORE: ", dislikedList.toString());
    // console.log(memberId, "UNSEEN BEFORE: ", unseenList.toString());

    if (data.approvedByUser == 0) {
      if (data.disliked) {
        dislikedList.insertAndDelete({ id: data.id, score: score });
      } else if (data.unseen) {
        if (approved) {
          swapLists(unseenList, likedList, data.id, score);
        } else {
          swapLists(unseenList, dislikedList, data.id, score);
        }
      } else {
        if (approved) {
          likedList.insertAndDelete({ id: data.id, score: score });
        } else {
          swapLists(likedList, dislikedList, data.id, score);
        }
      }
      if (likedList.head) {
        setCardNext(likedList.head);
      } else if (unseenList.head) {
        setCardNext(unseenList.head);
      } else if (dislikedList.head) {
        setCardNext(dislikedList.head);
      } else {
        setCardNext(null);
      }

      // console.log(memberId, "LIKED AFTER: ", likedList.toString(), "\n");
      // console.log(memberId, "DISLIKED AFTER: ", dislikedList.toString(), "\n");
      // console.log(memberId, "UNSEEN AFTER: ", unseenList.toString(), "\n");
      setLiked(likedList);
      setUnseen(unseenList);
      setDisliked(dislikedList);
    }
  };

  let totalUnseen = useMemo(() => {
    const likedCount = liked?.length || 0;
    const dislikedCount = disliked?.length || 0;
    const unseenCount = unseen?.length || 0;
    const addTopCard = topCard ? 1 : 0;
    return likedCount + dislikedCount + unseenCount + addTopCard;
  }, [liked.length, disliked.length, unseen.length, topCard]);

  return (
    <SwipeCard
      topCard={topCard}
      dataMap={mealRestaurants}
      next={cardNext}
      handleSwipe={handleSwipe}
      totalCards={totalUnseen}
      handleNewPhotoData={handleNewPhotoData}
      canUpdate={round == 1}
      handleNextRound={handleNextRound}
    />
  );
}
