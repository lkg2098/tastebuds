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
import { filter_by_budget, filter_by_hours } from "@/utils/restaurant_filters";
import { Meal } from "@/types/Meal";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderBar from "@/components/HeaderBar";

type MealRestaurant = { [key: string]: Restaurant };

export default function MealSwipe() {
  const {
    meal,
    name,
    location_id,
    radius,
    date,
    min_rating,
    budget,
    preferences,
    members,
    chosen_restaurant,
  } = useLocalSearchParams<{
    meal: string;
    name: string;
    location_id: string;
    radius: string;
    date: string;
    min_rating: string;
    budget: string;
    preferences: string;
    members: string;
    chosen_restaurant?: string;
  }>();
  const router = useRouter();

  const [mealSettings, setMealSettings] = useState<Meal>();
  const settingsRef = useRef<Meal>();
  const memberId = useRef();

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
  });
  const locationRef = useRef(locationData);

  let googleSqlData = useRef("");
  // const [googleSqlData, setGooglSqlData] = useState("");
  const [tagMap, setTagMap] = useState();

  const loading = liked == null || disliked == null || unseen == null;

  const [topCard, setTopCard] = useState<{ id: string; score: number }>();
  const topCardRef = useRef(topCard);
  const [cardNext, setCardNext] = useState<RestaurantNode>();
  const cardNextRef = useRef(cardNext);

  const color = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  const getGoogleData = async (location: string, radius: string) => {
    try {
      let response = await axiosAuth.get(`meals/${meal}/googleData`, {
        params: {
          location_id: location,
          radius: radius,
        },
      });
      if (response.data) {
        return response.data;
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const getMealScores = async (ids?: Array<string>) => {
    try {
      console.log(ids);
      if (ids || mealRestaurants) {
        let response = await axiosAuth.get(`/meals/${meal}/restaurants`, {
          params: {
            place_ids: ids || Object.keys(mealRestaurants),
          },
        });
        if (response.data) {
          return response.data;
        }
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
      // console.log(response.data);
      return response.data;
    } catch (err) {
      console.log(err);
    }
  };

  const createRestaurantLists = (
    map: MealRestaurant,
    scores: Array<any>,
    currentBudget: Array<number>,
    scheduled_at: Date
  ) => {
    let restaurantMap = {} as MealRestaurant;
    let liked = new RestaurantList(null);
    let disliked = new RestaurantList(null);
    let unseen = new RestaurantList(null);

    let match;
    if (map) restaurantMap = map;

    for (let res of scores) {
      if (restaurantMap[res.place_id]) {
        console.log(restaurantMap[res.place_id].name, res.total_score);
        if (res.total_score == 1 && !match) {
          match = res.place_id;
        }
        restaurantMap[res.place_id].approvedByUser = res.approved_by_user;
        restaurantMap[res.place_id].score = res.total_score;
        restaurantMap[res.place_id].userScore = res.user_raw_score;
        restaurantMap[res.place_id].hidden = res.hidden;
        restaurantMap[res.place_id].vetoed = res.vetoed;
        restaurantMap[res.place_id].disliked = res.disliked;
        restaurantMap[res.place_id].unseen = res.unseen;
        if (restaurantMap[res.place_id].hours) {
          restaurantMap[res.place_id].open = Boolean(
            filter_by_hours(
              restaurantMap[res.place_id].hours || [],
              scheduled_at
            )
          );
        }

        if (
          restaurantMap[res.place_id].priceLevel &&
          currentBudget.length == 2
        ) {
          restaurantMap[res.place_id].inBudget = filter_by_budget(
            restaurantMap[res.place_id].priceLevel || "",
            currentBudget[0],
            currentBudget[1]
          );
        }

        // if not vetoed and approved by user = 0
        if (
          !res.vetoed &&
          res.approved_by_user == 0 &&
          restaurantMap[res.place_id].open &&
          restaurantMap[res.place_id].inBudget !== false &&
          (!topCardRef.current || topCardRef.current.id != res.place_id)
        ) {
          // console.log(
          //   restaurantMap[res.place_id].name,
          //   restaurantMap[res.place_id].hidden
          // );
          // restaurants that are hidden are only hidden if
          // no one else in the session has voted on them
          if (res.unseen) {
            if (!res.hidden) {
              unseen.append({
                id: res.place_id,
                score: Number(res.total_score),
              });
            }
          } else if (res.disliked) {
            disliked.append({
              id: res.place_id,
              score: Number(res.total_score),
            });
          } else if (!res.disliked) {
            liked.append({ id: res.place_id, score: Number(res.total_score) });
          }
        }
      }
    }

    // console.log(JSON.stringify(restaurantMap));
    if (liked.head) {
      if (!topCardRef.current) {
        setTopCard(liked.head.value);
        liked.pop();
      }
      if (liked.head) {
        setCardNext(liked.head);
      } else if (unseen.head) {
        setCardNext(unseen.head);
      } else if (disliked.head) {
        setCardNext(disliked.head);
      }
    } else if (unseen.head) {
      console.log(unseen.head.value);
      console.log(topCardRef);
      if (!topCardRef.current) {
        setTopCard(unseen.head.value);
        unseen.pop();
      }
      if (unseen.head) {
        setCardNext(unseen.head);
      } else if (disliked.head) {
        setCardNext(disliked.head);
      }
    } else if (disliked.head) {
      if (!topCardRef.current) {
        setTopCard(disliked.head.value);
        disliked.pop();
      }
      if (disliked.head) {
        setCardNext(disliked.head);
      }
    } else {
      setTopCard(undefined);
      setCardNext(undefined);
    }
    if (topCardRef.current) {
      setTopCard({
        id: topCardRef.current.id,
        score:
          restaurantMap[topCardRef.current.id].score ||
          topCardRef.current.score,
      });
    }
    setMealRestaurants(restaurantMap);
    setLiked(liked);
    setUnseen(unseen);
    setDisliked(disliked);

    if (match) {
      return match;
    }
    return;
  };

  const handleMatch = async (id: string) => {
    try {
      let response = await axiosAuth.put(`/meals/${meal}`, {
        chosen_restaurant: id,
      });
      if (response.status == 200) {
        router.navigate({
          pathname: "/matchAnim",
          params: { data: JSON.stringify(mealRestaurants[id]) },
        });
      }
    } catch (err) {
      console.log(err);
    }
  };

  const updateRestaurantData = async (
    data: {
      date?: string;
      location_id?: string;
      radius?: string;
      budget?: string;
      min_rating?: string;
      preferences?: string;
    },
    action: "update" | "fetch"
  ) => {
    try {
      console.log(memberId.current, settingsRef.current);
      const settings = settingsRef.current;
      if (settings) {
        console.log("----Updating restaurant data...");
        let map = restaurantsRef.current;
        let locationInfo = locationRef.current;
        console.log(data);
        if (data.location_id || data.radius) {
          console.log("----------------Updating google data");
          const location = data.location_id || settings?.place_id;
          const dist = data.radius || settings.distance;

          if (action == "update") {
            let response = await axiosAuth.put(`/meals/${meal}/googleData`, {
              location_id: location,
              radius: dist,
            });
            if (response.data) {
              map = response.data.restaurantsMap;
              let googleSqlString = response.data.google_sql_string;
              locationInfo = {
                id: response.data.locationInfo.location_id,
                address: response.data.locationInfo.address,
              };
              googleSqlData.current = response.data.google_sql_string;
              setLocationData(locationInfo);
            } else {
              //error
            }
          } else if (action == "fetch") {
            let googleData = await getGoogleData(location, `${dist}`);
            map = googleData.restaurantsMap;
            let googleSqlString = googleData.google_sql_string;
            locationInfo = {
              id: googleData.locationInfo.location_id,
              address: googleData.locationInfo.address,
            };
            googleSqlData.current = googleData.google_sql_string;
            setLocationData(locationInfo);
          }
        }

        let { scores } = await getMealScores(Object.keys(map));

        let match = createRestaurantLists(
          { ...map },
          scores,
          data.budget ? JSON.parse(data.budget) : settings.budget,
          data.date ? new Date(data.date) : settings.date
        );
        setMealSettings({
          ...settings,
          meal_name: name || settings.meal_name,
          place_id: data.location_id || settings.place_id,
          distance: data.radius ? Number(data.radius) : settings.distance,
          date: data.date ? new Date(data.date) : settings.date,
          budget: data.budget ? JSON.parse(data.budget) : settings.budget,
        });

        return match;
      }
    } catch (err) {
      console.log(err);
    }
  };

  // initial data fetch ------------------------------------
  useEffect(() => {
    console.log("initial useEffect");

    if (location_id && radius && budget && date) {
      console.log("all necessary data");
      socket.emit("testEndpoint");
      getMemberSettings()
        .then((value) => {
          console.log(meal, value.member_id);
          memberId.current = value.member_id;
          socket.emit("joinMeal", meal, value.member_id);
          if (value.settings.rating === null) {
            router.push({
              pathname: "./preferences",
              params: { mealId: meal },
            });
          }
          getGoogleData(location_id, radius)
            .then((googleData) => {
              console.log("running fetch google data");

              setTagMap(googleData.tag_map);
              setLocationData({
                id: location_id,
                address: googleData.locationInfo.address,
              });
              googleSqlData.current = googleData.google_sql_string;
              router.setParams({
                google_sql_string: googleData.google_sql_string,
                tag_map: JSON.stringify(googleData.tag_map),
              });

              if (value.settings.rating !== null) {
                getMealScores(Object.keys(googleData.restaurantsMap))
                  .then((value) => {
                    console.log("running create lists");
                    createRestaurantLists(
                      { ...googleData.restaurantsMap },
                      value.scores,
                      JSON.parse(budget),
                      new Date(date)
                    );
                  })
                  .catch((err) => console.log(err));
              } else {
                setMealRestaurants({ ...googleData.restaurantsMap });
              }
            })
            .catch((err) => console.log(err));
        })
        .catch((err) => console.log(err));
      console.log("made it to meal settings");
      setMealSettings({
        id: meal,
        meal_name: name || "",
        place_id: location_id,
        distance: Number(radius),
        date: new Date(date),
        budget: budget ? JSON.parse(budget) : [],
        members: [] as string[],
      });
    }
  }, []);

  useEffect(() => {
    console.log("mealSettings: ", mealSettings);
  }, [mealSettings]);

  // refetch data on change settings---------------------------------
  useEffect(() => {
    console.log("SETTINGS CHANGE");
    if (mealSettings) {
      console.log("updating data");
      console.log(
        date,
        location_id,
        radius,
        budget,
        min_rating,
        preferences,
        members
      );
      updateRestaurantData(
        {
          date: date,
          location_id: location_id,
          radius: radius,
          budget: budget,
          min_rating: min_rating,
          preferences: preferences,
        },
        "update"
      ).then((match) => {
        if (match) {
          console.log(match);
          socket.emit("like", meal, { id: match, score: 1 });
          handleMatch(match);
        } else {
          console.log(memberId.current, "EMITTING SETTINGS UPDATE");
          socket.emit("settingsChange", meal, {
            date,
            location_id,
            radius,
            budget,
            min_rating,
            preferences,
          });
        }
      });
    }
  }, [date, location_id, radius, budget, min_rating, preferences, members]);

  useEffect(() => {
    // console.log(memberId.current, "unseen: ", unseen.toString());
  }, [unseen]);

  useEffect(() => {
    // console.log(memberId.current, "liked: ", liked.toString());
  }, [liked]);

  useEffect(() => {
    // console.log(memberId.current, "disliked: ", disliked.toString());
  }, [disliked]);

  useEffect(() => {
    settingsRef.current = mealSettings;
  }, [mealSettings]);

  useEffect(() => {
    locationRef.current = locationData;
  }, [locationData]);

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
      console.log("LIKED OR DISLIKED");
      console.log(memberId.current, "received new data", data);
      if (liked == 1) {
        handleLike(data.id, data.score);
      } else {
        handleDislike(data.id, data.score);
      }
    });
    socket.on("match", (data) => {
      console.log(`FOUND A MATCH! ${data.id}`);
      router.navigate({
        pathname: "/matchAnim",
        params: { data: JSON.stringify(restaurantsRef.current[data.id]) },
      });
    });
    socket.on("settingsUpdate", (newSettings) => {
      console.log(`OTHER MEMBER'S SETTIGNS UPDATED!`);
      // console.log(
      //   memberId.current,
      //   `OTHER MEMBER'S SETTIGNS UPDATED!`,
      //   newSettings
      // );

      updateRestaurantData(newSettings, "fetch");
    });
    socket.on("sessionDeleted", () => {
      socket.emit("leaveMeal", meal);
      router.navigate("/(tabs)");
    });

    socket.on("test succeeded", () => {
      console.log("RECEIVED A RESPONSE");
    });
    return () => {
      socket.off("newResData");
      socket.off("match");
      socket.off("settingsUpdate");
      socket.off("settingsDeleted");
      socket.off("test succeeded");
    };
  }, [socket]);

  const updateRestaurant = async (id: string, action: string) => {
    //console.log(meal);
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
    console.log(approved);
    console.log(id);
    console.log(score);
    console.log(mealRestaurants[id].userScore);
    const newScore =
      approved && mealRestaurants[id].userScore
        ? score / mealRestaurants[id].userScore
        : score * 10;
    console.log(newScore);
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

  const handleLike = (id: string, score: number) => {
    console.log(id, score);
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
    console.log("sorting into lists");
    console.log(memberId.current);
    // console.log(data, score, approved);
    let likedList = likedRef.current;
    let unseenList = unseenRef.current;
    let dislikedList = dislikedRef.current;

    // console.log(memberId.current, "LIKED BEFORE: ", likedList.toString(), "\n");
    // console.log(memberId.current, "DISLIKED BEFORE: ", dislikedList.toString());
    // console.log(memberId.current, "UNSEEN BEFORE: ", unseenList.toString());
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

      // console.log(
      //   memberId.current,
      //   "LIKED AFTER: ",
      //   likedList.toString(),
      //   "\n"
      // );
      // console.log(
      //   memberId.current,
      //   "DISLIKED AFTER: ",
      //   dislikedList.toString(),
      //   "\n"
      // );
      // console.log(
      //   memberId.current,
      //   "UNSEEN AFTER: ",
      //   unseenList.toString(),
      //   "\n"
      // );
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
      <SafeAreaView style={styles.safeArea}>
        <HeaderBar
          headerLeft={
            <Pressable
              onPress={() => {
                socket.emit("leaveMeal", meal, memberId.current);
                router.navigate("./(tabs)");
              }}
            >
              <Ionicons name="chevron-back" color={color} size={18} />
            </Pressable>
          }
          headerCenter={
            <ThemedText type="subtitle">{mealSettings?.meal_name}</ThemedText>
          }
          headerRight={
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "./createMeal",
                  params: {
                    mealId: meal,
                    place_id: locationData.id,
                    current_address: locationData.address,
                    google_sql_string: googleSqlData.current,
                    tagMap: JSON.stringify(tagMap),
                  },
                })
              }
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={color} />
            </Pressable>
          }
        />

        {/* <ThemedText>{mealSettings?.id}</ThemedText> */}
        {/* <Pressable
          onPress={() =>
            router.navigate({
              pathname: "./match",
              params: { mealId: meal },
            })
          }
        >
          <ThemedText>Click for Match Route</ThemedText>
        </Pressable> */}
        <SwipeCard
          topCard={topCard}
          dataMap={mealRestaurants}
          next={cardNext}
          handleSwipe={handleSwipe}
          totalCards={totalUnseen}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    position: "relative",
  },
  safeArea: { alignItems: "center", alignSelf: "stretch", flex: 1 },
});
