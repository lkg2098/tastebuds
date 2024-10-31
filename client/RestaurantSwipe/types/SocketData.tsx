export type SocketResData = {
  data: { id: number; score: number };
  action: "like" | "dislike" | "match";
};

export type SocketSettingsData = {
  location_id: string;
  budget: Array<number>;
  radius: number;
  date: Date;
};
