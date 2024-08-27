import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { Guest } from "@/types/Guest";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useFocusEffect } from "expo-router";

function GuestListItem({
  guest,
  index,
  canEdit,
  openIndex,
  handleOpenIndex,
  handleDelete,
}: {
  guest: Guest;
  canEdit: boolean;
  index: number;
  openIndex: number;
  handleOpenIndex: Function;
  handleDelete: Function;
}) {
  const subduedColor = useThemeColor({}, "subduedText");
  let swipeable = useRef<Swipeable>(null).current;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // console.log(open, openIndex);
    if (open && openIndex != index) {
      console.log(index, openIndex, "closing");
      swipeable?.close();
      setOpen(false);
    }
  }, [openIndex]);

  if (canEdit) {
    return (
      <Swipeable
        ref={(ref) => {
          swipeable = ref;
        }}
        containerStyle={{ ...styles.item, borderColor: subduedColor }}
        overshootRight={false}
        rightThreshold={5}
        onSwipeableClose={(direction) => {
          setOpen(false);
          if (openIndex == index) {
            handleOpenIndex(-1);
          }
        }}
        renderRightActions={(progress, dragX) => {
          const trans = dragX.interpolate({
            inputRange: [0, 5, 10],
            outputRange: [-8.7, -5, -10],
          });
          const scale = dragX.interpolate({
            inputRange: [0, 10, 20, 30, 40],
            outputRange: [0, -0.1, -0.2, -0.3, -0.4],
          });
          return (
            <Pressable
              onPress={() => handleDelete(guest.user_id)}
              style={{ position: "relative", width: 90 }}
            >
              <Animated.View
                style={{
                  backgroundColor: "red",
                  width: "100%",
                  height: "100%",
                  transform: [{ scaleX: scale }],
                  transformOrigin: "right",
                }}
              ></Animated.View>
              <Animated.Text
                style={{
                  left: "125%",
                  top: "-70%",
                  transform: [{ translateX: trans }],
                }}
              >
                <Ionicons
                  name="trash"
                  color="white"
                  size={25}
                  style={{ position: "relative" }}
                />
              </Animated.Text>
            </Pressable>
          );
        }}
      >
        <View
          style={{
            flexDirection: "row",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* <Image
          style={styles.profileImage}
          source={
            guest.profileImage
              ? guest.profileImage
              : require("../assets/images/dining out.jpeg")
          }
        />*/}
          <View>
            <ThemedText>{guest.name}</ThemedText>
            <ThemedText type="secondary" subdued>
              @{guest.username}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => {
              setOpen(true);
              handleOpenIndex(index);
              swipeable?.openRight();
            }}
          >
            <Ionicons name="remove-circle-outline" size={20} color="red" />
          </Pressable>
        </View>
      </Swipeable>
    );
  } else {
    return (
      <View style={[styles.item, { borderColor: subduedColor }]}>
        {/* <Image
        style={styles.profileImage}
        source={
          guest.profileImage
            ? guest.profileImage
            : require("../assets/images/dining out.jpeg")
        }
      />*/}
        <View>
          <ThemedText>{guest.name}</ThemedText>
          <ThemedText type="secondary" subdued>
            @{guest.username}
          </ThemedText>
        </View>
      </View>
    );
  }
}
export default function GuestList({
  guests,
  deleteGuest,
  canEdit,
}: {
  guests: Array<Guest>;
  deleteGuest: Function;
  canEdit: boolean;
}) {
  const subduedColor = useThemeColor({}, "subduedText");
  const [openId, setOpenId] = useState(-1);

  useFocusEffect(
    useCallback(() => {
      setOpenId(-1);
    }, [])
  );

  return (
    <GestureHandlerRootView style={styles.list}>
      <FlatList
        keyboardShouldPersistTaps="never"
        data={guests}
        style={styles.list}
        ItemSeparatorComponent={() => (
          <View
            style={{
              borderTopWidth: 1,
              width: "90%",
              margin: "auto",
              borderColor: "#c4c4c4",
            }}
          ></View>
        )}
        renderItem={({ item }: { item: Guest }) => (
          <GuestListItem
            guest={item}
            index={Number(item.user_id)}
            canEdit={canEdit}
            openIndex={openId}
            handleOpenIndex={() => setOpenId(Number(item.user_id))}
            handleDelete={deleteGuest}
          />
        )}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  list: {
    alignSelf: "stretch",
    flex: 1,
    paddingVertical: 5,
  },
  item: {
    marginHorizontal: 15,
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
    paddingVertical: 7,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
