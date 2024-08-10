import { Text, View, Button } from "react-native";
import { Link } from "expo-router";
import ImagePickerExample from "@/components/ImagePickerExample";
import Loading from "@/components/Loading";
import { ThemedView } from "@/components/ThemedView";
import PhotoCarousel from "@/components/PhotoCarousel";

export default function Explore() {
  return (
    // <View
    //   style={{
    //     flex: 1,
    //     justifyContent: "center",
    //     alignItems: "center",
    //   }}
    // >
    //   <Text>Edit app/(tabs)/explore.tsx to edit screen.</Text>
    //   <ImagePickerExample />
    //   <Text>Single person meal page</Text>
    // </View>
    // <Loading />
    <ThemedView>
      <PhotoCarousel
        photos={[
          "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AUc7tXUCa_Lp0QfizMRQ7UWmMR-xDoqR_9Yn8k7ppNBJwe8uOkir3IQZrSvrzk3YyWXmiP4zBKxr1xMe90D_LF-mrrbAgnh3_tRRK-93QMdFA3h4sK80lo5VCyw4b0sqwYfsMMXZA16W-DRhpgqFGFL3hFfFTXjLmMzyUgrP",
          "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AUc7tXVVkq6XRxDXILsfijMCUuRgVxZKUbO66ua5z51V6mG6fwloSryVUbenN172U4_mpli2OYXMkPUdvxhROJ19AQ5qVU5ruM6zFa7zmlAC9j8nlDZ7l-Vls4fl3EAnG4kWRFFSizNUnwSxFlshV1UuPxxVb_1gONcpLsFS",
          "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AUc7tXVrVgtFmkHyy0ljPJbthMkFc_tnHT-AHUDf_m_parUjuds2sKje1mY5DIf3H5-F5RZLc2UcZyinrGGWfOpT1b_7OzCrYKaetq6lOZanDyC1EKtSLMUnUYsy-0sg4pzJ9mYKt-O7GMOFqmoil1uq_05zEyVmls-fceqQ",
        ]}
      />
    </ThemedView>
  );
}
