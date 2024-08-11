import {
  Text,
  View,
  Button,
  ScrollView,
  Pressable,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Restaurant } from "@/types/Restaurant";
import RestaurantList, { RestaurantNode } from "@/utils/restaurantList";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "@/hooks/useThemeColor";
import SwipeCard from "@/components/MealComponents/SwipeCard";
import { Ionicons } from "@expo/vector-icons";
import socket from "@/utils/socket";
import axiosAuth from "@/api/auth";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

type MealRestaurant = { [key: string]: Restaurant };

socket.connect();
export default function Meal() {
  const { meal, location_id, min_rating, preferences } = useLocalSearchParams<{
    meal: string;
    location_id: string;
    min_rating: string;
    preferences: string[];
  }>();
  const router = useRouter();
  const [mealRestaurants, setMealRestaurants] = useState<MealRestaurant>({});
  const restaurantsRef = useRef(mealRestaurants);
  const [liked, setLiked] = useState<RestaurantList>(new RestaurantList(null));
  const likedRef = useRef(liked);
  const [disliked, setDisliked] = useState<RestaurantList>(
    new RestaurantList(null)
  );
  const dislikedRef = useRef(disliked);
  const [unseen, setUnseen] = useState<RestaurantList>(
    new RestaurantList(null)
  );
  const unseenRef = useRef(unseen);
  const [locationData, setLocationData] = useState({
    id: location_id,
    address: "",
    coords: [] as Array<number>,
  });
  const [googleSqlData, setGooglSqlData] = useState("");
  const [tagMap, setTagMap] = useState();

  const loading = liked == null || disliked == null || unseen == null;

  const [topCard, setTopCard] = useState<{ id: string; score: number }>();
  const topCardRef = useRef(topCard);
  const [cardNext, setCardNext] = useState<RestaurantNode>();
  const cardNextRef = useRef(cardNext);

  const tintColor = useThemeColor({}, "tint");

  const memberCount = 3;

  useFocusEffect(
    useCallback(() => {
      socket.emit("joinMeal", meal);
      return () => {
        socket.emit("leaveMeal", meal);
      };
    }, [])
  );

  const getMealRestaurants = async (scoresOnly?: boolean) => {
    try {
      let response = await axiosAuth.get(`/meals/${meal}/restaurants`, {
        params: {
          location_id,
          google_ids: scoresOnly ? Object.keys(mealRestaurants) : null,
        },
      });
      if (response.data) {
        return response.data;
      }
      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const getMemberSettings = async () => {
    try {
      let response = await axiosAuth.get(`/meals/${meal}/preferences`, {
        params: { setting: "all" },
      });
      console.log(response.data);
      return response.data;
    } catch (err) {
      console.log(err);
    }
  };

  const createRestaurantLists = (map: MealRestaurant, scores: Array<any>) => {
    let restaurantMap = {} as MealRestaurant;
    let liked = new RestaurantList(null);
    let disliked = new RestaurantList(null);
    let unseen = new RestaurantList(null);
    if (map) restaurantMap = map;
    for (let res of scores) {
      if (restaurantMap[res.place_id]) {
        restaurantMap[res.place_id].approvedByUser = res.approved_by_user;
        restaurantMap[res.place_id].score = res.total_score;
        restaurantMap[res.place_id].userScore = res.user_raw_score;
        restaurantMap[res.place_id].hidden = res.hidden;
        restaurantMap[res.place_id].vetoed = res.vetoed;
        restaurantMap[res.place_id].disliked = res.disliked;
        restaurantMap[res.place_id].unseen = res.unseen;

        // if not vetoed and approved by user = 0
        if (
          !res.vetoed &&
          res.approved_by_user == 0 &&
          restaurantMap[res.place_id].open &&
          restaurantMap[res.place_id].inBudget
        ) {
          // restaurants that are hidden are only hidden if
          // no one else in the session has voted on them
          if (res.unseen) {
            if (!res.hidden) {
              unseen.append({ id: res.place_id, score: res.total_score });
            }
          } else if (res.disliked) {
            disliked.append({ id: res.place_id, score: res.total_score });
          } else if (!res.disliked) {
            liked.append({ id: res.place_id, score: res.total_score });
          }
        }
      }
    }
    if (liked.head) {
      setTopCard(liked.head.value);
      liked.pop();
      if (liked.head) {
        setCardNext(liked.head);
      } else if (unseen.head) {
        setCardNext(unseen.head);
      } else if (disliked.head) {
        setCardNext(disliked.head);
      }
    } else if (unseen.head) {
      setTopCard(unseen.head.value);
      unseen.pop();
      if (unseen.head) {
        setCardNext(unseen.head);
      } else if (disliked.head) {
        setCardNext(disliked.head);
      }
    } else if (disliked.head) {
      setTopCard(disliked.head.value);
      disliked.pop();
      if (disliked.head) {
        setCardNext(disliked.head);
      }
    }

    setMealRestaurants(restaurantMap);
    setLiked(liked);
    setUnseen(unseen);
    setDisliked(disliked);
  };

  useEffect(() => {
    console.log("settings changed");
    if (min_rating || preferences) {
      console.log("important change");
      getMealRestaurants(true)
        .then((value) => {
          console.log("running it over here");
          createRestaurantLists(mealRestaurants, value.scores);
        })
        .catch((err) => console.log(err));
    }
  }, [min_rating, preferences]);

  useEffect(() => {
    console.log(meal);
    console.log("running useEffect");

    getMemberSettings().then((value) => {
      if (!value.settings.rating) {
        router.push({ pathname: "preferences", params: { mealId: meal } });
      }
    });
    getMealRestaurants()
      .then((value) => {
        console.log(value);
        setTagMap(value.tag_map);
        setLocationData({
          id: value.locationInfo.location_id,
          coords: value.locationInfo.location_coords,
          address: value.locationInfo.address,
        });
        setGooglSqlData(value.google_sql_string);
        router.setParams({
          google_sql_string: value.google_sql_string,
          tag_map: JSON.stringify(value.tag_map),
        });
        console.log("running create lists");
        createRestaurantLists({ ...value.restaurantsMap }, value.scores);
      })
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {});

  useEffect(() => {
    cardNextRef.current = cardNext;
  }, [cardNext]);

  useEffect(() => {
    topCardRef.current = topCard;
  }, [topCard]);

  useEffect(() => {
    restaurantsRef.current = mealRestaurants;
  }, [mealRestaurants]);

  useEffect(() => {
    likedRef.current = liked;
  }, [liked.length]);

  useEffect(() => {
    unseenRef.current = unseen;
  }, [unseen.length]);

  useEffect(() => {
    dislikedRef.current = disliked;
  }, [disliked.length]);

  useEffect(() => {
    socket.on("newResData", (data, liked) => {
      if (liked == 1) {
        handleLike(data.id, data.score);
      } else {
        handleDislike(data.id, data.score);
      }
    });
    socket.on("match", (data) => {
      console.log(`FOUND A MATCH! ${data.id}`);
    });
  }, [socket]);

  const updateRestaurant = async (id: string, action: string) => {
    console.log(meal);
    try {
      await axiosAuth.put(`/meals/${meal}/restaurants`, {
        place_id: id,
        action: action,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const handleSwipe = async (approved: boolean, id: string, score: number) => {
    console.log(id);
    const newScore = approved
      ? score / mealRestaurants[id].userScore
      : score * 10;
    setMealRestaurants((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        seenByUser: true,
        score: newScore,
        disliked: prev[id].disliked || !approved,
      },
    }));
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
        setCardNext(undefined);
      }
    } else {
      setTopCard(undefined);
    }

    if (approved) {
      socket.emit("like", meal, {
        id: id,
        score: newScore,
      });
      await updateRestaurant(id, "like");
    } else {
      socket.emit("dislike", meal, {
        id: id,
        score: newScore,
      });
      await updateRestaurant(id, "dislike");
    }
  };

  const handleLike = (id: string, score: number) => {
    let restaurantMap = restaurantsRef.current;
    let resData = restaurantMap[id];
    let currentCard = topCardRef.current;
    if (resData && resData.score != score) {
      if (currentCard?.id != id) {
        sortIntoLists(resData, score, true);
      } else {
        setTopCard({ id, score });
      }
      setMealRestaurants({
        ...restaurantMap,
        [id]: { ...resData, score: score },
      });
    } else if (!resData) {
      //call google data and add it to the map
    }
  };

  const handleDislike = (id: string, score: number) => {
    let restaurantMap = restaurantsRef.current;
    let resData = restaurantMap[id];
    let currentCard = topCardRef.current;
    if (resData && resData.score != score) {
      if (currentCard?.id != id) {
        sortIntoLists(resData, score, false);
      } else {
        setTopCard({ id, score });
      }
      setMealRestaurants({
        ...restaurantMap,
        [id]: { ...resData, score: score, disliked: true },
      });
    } else if (!resData) {
      // call data from google and add it to the map
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
    let likedList = likedRef.current;
    let unseenList = unseenRef.current;
    let dislikedList = dislikedRef.current;
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
        setCardNext(undefined);
      }
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
    <LinearGradient
      colors={[useThemeColor({}, "tint"), "#500B04"]}
      style={styles.gradient}
    >
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.navigate("(tabs)")}>
          <Ionicons
            name="chevron-back"
            color={useThemeColor({}, "text")}
            size={18}
          />
        </Pressable>
        <ThemedText>{}</ThemedText>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "createMeal",
              params: {
                mealId: meal,
                place_id: locationData.id,
                current_address: locationData.address,
                coords: JSON.stringify(locationData.coords),
                google_sql_string: googleSqlData,
                tagMap: JSON.stringify(tagMap),
              },
            })
          }
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={24}
            color={useThemeColor({}, "text")}
          />
        </Pressable>
      </View>

      <ThemedText>{meal}</ThemedText>
      <Pressable
        onPress={() =>
          router.navigate({
            pathname: "match",
            params: { mealId: meal },
          })
        }
      >
        <ThemedText>Click for Match Route</ThemedText>
      </Pressable>
      <SwipeCard
        topCard={topCard}
        dataMap={mealRestaurants}
        next={cardNext}
        handleSwipe={handleSwipe}
        totalCards={totalUnseen}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignSelf: "stretch",
    justifyContent: "space-between",
    paddingHorizontal: "7%",
  },
  gradient: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    position: "relative",
    paddingVertical: "15%",
  },
});
