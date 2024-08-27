import axiosAuth from "@/api/auth";
import { useThemeColor } from "@/hooks/useThemeColor";
import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, View } from "react-native";
import Loading from "./Loading";

export default function PhotoCarousel({ photos }: { photos: Array<string> }) {
  const [index, setIndex] = useState(0);
  const tintColor = useThemeColor({}, "tint");
  const subduedColor = useThemeColor({}, "subduedText");
  const [loading, setLoading] = useState(false);

  const [photoData, setPhotoData] = useState(() =>
    photos.map((photo) => ({
      name: photo,
      url: "",
    }))
  );
  const test = [
    "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AUc7tXUCa_Lp0QfizMRQ7UWmMR-xDoqR_9Yn8k7ppNBJwe8uOkir3IQZrSvrzk3YyWXmiP4zBKxr1xMe90D_LF-mrrbAgnh3_tRRK-93QMdFA3h4sK80lo5VCyw4b0sqwYfsMMXZA16W-DRhpgqFGFL3hFfFTXjLmMzyUgrP",
    "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AUc7tXVVkq6XRxDXILsfijMCUuRgVxZKUbO66ua5z51V6mG6fwloSryVUbenN172U4_mpli2OYXMkPUdvxhROJ19AQ5qVU5ruM6zFa7zmlAC9j8nlDZ7l-Vls4fl3EAnG4kWRFFSizNUnwSxFlshV1UuPxxVb_1gONcpLsFS",
    "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AUc7tXVrVgtFmkHyy0ljPJbthMkFc_tnHT-AHUDf_m_parUjuds2sKje1mY5DIf3H5-F5RZLc2UcZyinrGGWfOpT1b_7OzCrYKaetq6lOZanDyC1EKtSLMUnUYsy-0sg4pzJ9mYKt-O7GMOFqmoil1uq_05zEyVmls-fceqQ",
  ];
  const testData = [
    "https://lh3.googleusercontent.com/places/ANXAkqFcbxUM9O9TXGDYFtoX_2u4pzR2YLi54T0ZFwZ6-o7R5M2mDHrUOknc7QDUqCFmN36TJ6_WuJvwasPJpIYpe3XqahnUh0v9kaQ=s4800-h300",
    "https://lh3.googleusercontent.com/places/ANXAkqG467sR3wokEPV5OlGhaOM8tPnLcsWk_Ejd3oT_k2doEyN_h2j6B-8r1vlVYN1Ux0gdNmaq28NgRcP91fX_gw53K78MlvmDapk=s4800-h1600",
    "https://lh3.googleusercontent.com/places/ANXAkqEZzOVvu4RxW-33lukYsA9So774ktUDH6AjXQ-rqXiyeMR1yV-c5vUjA23RwPUwqCpt1yi5PZoOcaefB6cF0HcbAZFAokBNbrs=s4800-h682",
  ];

  // useEffect(() => {
  //   if (photoData.length && !photoData[0].url) {
  //     const fetchData = async () => {
  //       const photosCopy = [...photoData];
  //       const data = await handleGetUrl(0);
  //       if (data?.photoUri) {
  //         photosCopy[0].url = data.photoUri;
  //         setPhotoData(photosCopy);
  //       } else {
  //         console.log("nothing here");
  //       }
  //       setLoading(false);
  //     };

  //     fetchData();
  //   }

  // }, [photoData]);

  const handleGetUrl = async (i: number) => {
    try {
      const response = await axiosAuth.post("/restaurants/photo", {
        photo_name: photoData[i].name,
      });
      console.log(response.data);
      return response.data.photo;
    } catch (err) {
      console.log(err);
    }
  };
  const handleChangePhoto = async (direction: number) => {
    // if (!photoData[index + direction]?.url) {
    //   console.log("fetching photo...");
    //   const data = await handleGetUrl(index + direction);
    //   if (data?.photoUri) {
    //     photoData[index + direction].url = data.photoUri;
    //     setIndex(index + direction);
    //   } else {
    //     console.log("nothing here");
    //   }
    // } else {
    if (index + direction < testData.length && index + direction >= 0) {
      setIndex(index + direction);
    }

    // }
  };

  const pipsMarkup = photos.map((photo, i) => (
    <View
      key={photo}
      style={[
        styles.carouselPip,
        { backgroundColor: index == i ? tintColor : subduedColor },
      ]}
    ></View>
  ));
  if (loading) {
    return <Loading />;
  } else {
    return (
      <View style={{ backgroundColor: "transparent", height: "40%" }}>
        <View style={{ height: "90%" }}>
          <ImageBackground
            style={{
              height: "100%",
              flexDirection: "row",
              backgroundColor: "black",
            }}
            resizeMode="cover"
            source={
              photoData[index]?.url
                ? {
                    uri: photoData[index].url,
                  }
                : { uri: testData[index] }
            }
          >
            <Pressable
              style={{ width: "40%" }}
              onPress={() => handleChangePhoto(-1)}
            ></Pressable>
            <Pressable
              style={{ width: "60%" }}
              onPress={() => handleChangePhoto(1)}
            ></Pressable>
          </ImageBackground>
          <View style={styles.carouselPips}>{pipsMarkup}</View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  carouselPips: {
    flexDirection: "row",
    padding: 7,
    flex: 1,
    justifyContent: "center",
  },
  carouselPip: {
    backgroundColor: "#a6a6a6",
    width: 4,
    height: 4,
    borderRadius: 2,
    margin: 2,
  },
});
