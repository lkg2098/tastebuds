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
import { MealRestaurant, Photo, Restaurant } from "@/types/Restaurant";
import RestaurantList, { RestaurantNode } from "@/utils/restaurantList";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "@/hooks/useThemeColor";
import SwipeCard from "@/components/MealComponents/SwipeCard";
import { Ionicons } from "@expo/vector-icons";
import socket from "@/utils/socket";
import axiosAuth from "@/api/auth";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { filter_by_budget, filter_by_hours } from "@/utils/restaurant_filters";
// import { Meal } from "@/types/Meal";
import MealSession from "@/components/MealComponents/MealSession";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderBar from "@/components/HeaderBar";
import MealRanking from "@/components/MealComponents/MealRanking";

type RestaurantScore = {
  res_id: string;
  unseen: boolean;
  total_score: number;
  disliked: boolean;
  vetoed: boolean;
  approved_by_user: number;
  user_raw_score: number;
  hidden_from_user: boolean;
  is_open: boolean;
  in_budget: boolean;
};

export default function MealSwipe() {
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
  // const router = useRouter();
  //   const [loading, setLoading] = useState(true);
  //   const [mealSettings, setMealSettings] = useState<Meal>();
  //   const [mealRound, setMealRound] = useState(round ? Number(round) : 0);
  //   const [memberRound, setMemberRound] = useState();
  //   const settingsRef = useRef<Meal>();
  // const memberId = useRef();
  //   const [locationData, setLocationData] = useState<{
  //     id: string;
  //     coords?: Array<number>;
  //     address: string;
  //   }>({
  //     id: location_id,
  //     address: "",
  //   });
  //   const locationRef = useRef(locationData);

  //   let rating_tags_string = useRef("");
  //   let price_level_hours_array = useRef("");

  //   const [tagMap, setTagMap] = useState();

  //   const [mealRestaurants, setMealRestaurants] = useState<MealRestaurant>({});
  //   const restaurantsRef = useRef(mealRestaurants);

  //   // --------- Stack States ---->
  //   const [liked, setLiked] = useState<RestaurantList>(new RestaurantList());
  //   const likedRef = useRef(liked);
  //   const [disliked, setDisliked] = useState<RestaurantList>(
  //     new RestaurantList()
  //   );
  //   const dislikedRef = useRef(disliked);
  //   const [unseen, setUnseen] = useState<RestaurantList>(new RestaurantList());
  //   const unseenRef = useRef(unseen);

  //   const [topCard, setTopCard] = useState<{ id: string; score: number }>();
  //   const topCardRef = useRef(topCard);
  //   const [cardNext, setCardNext] = useState<RestaurantNode>();
  //   const cardNextRef = useRef(cardNext);
  //   // --------------------------->

  //   const color = useThemeColor({}, "text");
  //   const tintColor = useThemeColor({}, "tint");

  //   const getMemberSettings = async () => {
  //     try {
  //       let response = await axiosAuth.get(`/meals/${meal}/preferences`, {
  //         params: { setting: "all" },
  //       });
  //       console.log(response.data);
  //       if (response.data) {
  //         setMemberRound(response.data.round);
  //       }
  //       return response.data;
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   };

  //   const getGoogleData = async (
  //     location: string,
  //     radius: string,
  //     budget: Array<number>,
  //     date: Date,
  //     coords?: Array<number>
  //   ) => {
  //     try {
  //       let response = await axiosAuth.get(`meals/${meal}/googleData`, {
  //         params: {
  //           location_id: location,
  //           location_coords: coords || [],
  //           radius: radius,
  //           budget: budget,
  //           date: date,
  //         },
  //       });
  //       if (response.status == 200) {
  //         const { restaurantsMap, tag_map, locationInfo } = response.data;
  //         let { rating_tags, price_level_hours } =
  //           getGoogleSettingsInfo(restaurantsMap);
  //         setTagMap(tag_map);
  //         setLocationData({
  //           id: locationInfo.location,
  //           coords: coords,
  //           address: locationInfo.address,
  //         });
  //         rating_tags_string.current = rating_tags;
  //         price_level_hours_array.current = price_level_hours;

  //         router.setParams({
  //           google_data_string: rating_tags,
  //           tag_map: JSON.stringify(tag_map),
  //         });

  //         return restaurantsMap;
  //       }
  //     } catch (err) {
  //       console.log(err);
  //       return false;
  //     }
  //   };

  //   const updateGoogleData = async (
  //     location: string,
  //     radius: string | number,
  //     budget: Array<number>,
  //     date: Date,
  //     coords?: Array<number>
  //   ) => {
  //     try {
  //       let response = await axiosAuth.put(
  //         `/meals/${meal}/googleData`,
  //         {},
  //         {
  //           params: {
  //             location_id: location,
  //             location_coords: coords || [],
  //             radius: radius,
  //             budget: budget,
  //             date: date,
  //           },
  //         }
  //       );
  //       if (response.status == 200) {
  //         const { restaurantsMap, tag_map, locationInfo } = response.data;
  //         let { rating_tags, price_level_hours } =
  //           getGoogleSettingsInfo(restaurantsMap);
  //         setTagMap(tag_map);
  //         setLocationData({
  //           id: locationInfo.location,
  //           coords: coords,
  //           address: locationInfo.address,
  //         });
  //         rating_tags_string.current = rating_tags;
  //         price_level_hours_array.current = price_level_hours;

  //         router.setParams({
  //           google_data_string: rating_tags,
  //           tag_map: JSON.stringify(tag_map),
  //         });
  //         return restaurantsMap;
  //       }
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   };

  //   // creates input arrays for future settings manipulation
  //   const getGoogleSettingsInfo = (googleData: MealRestaurant) => {
  //     let ids = Object.keys(googleData);
  //     let rating_tags = [] as Array<{
  //       res_id: number;
  //       rating: number | null;
  //       tags: Array<string>;
  //     }>;
  //     let price_level_hours = [] as Array<{
  //       res_id: number;
  //       priceLevel: string | null;
  //       regularOpeningHours: Array<{
  //         open: { day: number; hour: number; minute: number };
  //         close: { day: number; hour: number; minute: number };
  //       }>;
  //     }>;

  //     for (let id of ids) {
  //       rating_tags.push({
  //         res_id: Number(id),
  //         rating: googleData[id].rating || null,
  //         tags: googleData[id].tags || [],
  //       });
  //       price_level_hours.push({
  //         res_id: Number(id),
  //         priceLevel: googleData[id].priceLevel || null,
  //         regularOpeningHours: googleData[id].regularOpeningHours || [],
  //       });
  //     }

  //     return {
  //       rating_tags: JSON.stringify(rating_tags),
  //       price_level_hours: JSON.stringify(price_level_hours),
  //     };
  //   };

  //   const getMealScores = async () => {
  //     try {
  //       let response = await axiosAuth.get(`/meals/${meal}/restaurants`);
  //       if (response.data) {
  //         console.log(response.data);
  //         return response.data.scores;
  //       }
  //     } catch (err) {
  //       console.log(err);
  //       return false;
  //     }
  //   };

  //   const updateRestaurantData = async (
  //     data: {
  //       date?: string;
  //       location_id?: string;
  //       radius?: string;
  //       budget?: string;
  //       min_rating?: string;
  //       preferences?: string;
  //     },
  //     action: "update" | "fetch"
  //   ) => {
  //     try {
  //       console.log(memberId.current, settingsRef.current);
  //       const settings = settingsRef.current;
  //       if (settings) {
  //         console.log("----Updating restaurant data...");
  //         let map = restaurantsRef.current;
  //         let locationInfo = locationRef.current;

  //         console.log(data);
  //         if (data.location_id || data.radius) {
  //           console.log("----------------Updating google data");
  //           const location = data.location_id || settings?.place_id;
  //           const dist = data.radius || settings.distance;
  //           const budget = data.budget
  //             ? JSON.parse(data.budget)
  //             : settings.budget;
  //           const date = data.date || settings.date;

  //           if (action == "update") {
  //             console.log("UPDATING");
  //             let restaurantMap = await updateGoogleData(
  //               location,
  //               dist,
  //               budget,
  //               new Date(date)
  //             );
  //             map = restaurantMap;
  //           } else if (action == "fetch") {
  //             let restaurantMap = await getGoogleData(
  //               location,
  //               `${dist}`,
  //               budget,
  //               new Date(date)
  //             );
  //             map = restaurantMap;
  //           }
  //         }

  //         let scores = await getMealScores();
  //         console.log(scores);
  //         let match = createRestaurantLists({ ...map }, scores);

  //         setMealSettings({
  //           ...settings,
  //           meal_name: name || settings.meal_name,
  //           place_id: data.location_id || settings.place_id,
  //           distance: data.radius ? Number(data.radius) : settings.distance,
  //           date: data.date ? new Date(data.date) : settings.date,
  //           budget: data.budget ? JSON.parse(data.budget) : settings.budget,
  //         });

  //         return match;
  //       }
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   };

  //   const handleNewPhotoData = (id: string, photos: Array<Photo>) => {
  //     let resMapCopy = { ...mealRestaurants };
  //     resMapCopy[id].photos = photos;
  //     setMealRestaurants(resMapCopy);
  //   };

  //   const handleUpdateRound = async () => {
  //     try {
  //       const response = await axiosAuth.get(`/meals/${meal}/round`);
  //       console.log("HANDLE UPDATE RESPONSE", response.data);
  //       if (response.data.meal_round !== undefined) {
  //         if (response.data.meal_round == 1) {
  //           setMealRound(1);
  //         }
  //       } else if (response.data.chosen_restaurant) {
  //         router.navigate({
  //           pathname: "/matchAnim",
  //           params: {
  //             data: JSON.stringify(
  //               mealRestaurants[response.data.chosen_restaurant]
  //             ),
  //           },
  //         });
  //       } else if (response.data.remainingMembers) {
  //         // set notify array to remaining members array;
  //         console.log(response.data.remainingMembers);
  //       }
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   };

  //   const updateMemberRound = async () => {
  //     try {
  //       const response = await axiosAuth.put(`/meals/${meal}/members/round`);
  //       if (response.data.round) {
  //         setMemberRound(response.data.round);
  //       }
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   };
  //   // ------ Stack Functions -------------->
  //   const createRestaurantLists = (
  //     map: MealRestaurant,
  //     scores: Array<RestaurantScore>
  //   ) => {
  //     let restaurantMap = {} as MealRestaurant;
  //     let liked = new RestaurantList();
  //     let disliked = new RestaurantList();
  //     let unseen = new RestaurantList();

  //     let match;
  //     if (map) restaurantMap = map;

  //     for (let res of scores) {
  //       if (restaurantMap[res.res_id]) {
  //         console.log(restaurantMap[res.res_id].name, res.total_score);
  //         if (res.total_score == 1 && !match) {
  //           match = res.res_id;
  //         }

  //         restaurantMap[res.res_id].id = res.res_id;
  //         restaurantMap[res.res_id].approvedByUser = res.approved_by_user;
  //         restaurantMap[res.res_id].score = res.total_score;
  //         restaurantMap[res.res_id].userScore = res.user_raw_score;
  //         restaurantMap[res.res_id].hidden = res.hidden_from_user;
  //         restaurantMap[res.res_id].vetoed = res.vetoed;
  //         restaurantMap[res.res_id].disliked = res.disliked;
  //         restaurantMap[res.res_id].unseen = res.unseen;
  //         restaurantMap[res.res_id].inBudget = res.in_budget;
  //         restaurantMap[res.res_id].open = res.is_open;

  //         // if not vetoed and approved by user = 0
  //         if (
  //           !res.vetoed &&
  //           res.approved_by_user == 0 &&
  //           restaurantMap[res.res_id].open &&
  //           restaurantMap[res.res_id].inBudget !== false &&
  //           (!topCardRef.current || topCardRef.current.id != res.res_id)
  //         ) {
  //           // console.log(
  //           //   restaurantMap[res.res_id].name,
  //           //   restaurantMap[res.res_id].hidden
  //           // );
  //           // restaurants that are hidden are only hidden if
  //           // no one else in the session has voted on them
  //           if (res.unseen) {
  //             if (!res.hidden_from_user) {
  //               unseen.append({
  //                 id: res.res_id,
  //                 score: Number(res.total_score),
  //               });
  //             }
  //           } else if (res.disliked) {
  //             disliked.append({
  //               id: `${res.res_id}`,
  //               score: Number(res.total_score),
  //             });
  //           } else if (!res.disliked) {
  //             liked.append({ id: res.res_id, score: Number(res.total_score) });
  //           }
  //         }
  //       }
  //     }
  //     console.log(unseen.toString());
  //     console.log(restaurantMap);
  //     if (topCardRef.current && restaurantMap[topCardRef.current.id]) {
  //       setTopCard({
  //         id: topCardRef.current.id,
  //         score:
  //           restaurantMap[topCardRef.current.id].score ||
  //           topCardRef.current.score,
  //       });
  //     } else {
  //       if (liked.head) {
  //         setTopCard(liked.head.value);
  //         liked.pop();
  //       } else if (unseen.head) {
  //         console.log(unseen.head.value);
  //         console.log(topCardRef);
  //         setTopCard(unseen.head.value);
  //         unseen.pop();
  //       } else if (disliked.head) {
  //         setTopCard(disliked.head.value);
  //         disliked.pop();
  //       } else {
  //         setTopCard(undefined);
  //       }
  //     }
  //     if (liked.head) {
  //       setCardNext(liked.head);
  //     } else if (unseen.head) {
  //       setCardNext(unseen.head);
  //     } else if (disliked.head) {
  //       setCardNext(disliked.head);
  //     } else {
  //       setCardNext(undefined);
  //     }

  //     setMealRestaurants(restaurantMap);
  //     setLiked(liked);
  //     setUnseen(unseen);
  //     setDisliked(disliked);

  //     if (match) {
  //       return match;
  //     }
  //     return;
  //   };

  //   const handleSwipe = async (approved: boolean, id: string, score: number) => {
  //     // console.log(approved);
  //     // console.log(id);
  //     // console.log(score);
  //     // console.log(mealRestaurants[id].userScore);
  //     const newScore =
  //       approved && mealRestaurants[id].userScore
  //         ? score / mealRestaurants[id].userScore
  //         : score * 10;
  //     // console.log(newScore);
  //     setMealRestaurants((prev) => ({
  //       ...prev,
  //       [id]: {
  //         ...prev[id],
  //         approvedByUser: approved ? 1 : -1,
  //         score: newScore,
  //         disliked: prev[id].disliked || !approved,
  //       },
  //     }));
  //     if (cardNext) {
  //       setTopCard(cardNext.value);
  //       if (cardNext.value.id == liked.head?.value.id) {
  //         liked.pop();
  //       } else if (cardNext.value.id == unseen.head?.value.id) {
  //         unseen.pop();
  //       } else if (cardNext.value.id == disliked.head?.value.id) {
  //         disliked.pop();
  //       }
  //       if (liked.head) {
  //         setCardNext(liked.head);
  //       } else if (unseen.head) {
  //         setCardNext(unseen.head);
  //       } else if (disliked.head) {
  //         setCardNext(disliked.head);
  //       } else {
  //         setCardNext(undefined);
  //       }
  //     } else {
  //       setTopCard(undefined);
  //     }

  //     if (approved) {
  //       socket.emit("like", meal, {
  //         id: id,
  //         score: newScore,
  //       });
  //       await updateRestaurant(id, "like");
  //       if (newScore == 1) {
  //         await handleMatch(id);
  //       }
  //     } else {
  //       socket.emit("dislike", meal, {
  //         id: id,
  //         score: newScore,
  //       });
  //       await updateRestaurant(id, "dislike");
  //     }
  //   };

  //   const handleLike = (id: string, score: number) => {
  //     console.log(id, score);
  //     let restaurantMap = restaurantsRef.current;
  //     let resData = restaurantMap[id];
  //     let currentCard = topCardRef.current;
  //     if (resData && resData.score != score) {
  //       if (currentCard?.id != id) {
  //         sortIntoLists(resData, score, true);
  //       } else {
  //         setTopCard({ id, score });
  //       }
  //       setMealRestaurants({
  //         ...restaurantMap,
  //         [id]: { ...resData, score: score },
  //       });
  //     } else if (!resData) {
  //       //call google data and add it to the map
  //     }
  //   };

  //   const handleDislike = (id: string, score: number) => {
  //     let restaurantMap = restaurantsRef.current;
  //     let resData = restaurantMap[id];
  //     let currentCard = topCardRef.current;
  //     if (resData && resData.score != score) {
  //       if (currentCard?.id != id) {
  //         sortIntoLists(resData, score, false);
  //       } else {
  //         setTopCard({ id, score });
  //       }
  //       setMealRestaurants({
  //         ...restaurantMap,
  //         [id]: { ...resData, score: score, disliked: true },
  //       });
  //     } else if (!resData) {
  //       // call data from google and add it to the map
  //     }
  //   };

  //   const swapLists = (
  //     deleteFrom: RestaurantList,
  //     addTo: RestaurantList,
  //     id: string,
  //     score: number
  //   ) => {
  //     deleteFrom.delete(id);
  //     let success = addTo.append({ id, score });
  //     if (!success) {
  //       addTo.insert({ id, score });
  //     }
  //   };

  //   const sortIntoLists = (
  //     data: Restaurant,
  //     score: number,
  //     approved: boolean
  //   ) => {
  //     console.log("sorting into lists");
  //     console.log(memberId.current);
  //     // console.log(data, score, approved);
  //     let likedList = likedRef.current;
  //     let unseenList = unseenRef.current;
  //     let dislikedList = dislikedRef.current;

  //     console.log(memberId.current, "LIKED BEFORE: ", likedList.toString(), "\n");
  //     console.log(memberId.current, "DISLIKED BEFORE: ", dislikedList.toString());
  //     console.log(memberId.current, "UNSEEN BEFORE: ", unseenList.toString());
  //     console.log(round);
  //     if (data.approvedByUser == 0) {
  //       if (data.disliked) {
  //         dislikedList.insertAndDelete({ id: data.id, score: score });
  //       } else if (data.unseen) {
  //         if (approved) {
  //           swapLists(unseenList, likedList, data.id, score);
  //         } else {
  //           swapLists(unseenList, dislikedList, data.id, score);
  //         }
  //       } else {
  //         if (approved) {
  //           likedList.insertAndDelete({ id: data.id, score: score });
  //         } else {
  //           swapLists(likedList, dislikedList, data.id, score);
  //         }
  //       }
  //       if (likedList.head) {
  //         setCardNext(likedList.head);
  //       } else if (unseenList.head) {
  //         setCardNext(unseenList.head);
  //       } else if (dislikedList.head) {
  //         setCardNext(dislikedList.head);
  //       } else {
  //         setCardNext(undefined);
  //       }

  //       console.log(
  //         memberId.current,
  //         "LIKED AFTER: ",
  //         likedList.toString(),
  //         "\n"
  //       );
  //       console.log(
  //         memberId.current,
  //         "DISLIKED AFTER: ",
  //         dislikedList.toString(),
  //         "\n"
  //       );
  //       console.log(
  //         memberId.current,
  //         "UNSEEN AFTER: ",
  //         unseenList.toString(),
  //         "\n"
  //       );
  //       setLiked(likedList);
  //       setUnseen(unseenList);
  //       setDisliked(dislikedList);
  //     }
  //   };

  //   let totalUnseen = useMemo(() => {
  //     const likedCount = liked?.length || 0;
  //     const dislikedCount = disliked?.length || 0;
  //     const unseenCount = unseen?.length || 0;
  //     const addTopCard = topCard ? 1 : 0;
  //     return likedCount + dislikedCount + unseenCount + addTopCard;
  //   }, [liked.length, disliked.length, unseen.length, topCard]);

  //   useEffect(() => {
  //     console.log(memberId.current, "unseen: ", unseen.toString());
  //   }, [unseen]);

  //   useEffect(() => {
  //     console.log(memberId.current, "liked: ", liked.toString());
  //   }, [liked]);

  //   useEffect(() => {
  //     console.log(memberId.current, "disliked: ", disliked.toString());
  //   }, [disliked]);

  //   useEffect(() => {
  //     cardNextRef.current = cardNext;
  //     if (cardNext == null) {
  //       handleUpdateRound();
  //     }
  //   }, [cardNext]);

  //   useEffect(() => {
  //     topCardRef.current = topCard;
  //   }, [topCard]);

  //   useEffect(() => {
  //     likedRef.current = liked;
  //   }, [liked.length]);

  //   useEffect(() => {
  //     unseenRef.current = unseen;
  //   }, [unseen.length]);

  //   useEffect(() => {
  //     dislikedRef.current = disliked;
  //   }, [disliked.length]);

  //   const handleMatch = async (id: string) => {
  //     try {
  //       let response = await axiosAuth.put(`/meals/${meal}`, {
  //         chosen_restaurant: id,
  //       });
  //       if (response.status == 200) {
  //         router.navigate({
  //           pathname: "/matchAnim",
  //           params: { data: JSON.stringify(mealRestaurants[id]) },
  //         });
  //       }
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   };

  //   // initial data fetch ------------------------------------
  //   useEffect(() => {
  //     console.log("initial useEffect");

  //     if (location_id && radius && budget && date) {
  //       console.log("all necessary data");
  //       getMemberSettings()
  //         .then((value) => {
  //           console.log("HERE");
  //           console.log(meal, value.member_id);
  //           memberId.current = value.member_id;
  //           socket.emit("joinMeal", meal, value.member_id);
  //           console.log(value.settings);
  //           if (value.settings.rating === null) {
  //             router.push({
  //               pathname: "./preferences",
  //               params: { mealId: meal },
  //             });
  //           }
  //           getMealScores().then((scores) => {
  //             if (scores.length) {
  //               getGoogleData(
  //                 location_id,
  //                 radius,
  //                 JSON.parse(budget),
  //                 new Date(date),
  //                 location_coords ? JSON.parse(location_coords) : []
  //               )
  //                 .then((restaurantsMap) => {
  //                   if (value.settings.rating) {
  //                     createRestaurantLists(restaurantsMap, scores);
  //                   } else {
  //                     setMealRestaurants(restaurantsMap);
  //                   }
  //                 })
  //                 .catch((err) => {
  //                   console.log(err);
  //                 });
  //             } else {
  //               updateGoogleData(
  //                 location_id,
  //                 radius,
  //                 JSON.parse(budget),
  //                 new Date(date),
  //                 location_coords ? JSON.parse(location_coords) : []
  //               )
  //                 .then((restaurantsMap) => {
  //                   if (value.settings.rating) {
  //                     getMealScores().then((newScores) => {
  //                       createRestaurantLists(restaurantsMap, newScores);
  //                     });
  //                   } else {
  //                     setMealRestaurants(restaurantsMap);
  //                   }
  //                 })
  //                 .catch((err) => console.log(err));
  //             }
  //           });
  //         })
  //         .catch((err) => {
  //           console.log(err);
  //         });
  //       console.log("made it to meal settings");
  //       setMealSettings({
  //         id: meal,
  //         meal_name: name || "",
  //         place_id: location_id,
  //         distance: Number(radius),
  //         date: new Date(date),
  //         budget: budget ? JSON.parse(budget) : [],
  //         members: [] as string[],
  //       });
  //     } else {
  //       console.log("Not all necessary data present");
  //     }
  //   }, []);

  //   // useEffect(() => {
  //   //   console.log("mealSettings: ", mealSettings);
  //   // }, [mealSettings]);

  //   // refetch data on change settings---------------------------------
  //   useEffect(() => {
  //     console.log("SETTINGS CHANGE");
  //     if (mealSettings) {
  //       console.log("updating data");
  //       console.log(
  //         date,
  //         location_id,
  //         radius,
  //         budget,
  //         min_rating,
  //         preferences,
  //         members
  //       );
  //       updateRestaurantData(
  //         {
  //           date: date,
  //           location_id: location_id,
  //           radius: radius,
  //           budget: budget,
  //           min_rating: min_rating,
  //           preferences: preferences,
  //         },
  //         "update"
  //       ).then((match) => {
  //         if (match) {
  //           console.log(match);
  //           socket.emit("like", meal, { id: match, score: 1 });
  //           handleMatch(match);
  //         } else {
  //           console.log(memberId.current, "EMITTING SETTINGS UPDATE");
  //           socket.emit("settingsChange", meal, {
  //             date,
  //             location_id,
  //             radius,
  //             budget,
  //             min_rating,
  //             preferences,
  //           });
  //         }
  //       });
  //     }
  //   }, [date, location_id, radius, budget, min_rating, preferences, members]);

  //   useEffect(() => {
  //     restaurantsRef.current = mealRestaurants;
  //   }, [mealRestaurants]);

  //   useEffect(() => {
  //     settingsRef.current = mealSettings;
  //   }, [mealSettings]);

  //   useEffect(() => {
  //     locationRef.current = locationData;
  //   }, [locationData]);

  //   useEffect(() => {
  //     socket.on("newResData", (data, liked) => {
  //       console.log("LIKED OR DISLIKED");
  //       console.log(
  //         memberId.current,
  //         "received new data",
  //         data,
  //         restaurantsRef.current[data.id].name
  //       );
  //       if (liked == 1) {
  //         handleLike(data.id, data.score);
  //       } else {
  //         handleDislike(data.id, data.score);
  //       }
  //     });
  //     socket.on("match", (data) => {
  //       console.log(`FOUND A MATCH! ${data.id}`);
  //       router.navigate({
  //         pathname: "/matchAnim",
  //         params: { data: JSON.stringify(restaurantsRef.current[data.id]) },
  //       });
  //     });
  //     socket.on("settingsUpdate", (newSettings) => {
  //       console.log(`OTHER MEMBER'S SETTIGNS UPDATED!`);
  //       // console.log(
  //       //   memberId.current,
  //       //   `OTHER MEMBER'S SETTIGNS UPDATED!`,
  //       //   newSettings
  //       // );

  //       updateRestaurantData(newSettings, "fetch");
  //     });
  //     socket.on("sessionDeleted", () => {
  //       socket.emit("leaveMeal", meal);
  //       router.navigate("/(tabs)");
  //     });

  //     return () => {
  //       socket.off("newResData");
  //       socket.off("match");
  //       socket.off("settingsUpdate");
  //       socket.off("sessionDeleted");
  //     };
  //   }, [socket]);

  //   const updateRestaurant = async (id: string, action: string) => {
  //     //console.log(meal);
  //     try {
  //       await axiosAuth.put(`/meals/${meal}/members/restaurants`, {
  //         res_id: id,
  //         action: action,
  //       });
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   };

  return (
    <LinearGradient
      colors={[useThemeColor({}, "tint"), "#500B04"]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* <ThemedText>{mealRound.current}</ThemedText>
        <ThemedText>{liked.toString()}</ThemedText>
        <ThemedText>{unseen.toString()}</ThemedText>
        <ThemedText>{disliked.toString()}</ThemedText> */}
        {/* <ThemedText>{mealRound}</ThemedText>
        <ThemedText>{memberRound}</ThemedText>
        {memberRound == 0 ? (
          <SwipeCard
            canUpdate={mealRound == 1}
            topCard={topCard}
            dataMap={mealRestaurants}
            next={cardNext}
            handleSwipe={handleSwipe}
            totalCards={totalUnseen}
            handleNewPhotoData={handleNewPhotoData}
            handleNextRound={updateMemberRound}
          />
        ) : (
          <MealRanking mealRestaurants={mealRestaurants} />
        )} */}
        <MealSession />
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
