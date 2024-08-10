export default class Restaurant {
  id: string;
  score?: number;
  disliked?: boolean;
  userScore?: number;
  hidden?: boolean;
  vetoed?: boolean;
  unseen?: boolean;
  approvedByUser?: 0 | 1 | -1;
  name?: string;
  address?: string;
  location?: { latitude: string; longitude: string };
  rating?: number | null;
  priceLevel?: string;
  rating_count?: number;
  hours?: Array<string>;
  photos?: Array<string>;
  types?: Array<string>;
  accessibilityOptions?: any;
  website?: string;

  constructor(
    id: string,
    score: number | null,
    disliked: boolean,
    userScore?: number,
    approvedByUser?: 0 | 1 | -1,
    name?: string,
    address?: string,
    location?: { latitude: string; longitude: string },
    rating?: number,
    priceLevel?: string,
    rating_count?: number,
    hours?: Array<string>,
    photos?: Array<string>,
    types?: Array<string>,
    accessibilityOptions?: any,
    website?: string
  ) {
    this.id = id;
    this.score = score || undefined;
    this.userScore = userScore || undefined;
    this.disliked = disliked;
    this.approvedByUser = approvedByUser || undefined;
    this.name = name;
    this.address = address;
    this.location = location;
    this.rating = rating;
    this.priceLevel = priceLevel;
    this.rating_count = rating_count;
    this.hours = hours;
    this.photos = photos;
    this.types = types;
    this.accessibilityOptions = accessibilityOptions;
    this.website = website;
  }
}
