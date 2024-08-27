import {
  Text,
  View,
  Button,
  Modal,
  TextInput,
  StyleSheet,
  FlatList,
  ImageSourcePropType,
  Image,
  ListRenderItem,
  Pressable,
} from "react-native";
import { Link, useRouter } from "expo-router";
import axiosAuth from "@/api/auth";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "./ThemedText";
import { Guest } from "@/types/Guest";
import { ThemedView } from "./ThemedView";
import { ThemedButton } from "./ThemedButton";

function SearchResult({ user_id, name, username, profileImage }: Guest) {
  const goodColor = useThemeColor({}, "positive");
  return (
    <View style={styles.result}>
      {/* <View style={styles.resultInfo}>
        {profileImage && (
          <Image source={profileImage} style={styles.profileImage} />
        )} 
      </View>*/}
      <View>
        <ThemedText>{name}</ThemedText>
        <ThemedText type="secondary" subdued>
          @{username}
        </ThemedText>
      </View>
      <Ionicons name="add-circle-outline" size={20} color={goodColor} />
    </View>
  );
}

export default function UserSearch({
  focused,
  handleFocused,
  handleUsers,
}: {
  focused: boolean;
  handleFocused: Function;
  handleUsers: Function;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const color = useThemeColor({}, "text");
  const subduedColor = useThemeColor({}, "subduedText");
  const handleQueryChange = async (query: string) => {
    console.log(`query: ${query}`);
    setQuery(query);
    if (query.length > 0) {
      try {
        const response = await axiosAuth.post("/users/search", {
          queryTerm: query,
        });
        console.log(response.data);
        setResults(response.data.users);
      } catch (error) {
        console.log(error);
      }
    } else {
      setResults([]);
    }
  };

  const handleSelect = (guest: Guest) => {
    setQuery("");
    setResults([]);
    handleUsers(guest);
    handleFocused(false);
  };

  useEffect(() => {
    if (!focused) {
      setQuery("");
      setResults([]);
    }
  }, [focused]);

  return (
    <FlatList
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={() => (
        <View style={[styles.searchBar, { borderColor: color }]}>
          <TextInput
            value={query}
            autoFocus={focused}
            onChangeText={handleQueryChange}
            placeholder="Search"
            placeholderTextColor={subduedColor}
            style={[styles.searchInput, { color }]}
            onFocus={() => handleFocused(true)}
            onBlur={() => {
              handleFocused(false);
            }}
          />
          <Ionicons name="search" size={16} color={color} />
        </View>
      )}
      ListEmptyComponent={
        focused ? (
          <ThemedView
            style={[
              styles.result,
              {
                paddingTop: 15,
                justifyContent: query ? "flex-start" : "center",
              },
            ]}
          >
            <ThemedText style={{ textAlign: query ? "auto" : "center" }}>
              {query
                ? "No results..."
                : "Search for your friends\n to add them to the guest list!"}
            </ThemedText>
          </ThemedView>
        ) : null
      }
      data={results}
      style={styles.searchResults}
      renderItem={({ item }: { item: Guest }) => (
        <Pressable onPress={() => handleSelect(item)}>
          <SearchResult
            user_id={item.user_id}
            name={item.name}
            username={item.username}
            profileImage={require("../assets/images/dining out.jpeg")}
          />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 10,
    marginTop: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    justifyContent: "space-between",
  },
  searchInput: {
    fontSize: 16,
    lineHeight: 20,
    flex: 1,
  },
  // profileImage: {
  //   width: 40,
  //   height: 40,
  //   borderRadius: 20,
  // },
  searchResults: {
    // paddingVertical: 10,
    paddingHorizontal: 15,
    flexGrow: 0,
  },
  resultInfo: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  result: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
});
