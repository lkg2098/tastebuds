import React, { useState, useRef, useEffect, ReactElement } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  PanResponder,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { ThemedText } from "../ThemedText";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { ThemedView } from "../ThemedView";
import { ThemedButton } from "../ThemedButton";

const DragItem = ({
  item,
  index,
  height,
  renderItem,
  draggedPrevInd,
  draggedCurrInd,
  onDrag,
  onDrop,
}: {
  item: any;
  index: number;
  height: number;
  renderItem?: (item: number) => ReactElement;
  draggedPrevInd: number;
  draggedCurrInd: number;
  onDrag: (index: number) => void;
  onDrop: (draggedIndex: number, offsetY: number) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [currStaticInd, setCurrStaticInd] = useState(index);
  const [loading, setLoading] = useState(true);
  let draggingRef = useRef(false);

  let staticOffset = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(-10)).current;
  const fadeIn = slideIn.interpolate({
    inputRange: [-10, 0],
    outputRange: [0, 1.0],
  });

  useEffect(() => {
    let timeout = setTimeout(() => {
      Animated.timing(slideIn, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start(() => {
        setLoading(false);
      });
    }, 150 * index);
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (draggedCurrInd == -1 && draggedPrevInd == -1) {
      setCurrStaticInd(index);
      staticOffset.setValue(0);
    } else if (!isDragging && draggedCurrInd == currStaticInd) {
      if (draggedPrevInd != index) {
        let dir = draggedPrevInd - draggedCurrInd;
        Animated.timing(staticOffset, {
          toValue: dir * height,
          duration: 100,
          useNativeDriver: true,
        }).start(() => {
          setCurrStaticInd(index + dir);
        });
      } else {
        Animated.timing(staticOffset, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }).start(() => {
          setCurrStaticInd(index);
        });
      }
    }
  }, [draggedPrevInd, draggedCurrInd]);

  useEffect(() => {
    draggingRef.current = isDragging;
  }, [isDragging]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !draggingRef.current,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, { dx, dy, y0 }) => {
        translateY.setValue(dy);
        let dist = Math.abs(dy);
        let dir = Math.sign(dy);
        let threshhold = height / 2;

        if (height - dist < threshhold) {
          onDrag(index + dir * Math.floor(dist / height));
        } else if (dist < threshhold) {
          onDrag(index);
        }
      },
      onPanResponderRelease: (_, { dx, dy }) => {
        let dist = Math.abs(dy);
        let dir = Math.sign(dy);
        let threshhold = height / 2;

        if (dist >= threshhold) {
          Animated.timing(translateY, {
            toValue: Math.floor(dist / height) * height * dir,
            useNativeDriver: true,
            duration: 400,
            easing: Easing.elastic(3),
          }).start(() => {
            setIsDragging(false);
            translateY.setValue(0);
            onDrop(index, index + dir * Math.floor(dist / height));
          });
        } else {
          Animated.timing(translateY, {
            toValue: 0,
            useNativeDriver: true,
            duration: 400,
            easing: Easing.elastic(3),
          }).start(() => {
            setIsDragging(false);
          });
        }
      },
    })
  ).current;

  let dataMarkup = renderItem ? (
    renderItem(item)
  ) : (
    <Text style={styles.text}>{item}</Text>
  );

  if (loading) {
    return (
      <Animated.View
        style={[
          styles.item,
          {
            opacity: fadeIn,
            height: height,
            transform: [{ translateY: slideIn }],
          },
        ]}
      >
        <ThemedView style={styles.itemContent}>
          <View>{dataMarkup}</View>
          <View style={styles.dragHandle}>
            <FontAwesome6 name="grip-vertical" size={16} color="black" />
          </View>
        </ThemedView>
      </Animated.View>
    );
  } else {
    return (
      <Animated.View
        style={[
          styles.item,
          {
            // opacity: fadeIn,
            height: height,
            transform: [{ translateY: isDragging ? translateY : staticOffset }],
          },
        ]}
      >
        <ThemedView style={styles.itemContent}>
          <View>{dataMarkup}</View>
          <View {...panResponder.panHandlers} style={styles.dragHandle}>
            <FontAwesome6 name="grip-vertical" size={16} color="black" />
          </View>
        </ThemedView>
      </Animated.View>
    );
  }
};

export default function RankList({
  data,
  renderData,
  onSubmit,
}: {
  data: Array<number>;
  renderData?: (item: number) => ReactElement;
  onSubmit?: (data: Array<number>) => void;
}) {
  const [items, setItems] = useState(data);
  const [draggedPrevInd, setDraggedPrevInd] = useState(-1);
  const [draggedCurrInd, setDraggedCurrInd] = useState(-1);

  const currIndRef = useRef(-1);
  const onDrag = (nextIndex: number) => {
    if (currIndRef.current != nextIndex) {
      setDraggedPrevInd(currIndRef.current);
      setDraggedCurrInd(nextIndex);
    }
  };

  const onDrop = (startIndex: number, endIndex: number) => {
    setItems((prev) => {
      const itemsCopy = [...prev];
      const draggedItem = itemsCopy[startIndex];
      itemsCopy.splice(startIndex, 1);
      itemsCopy.splice(endIndex, 0, draggedItem);
      return itemsCopy;
    });
    setDraggedCurrInd(-1);
    setDraggedPrevInd(-1);

    // // Calculate the new index based on the drop position
    // const newIndex = Math.min(
    //   Math.max(Math.round(draggedIndex + offsetY / 50), 0),
    //   newItems.length
    // );

    // newItems.splice(newIndex, 0, draggedItem);
    // setItems(newItems);
  };

  useEffect(() => {
    setItems(data);
  }, [data]);

  useEffect(() => {
    console.log(items);
  }, [items]);

  useEffect(() => {
    currIndRef.current = draggedCurrInd;
  }, [draggedCurrInd]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    return (
      <DragItem
        key={index}
        renderItem={renderData}
        item={item}
        index={index}
        draggedPrevInd={draggedPrevInd}
        draggedCurrInd={draggedCurrInd}
        height={100}
        onDrag={onDrag}
        onDrop={onDrop}
      />
    );
  };

  const handleSubmit = () => {
    console.log(data);
    if (onSubmit) onSubmit(data);
  };

  return (
    <View>
      <FlatList
        data={items}
        renderItem={renderItem}
        scrollEnabled={false}
        style={styles.itemList}
        keyExtractor={(item, index) => index.toString()}
      />
      {onSubmit && (
        <ThemedButton
          type="primary"
          text="Submit"
          onPress={() => handleSubmit()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  itemList: { alignSelf: "stretch", padding: 10 },
  item: {
    paddingVertical: 5,
    backgroundColor: "transparent",
    borderRadius: 5,
    alignSelf: "stretch",
    justifyContent: "center",
    elevation: 3,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 5,
    height: "100%",
    elevation: 3,
    padding: 10,
  },
  text: {
    fontSize: 16,
  },
  dragHandle: {
    padding: 10,
  },
});
