import { faker } from "@faker-js/faker";
import Meal from "../meals.js";

export async function meal({
  meal_name,
  latitude,
  longitude,
  location_id,
  scheduledAt,
  budget,
  radius,
}) {
  const defaults = {
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    location_id: faker.string.uuid(),
    radius: 2,
    scheduledAt: new Date(),
    budget: [0, 4],
    meal_name: "Test Meal",
  };

  return await Meal.create({
    meal_name,
    latitude,
    longitude,
    location_id,
    scheduledAt,
    budget,
    radius,
    ...defaults,
  });
}
