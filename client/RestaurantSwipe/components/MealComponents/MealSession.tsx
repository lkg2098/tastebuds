import React, { useEffect, useRef, useState } from "react";
import socket from "@/utils/socket";
import { Pressable, View } from "react-native";
import { MealSettings } from "@/types/MealSettings";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MealRestaurant, Photo, RestaurantScore } from "@/types/Restaurant";
import { SocketResData, SocketSettingsData } from "@/types/SocketData";
import CardStack from "./CardStack";
import axiosAuth from "@/api/auth";
import { Meal } from "@/types/Meal";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "../ThemedText";
import HeaderBar from "../HeaderBar";
import { useThemeColor } from "@/hooks/useThemeColor";
import RankList from "./RankList";
import MealRanking from "./MealRanking";

export default function MealSession() {
  const {
    meal,
    name,
    location_id,
    location_coords,
    radius,
    date,
    min_rating,
    budget,
    preferences,
    members,
    round,
  } = useLocalSearchParams<{
    meal: string;
    name: string;
    location_id: string;
    location_coords: string;
    radius: string;
    date: string;
    min_rating: string;
    budget: string;
    preferences: string;
    members: string;
    round: string;
  }>();
  const router = useRouter();
  const memberId = useRef();
  const [socketResData, setSocketResData] = useState<SocketResData>();
  const [socketSettings, setSocketSettings] = useState<SocketSettingsData>();
  const [mealSettings, setMealSettings] = useState<Meal>({
    meal_name: name,
    id: meal,
    location_coords: location_coords ? JSON.parse(location_coords) : undefined,
    distance: Number(radius),
    date: new Date(date),
    members: members ? JSON.parse(members) : [],
    place_id: location_id,
    budget: budget ? JSON.parse(budget) : [],
    badPreferences: preferences ? JSON.parse(preferences) : [],
    round: Number(round),
  });
  const [mealRestaurants, setMealRestaurants] = useState<MealRestaurant>({});
  const [scoresOutOfDate, setScoresOutOfDate] = useState(true);
  const [memberRound, setMemberRound] = useState<number>();

  const [tagMap, setTagMap] = useState<{ [key: string]: boolean }>();
  let rating_tags_string = useRef("");
  let price_level_hours_array = useRef("");

  const color = useThemeColor({}, "text");

  useEffect(() => {
    if (location_id && radius && budget && date) {
      let dist = Number(radius);
      let budg = JSON.parse(budget);
      let datetime = new Date(date);
      let coords = location_coords ? JSON.parse(location_coords) : [];
      console.log("all necessary data");
      getMemberSettings()
        .then((value) => {
          console.log("HERE");
          // console.log(meal, value.member_id);
          memberId.current = value.member_id;
          setMemberRound(value.round);
          socket.emit("joinMeal", meal, value.member_id);
          console.log(value.settings);
          if (value.settings.rating === null) {
            router.push({
              pathname: "./preferences",
              params: { mealId: meal },
            });
          }
          if (value.round == 0) {
            getGoogleData(location_id, dist, budg, datetime, coords)
              .then((restaurantsMap) => {
                setMealRestaurants(restaurantsMap);
              })
              .catch((err) => {
                console.log(err);
              });
          } else {
            checkRestaurantData().then((restaurantsExist) => {
              console.log("restaurants exist", restaurantsExist);
              if (restaurantsExist) {
                getGoogleData(location_id, dist, budg, datetime, coords)
                  .then((restaurantsMap) => {
                    setMealRestaurants(restaurantsMap);
                    if (value.settings.rating !== null) {
                      handleScoresOOD(true);
                    }
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              } else {
                updateGoogleData(location_id, dist, budg, datetime, coords)
                  .then((restaurantsMap) => {
                    setMealRestaurants(restaurantsMap);
                    if (value.settings.rating) {
                      handleScoresOOD(true);
                    }
                  })
                  .catch((err) => console.log(err));
              }
            });
          }
        })
        .catch((err) => {
          console.log(err);
        });

      setMealSettings((prev) => {
        return {
          ...prev,
          id: meal,
          meal_name: name || "",
          place_id: location_id,
          distance: dist,
          date: datetime,
          budget: budg,
          members: [] as string[],
        };
      });
    } else {
      console.log("Not all necessary data present");
    }

    socket.on("newResData", (data, action) => {
      console.log(
        `${memberId.current} received new data: ${data.id}, ${data.score}, ${action}`
      );
      setSocketResData({ data: data, action: action });
    });
    socket.on("match", (data) => {
      setSocketResData({ data: data, action: "match" });
    });
    socket.on("settingsUpdate", (settings) => {
      console.log(memberId, "SETTINGS UPDATE RECEIVED", settings);
      if (Object.keys(settings).length > 0) {
        setSocketSettings(settings);
      } else {
        handleScoresOOD(true);
      }
    });
    socket.on("sessionDeleted", () => {
      socket.emit("leaveMeal", meal);
      router.navigate("/(tabs)");
    });
    return () => {
      socket.off("newResData");
      socket.off("match");
      socket.off("settingsUpdate");
      socket.off("sessionDeleted");
    };
  }, []);

  useEffect(() => {
    console.log("SETTINGS CHANGE");
    console.log(
      date,
      location_id,
      radius,
      budget,
      min_rating,
      preferences,
      members
    );
    if (memberId.current) {
      console.log("updating data");
      const newDate = date ? new Date(date) : undefined;
      const newLocation = location_id;
      const newDistance = radius ? Number(radius) : undefined;
      const newBudget = budget ? JSON.parse(budget) : undefined;

      updateRestaurantData(
        {
          date: newDate,
          location_id: newLocation,
          radius: newDistance,
          budget: newBudget,
        },
        "update"
      );

      socket.emit("settingsChange", meal, {
        date,
        location_id,
        radius,
        budget,
      });
    }
  }, [date, location_id, radius, budget, min_rating, preferences, members]);

  useEffect(() => {
    if (socketResData) {
      let data = socketResData.data;
      if (socketResData.action == "match") {
        let chosenRestaurant = mealRestaurants[data.id];
        if (chosenRestaurant) {
          router.navigate({
            pathname: "/matchAnim",
            params: { data: JSON.stringify(chosenRestaurant) },
          });
        }
        handleRestaurantScore(data.id, data.score);
      }
    }
  }, [socketResData]);

  useEffect(() => {
    console.log(memberId, "Socket Settings Update", socketSettings);
    if (socketSettings) {
      updateRestaurantData({ ...socketSettings }, "update");
    }
  }, [socketSettings]);

  const getMemberSettings = async () => {
    try {
      let response = await axiosAuth.get(`/meals/${meal}/preferences`, {
        params: { setting: "all" },
      });
      if (response.data) {
        setMemberRound(response.data.round);
      }
      return response.data;
    } catch (err) {
      console.log(err);
    }
  };

  // check if the meal has any restaurants set.
  // If no google data has been fetched before, this will return false
  const checkRestaurantData = async () => {
    try {
      let response = await axiosAuth.get(`/meals/${meal}/restaurants/check`);
      return response.data.restaurantsExist;
    } catch (err) {
      console.log(err);
    }
  };

  const getGoogleData = async (
    location: string,
    radius: number,
    budget: Array<number>,
    date: Date,
    coords?: Array<number>
  ) => {
    try {
      let response = await axiosAuth.get(`/meals/${meal}/googleData`, {
        params: {
          location_id: location,
          location_coords: coords || [],
          radius: radius,
          budget: budget,
          date: date,
        },
      });
      if (response.status == 200) {
        const { restaurantsMap, tag_map, locationInfo } = response.data;
        handleGoogleData(restaurantsMap, tag_map, {
          ...locationInfo,
          coords: coords,
        });
        return restaurantsMap;
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const updateGoogleData = async (
    location: string,
    radius: string | number,
    budget: Array<number>,
    date: Date,
    coords?: Array<number>
  ) => {
    try {
      let response = await axiosAuth.put(
        `/meals/${meal}/googleData`,
        {},
        {
          params: {
            location_id: location,
            location_coords: coords || [],
            radius: radius,
            budget: budget,
            date: date,
          },
        }
      );
      if (response.status == 200) {
        const { restaurantsMap, tag_map, locationInfo } = response.data;
        handleGoogleData(restaurantsMap, tag_map, {
          ...locationInfo,
          coords: coords,
        });
        return restaurantsMap;
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleGoogleData = (
    restaurantsMap: MealRestaurant,
    tag_map: { [key: string]: boolean },
    locationInfo: {
      location: string;
      coords: Array<number>;
      address: string;
    }
  ) => {
    let { rating_tags, price_level_hours } =
      getGoogleSettingsInfo(restaurantsMap);
    setMealSettings((prev) => {
      return {
        ...prev,
        location_id: locationInfo.location,
        location_coords: locationInfo.coords,
        address: locationInfo.address,
      };
    });
    setTagMap(tag_map);
    rating_tags_string.current = rating_tags;
    price_level_hours_array.current = price_level_hours;
    router.setParams({
      google_data_string: rating_tags,
      tag_map: JSON.stringify(tag_map),
    });
  };

  // creates input arrays for future settings manipulation
  const getGoogleSettingsInfo = (googleData: MealRestaurant) => {
    let ids = Object.keys(googleData);
    let rating_tags = [] as Array<{
      res_id: number;
      rating: number | null;
      tags: Array<string>;
    }>;
    let price_level_hours = [] as Array<{
      res_id: number;
      priceLevel: string | null;
      regularOpeningHours: Array<{
        open: { day: number; hour: number; minute: number };
        close: { day: number; hour: number; minute: number };
      }>;
    }>;

    for (let id of ids) {
      rating_tags.push({
        res_id: Number(id),
        rating: googleData[id].rating || null,
        tags: googleData[id].tags || [],
      });
      price_level_hours.push({
        res_id: Number(id),
        priceLevel: googleData[id].priceLevel || null,
        regularOpeningHours: googleData[id].regularOpeningHours || [],
      });
    }

    return {
      rating_tags: JSON.stringify(rating_tags),
      price_level_hours: JSON.stringify(price_level_hours),
    };
  };

  const updateRestaurantData = async (
    data: {
      date?: Date;
      location_id?: string;
      radius?: number;
      budget?: Array<number>;
    },
    action: "update" | "fetch"
  ) => {
    try {
      if (mealSettings) {
        console.log("----Updating restaurant data...");

        // console.log(data);
        if (data.location_id || data.radius) {
          setMealRestaurants({});
          console.log("----------------Updating google data");
          const location = data.location_id || mealSettings.place_id;
          const dist = data.radius || mealSettings.distance;
          const budget = data.budget || mealSettings.budget;
          const date = data.date || mealSettings.date;

          if (action == "update") {
            console.log("UPDATING");
            let restaurantMap = await updateGoogleData(
              location,
              dist,
              budget,
              new Date(date)
            );
            setMealRestaurants(restaurantMap);
          } else if (action == "fetch") {
            let restaurantMap = await getGoogleData(
              location,
              dist,
              budget,
              new Date(date)
            );
            setMealRestaurants(restaurantMap);
          }
        }

        handleScoresOOD(true);

        setMealSettings({
          ...mealSettings,
          meal_name: name || mealSettings.meal_name,
          place_id: data.location_id || mealSettings.place_id,
          distance: data.radius || mealSettings.distance,
          date: data.date || mealSettings.date,
          budget: data.budget || mealSettings.budget,
        });
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleRestaurantScore = (resId: number, score: number) => {
    setMealRestaurants((prev) => {
      return { ...prev, [resId]: { ...prev[resId], score: score } };
    });
  };

  const handleMealRestaurants = (data: MealRestaurant) => {
    setMealRestaurants(data);
  };

  const handleScoresOOD = (value: boolean) => {
    setScoresOutOfDate(value);
  };

  const updateRestaurant = async (
    id: string,
    action: "like" | "dislike" | "veto"
  ) => {
    //console.log(meal);
    try {
      await axiosAuth.put(`/meals/${meal}/members/restaurants`, {
        res_id: id,
        action: action,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const handleUpdateRound = async () => {
    try {
      const response = await axiosAuth.get(`/meals/${meal}/round`);
      console.log("HANDLE UPDATE RESPONSE", response.data);
      if (response.data.meal_round !== undefined) {
        if (response.data.meal_round == 1) {
          setMealSettings((prev) => {
            return { ...prev, round: 1 };
          });
        }
      } else if (response.data.chosen_restaurant) {
        router.navigate({
          pathname: "/matchAnim",
          params: {
            data: JSON.stringify(
              mealRestaurants[response.data.chosen_restaurant]
            ),
          },
        });
      } else if (response.data.remainingMembers) {
        // set notify array to remaining members array;
        console.log(response.data.remainingMembers);
        return response.data.remainingMembers;
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleGoToRankRound = async () => {
    try {
      const response = await axiosAuth.put(`/meals/${meal}/members/round`, {
        round: 1,
      });
      if (response.data?.round) {
        setMemberRound(response.data.round);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleMemberRound = (round: number) => {
    setMemberRound(round);
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

  const handleNewPhotoData = (id: string, photos: Array<Photo>) => {
    let resMapCopy = { ...mealRestaurants };
    resMapCopy[id].photos = photos;
    handleMealRestaurants(resMapCopy);
  };

  return (
    <View style={{ flex: 1, alignSelf: "stretch" }}>
      <HeaderBar
        style={{ alignItems: "flex-start" }}
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
          <View style={{ alignItems: "center" }}>
            <ThemedText type="subtitle">{mealSettings?.meal_name}</ThemedText>
            <ThemedText type="secondary" style={{ fontSize: 12 }}>
              {mealSettings.address && `Near ${mealSettings.address}`}
            </ThemedText>
          </View>
        }
        headerRight={
          <Pressable
            onPress={() =>
              router.push({
                pathname: "./createMeal",
                params: {
                  mealId: meal,
                  place_id: mealSettings.id,
                  current_address: mealSettings.address,
                  google_data_string: rating_tags_string.current,
                  google_price_hours_array: price_level_hours_array.current,
                  tagMap: JSON.stringify(tagMap),
                },
              })
            }
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={color} />
          </Pressable>
        }
      />
      <ThemedText>
        {mealSettings.id}, {mealSettings.round}
      </ThemedText>
      {memberRound == 0 ? (
        <CardStack
          memberId={memberId.current || 0}
          mealRestaurants={mealRestaurants}
          handleMealRestaurants={handleMealRestaurants}
          socketResData={socketResData}
          updateRestaurant={updateRestaurant}
          handleMatch={handleMatch}
          round={mealSettings.round}
          handleUpdateRound={handleUpdateRound}
          handleNextRound={handleGoToRankRound}
          scoresOutOfDate={scoresOutOfDate}
          handleScoresOOD={handleScoresOOD}
          handleNewPhotoData={handleNewPhotoData}
        />
      ) : (
        <MealRanking
          mealRestaurants={mealRestaurants}
          memberRound={memberRound}
          handleMemberRound={handleMemberRound}
          updateRound={handleUpdateRound}
          handleNewPhotoData={handleNewPhotoData}
        />
      )}
    </View>
  );
}
