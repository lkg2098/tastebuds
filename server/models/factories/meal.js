import { faker } from "@faker-js/faker";
import Meal from "../meals.js";

export async function meal({
  meal_name,
  latitude,
  longitude,
  location_id,
  scheduled_at,
  budget,
  radius,
}) {
  const defaults = {
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    location_id: faker.string.uuid(),
    radius: 2,
    scheduled_at: new Date(),
    budget: [0, 4],
    meal_name: "Test Meal",
  };

  return await Meal.create({
    meal_name: meal_name || defaults.meal_name,
    latitude: latitude || defaults.latitude,
    longitude: longitude || defaults.longitude,
    location_id: location_id || defaults.location_id,
    scheduled_at: scheduled_at || defaults.scheduled_at,
    budget: budget || defaults.budget,
    radius: radius || defaults.radius,
  });
}
