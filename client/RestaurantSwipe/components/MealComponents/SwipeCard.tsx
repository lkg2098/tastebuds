import { useThemeColor } from "@/hooks/useThemeColor";
import RestaurantList, { RestaurantNode } from "@/utils/restaurantList";
import { transform } from "@babel/core";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import StarRating from "react-native-star-rating-widget";
import RestaurantCard from "./RestaurantCard";
import { ThemedText } from "../ThemedText";
import { MealRestaurant, Photo, Restaurant } from "@/types/Restaurant";
import { ThemedButton } from "../ThemedButton";
import { ThemedView } from "../ThemedView";

export default function SwipeCard({
  topCard,
  dataMap,
  next,
  handleSwipe,
  totalCards,
  handleNewPhotoData,
  canUpdate,
  handleNextRound,
}: {
  topCard?: { id: string; score: number } | null;
  dataMap: MealRestaurant;
  next?: RestaurantNode | null;
  handleSwipe: Function;
  totalCards: number;
  handleNewPhotoData: (id: string, photos: Array<Photo>) => void;
  canUpdate: boolean;
  handleNextRound: () => Promise<void>;
}) {
  const { width, height } = Dimensions.get("screen");
  const backgroundColor = useThemeColor({}, "background");
  const backCardColor = useColorScheme() == "dark" ? "black" : "#a6a6a6";
  const tintColor = useThemeColor({}, "tint");

  const swipe = useRef(new Animated.ValueXY()).current;
  const sticky = useRef(new Animated.ValueXY()).current;
  const slideOut = useRef(new Animated.Value(0)).current;

  const [swiped, setSwiped] = useState(0 | 1 | 2);
  const [topCardData, setTopCardData] = useState<Restaurant>();
  const [nextCardData, setNextCardData] = useState<Restaurant>();

  const fadeOut = slideOut.interpolate({
    inputRange: [-30, 0],
    outputRange: [0, 1.0],
  });

  const rotate = swipe.x.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: ["-8deg", "0deg", "8deg"],
  });

  const stickyRotate = sticky.x.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: ["-8deg", "0deg", "8deg"],
  });

  const opacity = swipe.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: [0, 1.0, 0],
  });

  const scale = swipe.x.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1, 0.93, 1],
    extrapolate: "clamp",
  });

  const rise = swipe.x.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [-30, 0, -30],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (topCard) {
      if (dataMap[topCard.id]) {
        setTopCardData(dataMap[topCard.id]);
      } else {
        setTopCardData(undefined);
      }
    } else {
      setTopCardData(undefined);
    }
  }, [topCard, dataMap]);

  useEffect(() => {
    if (next?.value) {
      if (dataMap[next.value.id]) {
        setNextCardData(dataMap[next.value.id]);
      } else {
        setNextCardData(undefined);
      }
    } else {
      setNextCardData(undefined);
    }
  }, [next, dataMap]);

  useEffect(() => {
    if (swiped == 1) {
      if (topCard) handleSwipe(true, topCard.id, topCard.score);
      setSwiped(0);
    } else if (swiped == 2) {
      if (topCard) handleSwipe(false, topCard.id, topCard.score);
      setSwiped(0);
    }
  }, [swiped]);

  const removeTopCard = useCallback(
    (yes: boolean) => {
      if (yes) {
        setSwiped(1);
      } else {
        setSwiped(2);
      }
      swipe.setValue({ x: 0, y: 0 });
    },
    [swipe]
  );

  const buttonYes = () => {
    Animated.timing(swipe, {
      duration: 350,
      toValue: { x: width + 200, y: 100 },
      useNativeDriver: true,
    }).start(() => removeTopCard(true));
  };

  const buttonNo = () => {
    Animated.timing(swipe, {
      duration: 300,
      toValue: { x: -1 * (width + 200), y: 100 },
      useNativeDriver: true,
    }).start(() => removeTopCard(false));
  };

  const buttonVeto = () => {
    Animated.sequence([
      Animated.timing(swipe, {
        duration: 100,
        toValue: { x: -10, y: -100 },
        useNativeDriver: true,
        easing: Easing.bounce,
      }),
      Animated.timing(swipe, {
        duration: 900,
        toValue: { x: -100, y: 1000 },
        useNativeDriver: true,
      }),
    ]).start(() => {
      swipe.setValue({ x: 0, y: 0 });
    });
  };

  const transitionOut = async () => {
    Animated.timing(slideOut, {
      duration: 500,
      toValue: -30,
      useNativeDriver: true,
    }).start(async () => {
      try {
        await handleNextRound();
      } catch (err) {
        console.log(err);
        Animated.timing(slideOut, {
          duration: 500,
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    });
  };

  const panresponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        //return true if user is swiping, return false if it's a single click
        return !(
          (gestureState.dx === 0 && gestureState.dy === 0) ||
          (gestureState.dx < 2 && gestureState.dx > -2)
        );
      },
      onPanResponderMove: (_, { dx, dy, y0 }) => {
        swipe.setValue({ x: dx, y: dy });
        sticky.setValue({ x: dx, y: dy });
      },
      onPanResponderRelease: (_, { dx, dy }) => {
        const direction = Math.sign(dx);
        const swipedPastThreshhold = Math.abs(dx) > 100;
        if (swipedPastThreshhold) {
          Animated.timing(swipe, {
            duration: 200,
            toValue: { x: direction * (width + 200), y: dy },
            useNativeDriver: true,
          }).start(() => removeTopCard(direction == 1));
          return;
        }
        Animated.spring(swipe, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          friction: 5,
        }).start();
      },
    })
  ).current;

  const emptyCardMarkup = canUpdate ? (
    <View
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ThemedText>Looks like you couldn't find a match!</ThemedText>
      <ThemedText>
        Let's see what restaurants people could mostly agree on!
      </ThemedText>
      <ThemedButton text="OK!" onPress={transitionOut} type="primary" />
    </View>
  ) : (
    <View
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ThemedText type="title">You're out of options!</ThemedText>
      <Image
        source={require("../../assets/images/emptyPlate.png")}
        style={{ width: 180, height: 50, resizeMode: "stretch", margin: 25 }}
      />
      <ThemedText style={{ textAlign: "center", width: "75%" }}>
        You've voted on all the available restaurants!{" "}
      </ThemedText>
      <ThemedText
        style={{ textAlign: "center", width: "75%", paddingVertical: 15 }}
      >
        Now you just need to wait for the other guests to cast their votes
      </ThemedText>
      {/* <Pressable
    onPress={() => {}}
    style={[styles.button, { backgroundColor: tintColor }]}
  >
    <ThemedText type="defaultSemiBold">Remind Other Guests</ThemedText>
  </Pressable> */}
    </View>
  );

  const frontCardMarkup =
    // (topCard && totalCards > 0) ||
    topCard && topCardData ? (
      <Animated.View
        style={[
          styles.card,
          {
            transform: [...swipe.getTranslateTransform(), { rotate }],
            zIndex: 3,
          },
        ]}
        {...panresponder.panHandlers}
      >
        <RestaurantCard
          data={topCardData}
          handleNewPhotos={(photos) => handleNewPhotoData(topCard.id, photos)}
        />
      </Animated.View>
    ) : (
      <Animated.View
        style={[
          {
            ...styles.card,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: backgroundColor,
            padding: 20,
            opacity: fadeOut,
          },
          { transform: [{ translateY: slideOut }] },
        ]}
      >
        {emptyCardMarkup}
      </Animated.View>
    );
  const backCardMarkup = totalCards > 0 && (
    <Animated.View
      style={{
        ...styles.backCard,
        zIndex: 2,
        transform: [{ translateY: rise }, { scale }],
      }}
      {...panresponder.panHandlers}
    >
      <Animated.View
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          zIndex: 2,
          backgroundColor: backCardColor,
          opacity: opacity,
        }}
        {...panresponder.panHandlers}
      ></Animated.View>

      {next ? (
        <RestaurantCard
          data={nextCardData}
          handleNewPhotos={(photos) =>
            handleNewPhotoData(next.value.id, photos)
          }
        />
      ) : (
        <View
          style={{
            ...styles.card,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: backgroundColor,
            padding: 20,
          }}
        >
          {emptyCardMarkup}
        </View>
      )}
    </Animated.View>
  );

  const thirdCard = totalCards >= 2 && (
    <View
      style={{
        ...styles.backCard,
        transform: [{ scale: 0.93 }],
        backgroundColor: backCardColor,
        zIndex: 1,
      }}
    ></View>
  );
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <View style={styles.stack}>
        {frontCardMarkup}
        {backCardMarkup}
        {thirdCard}
      </View>
      {topCard && (
        <View style={styles.buttonGroup}>
          <Pressable
            onPress={() => buttonNo()}
            style={{
              ...styles.circleButton,
              backgroundColor: tintColor,
            }}
          >
            <Ionicons name="close" size={40} color="white" />
          </Pressable>
          {/* <Pressable
            onPress={() => buttonVeto()}
            style={{
              ...styles.circleButton,
              backgroundColor: "black",
              width: 70,
              height: 70,
              borderRadius: 35,
            }}
          >
            <Ionicons name="ban" size={40} color="white" />
          </Pressable> */}
          <Pressable
            onPress={() => buttonYes()}
            style={{ ...styles.circleButton, backgroundColor: "#039F85" }}
          >
            <MaterialCommunityIcons
              name="silverware-fork-knife"
              size={35}
              color="white"
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    height: "82%",
    width: "85%",
    marginTop: "4%",
    alignItems: "center",
    position: "relative",
  },
  card: {
    position: "absolute",
    overflow: "hidden",
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  backCard: {
    position: "absolute",
    overflow: "hidden",
    width: "100%",
    height: "100%",
    borderRadius: 10,
    top: 30,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    margin: 10,
  },
  buttonGroup: {
    // paddingVertical: 35,
    position: "absolute",
    paddingHorizontal: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    bottom: "2%",
  },
  circleButton: {
    borderRadius: 25,
    height: 50,
    width: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});
