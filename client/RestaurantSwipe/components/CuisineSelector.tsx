import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";
import GradientButton from "./GradientButton";
import { ThemedButton } from "./ThemedButton";
import { useRouter } from "expo-router";

function CuisineButton({
  source,
  label,
  handleSelect,
  selected,
  positive,
}: {
  source: ImageSourcePropType;
  label: string;
  handleSelect: Function;
  selected: boolean;
  positive: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.cuisineButton,
        {
          backgroundColor: selected ? "rgba(255,255,255,0.2)" : "transparent",
        },
      ]}
      onPress={() => handleSelect()}
    >
      {selected && (
        <Ionicons
          name={positive ? "checkmark" : "close"}
          size={100}
          color={positive ? "#039F85" : "red"}
          style={styles.x}
        />
      )}
      <Image source={source} width={64} height={64} style={styles.widget} />
      <ThemedText
        type="defaultSemiBold"
        style={{ textAlign: "center", fontSize: 14 }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function CuisineSelector({
  mealId,
  userId,
  initialPreferences,
  positive,
  tagMap,
  handleSubmit,
}: {
  mealId: number;
  userId: number;
  initialPreferences?: Array<string>;
  positive: boolean;
  tagMap: any;
  handleSubmit: Function;
}) {
  const router = useRouter();
  const { width } = Dimensions.get("screen");
  const assetPath = "../assets/images/cuisines";
  const [cuisineData, setCuisineData] = useState([
    {
      label: "Barbecue",
      source: require(`${assetPath}/barbecue.png`),
      selected: false,
      tag_id: "barbecue_restaurant",
      shown: tagMap ? tagMap["barbecue_restaurant"] : false,
    },
    {
      label: "Breakfast",
      source: require(`${assetPath}/breakfast.png`),
      selected: false,
      tag_id: "breakfast_restaurant",
      shown: tagMap ? tagMap["breakfast_restaurant"] : false,
    },
    {
      label: "Fast Food",
      source: require(`${assetPath}/fast food.png`),
      selected: false,
      tag_id: "fast_food_restaurant",
      shown: tagMap ? tagMap["fast_food_restaurant"] : false,
    },
    {
      label: "Pizza",
      source: require(`${assetPath}/pizza.png`),
      selected: false,
      tag_id: "pizza_restaurant",
      shown: tagMap ? tagMap["pizza_restaurant"] : false,
    },
    {
      label: "Ramen",
      source: require(`${assetPath}/ramen.png`),
      selected: false,
      tag_id: "ramen_restaurant",
      shown: tagMap ? tagMap["ramen_restaurant"] : false,
    },
    {
      label: "Sandwich",
      source: require(`${assetPath}/sandwich.png`),
      selected: false,
      tag_id: "sandwich_shop",
      shown: tagMap ? tagMap["sandwich_shop"] : false,
    },
    {
      label: "Seafood",
      source: require(`${assetPath}/seafood.png`),
      selected: false,
      tag_id: "seafood_restaurant",
      shown: tagMap ? tagMap["seafood_restaurant"] : false,
    },
    {
      label: "Steakhouse",
      source: require(`${assetPath}/steakhouse.png`),
      selected: false,
      tag_id: "steak_house",
      shown: tagMap ? tagMap["steak_house"] : false,
    },
    {
      label: "Sushi",
      source: require(`${assetPath}/sushi.png`),
      selected: false,
      tag_id: "sushi_restaurant",
      shown: tagMap ? tagMap["sushi_restaurant"] : false,
    },
    {
      label: "American",
      source: require(`${assetPath}/american.png`),
      selected: false,
      tag_id: "american_restaurant",
      shown: tagMap ? tagMap["american_restaurant"] : false,
    },
    {
      label: "Chinese",
      source: require(`${assetPath}/chinese.png`),
      selected: false,
      tag_id: "chinese_restaurant",
      shown: tagMap ? tagMap["chinese_restaurant"] : false,
    },
    {
      label: "Italian",
      source: require(`${assetPath}/italian.png`),
      selected: false,
      tag_id: "italian_restaurant",
      shown: tagMap ? tagMap["italian_restaurant"] : false,
    },
    {
      label: "Mexican",
      source: require(`${assetPath}/mexican.png`),
      selected: false,
      tag_id: "mexican_restaurant",
      shown: tagMap ? tagMap["mexican_restaurant"] : false,
    },
    {
      label: "Greek",
      source: require(`${assetPath}/greek.png`),
      selected: false,
      tag_id: "greek_restaurant",
      shown: tagMap ? tagMap["greek_restaurant"] : false,
    },
    {
      label: "Middle Eastern",
      source: require(`${assetPath}/middle-eastern.png`),
      selected: false,
      tag_id: "middle_eastern_restaurant",
      shown: tagMap ? tagMap["middle_eastern_barbecue_restaurant"] : false,
    },
    {
      label: "Thai",
      source: require(`${assetPath}/thai.png`),
      selected: false,
      tag_id: "thai_restaurant",
      shown: tagMap ? tagMap["thai_restaurant"] : false,
    },
    {
      label: "French",
      source: require(`${assetPath}/french.png`),
      selected: false,
      tag_id: "french_restaurant",
      shown: tagMap ? tagMap["french_restaurant"] : false,
    },
    {
      label: "Japanese",
      source: require(`${assetPath}/japanese.png`),
      selected: false,
      tag_id: "japanese_restaurant",
      shown: tagMap ? tagMap["japanese_restaurant"] : false,
    },
    {
      label: "Lebanese",
      source: require(`${assetPath}/lebanese.png`),
      selected: false,
      tag_id: "lebanese_restaurant",
      shown: tagMap ? tagMap["lebanese_restaurant"] : false,
    },
    {
      label: "Vietnamese",
      source: require(`${assetPath}/vietnamese.png`),
      selected: false,
      tag_id: "vietnamese_restaurant",
      shown: tagMap ? tagMap["vietnamese_restaurant"] : false,
    },
    {
      label: "Turkish",
      source: require(`${assetPath}/turkish.png`),
      selected: false,
      tag_id: "turkish_restaurant",
      shown: tagMap ? tagMap["turkish_restaurant"] : false,
    },
    {
      label: "Indonesian",
      source: require(`${assetPath}/indonesian.png`),
      selected: false,
      tag_id: "indonesian_restaurant",
      shown: tagMap ? tagMap["indonesian_restaurant"] : false,
    },
    {
      label: "Brazilian",
      source: require(`${assetPath}/brazilian.png`),
      selected: false,
      tag_id: "brazilian_restaurant",
      shown: tagMap ? tagMap["brazilian_restaurant"] : false,
    },
    {
      label: "Mediterranean",
      source: require(`${assetPath}/mediterranean.png`),
      selected: false,
      tag_id: "mediterranean_restaurant",
      shown: tagMap ? tagMap["mediterranean_restaurant"] : false,
    },
    {
      label: "Spanish",
      source: require(`${assetPath}/spanish.png`),
      selected: false,
      tag_id: "spanish_restaurant",
      shown: tagMap ? tagMap["spanish_restaurant"] : false,
    },
  ]);
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState<Array<string>>(
    initialPreferences || []
  );

  useEffect(() => {
    console.log(initialPreferences);
    if (tagMap) {
      let preferences = {} as { [key: string]: boolean };
      if (initialPreferences?.length) {
        for (let pref of initialPreferences) {
          preferences[pref] = true;
        }
      }
      console.log(preferences);
      const tags = tagMap;
      let cuisineDataCopy = [...cuisineData];
      for (let item of cuisineDataCopy) {
        if (tags[item.tag_id]) {
          item.shown = tags[item.tag_id];
        }
        if (preferences[item.tag_id]) {
          item.selected = true;
        }
      }
      setCuisineData(cuisineDataCopy);
    }
  }, [tagMap, initialPreferences]);

  const handleSelection = (index: number) => {
    console.log(count);
    const wasSelected = cuisineData[index].selected;
    if (wasSelected || count < 3) {
      const cuisineDataCopy = [...cuisineData];
      cuisineDataCopy[index].selected = !wasSelected;
      console.log(cuisineData[index]);
      setCuisineData(cuisineDataCopy);
      if (wasSelected) {
        setSelected((prev) => {
          return prev.filter((item) => item != cuisineData[index].tag_id);
        });
      } else if (selected.length < 3) {
        setSelected((prev) => {
          prev.push(cuisineData[index].tag_id);
          return prev;
        });
      }
    }
  };

  const onSubmit = async (emptyList?: Array<string>) => {
    let preferences = [];
    if (emptyList) {
      handleSubmit(emptyList);
    } else {
      for (let key in cuisineData) {
        if (cuisineData[key].selected) {
          preferences.push(cuisineData[key].tag_id);
        }
      }
      await handleSubmit(preferences);
    }
  };
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <ThemedText type="subtitle" interactive style={{ paddingVertical: 10 }}>
        Choose up to 3
      </ThemedText>
      <FlatList
        style={styles.buttonGrid}
        numColumns={Math.floor(width / 103)}
        data={cuisineData}
        renderItem={({
          item,
          index,
        }: {
          item: {
            label: string;
            source: ImageSourcePropType;
            selected: boolean;
            tag_id?: string;
            shown?: boolean;
          };
          index: number;
        }) => {
          if (item.shown) {
            return (
              <CuisineButton
                source={item.source}
                label={item.label}
                handleSelect={() => handleSelection(index)}
                selected={item.selected}
                positive={positive}
              />
            );
          } else {
            return <></>;
          }
        }}
      />
      <GradientButton handlePress={() => onSubmit()} buttonText="Confirm" />
      {selected.length && (
        <ThemedButton
          type="secondary"
          onPress={() => onSubmit([])}
          text="No Preference"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cuisineButton: {
    width: 100,
    height: 100,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    margin: 3,
  },
  widget: {
    width: 60,
    height: 60,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  x: {
    position: "absolute",
    zIndex: 10,
    top: -10,
  },
});
