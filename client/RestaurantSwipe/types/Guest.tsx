import { ImageSourcePropType } from "react-native";

export type Guest = {
  user_id: string;
  username: string;
  name: string;
  profileImage: ImageSourcePropType | null;
};
