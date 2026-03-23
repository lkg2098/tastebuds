import MealRestaurant from "./meal_restaurants.js";
import GuestPreference from "./guest_preferences.js";
import GuestRestaurant from "./guest_restaurants.js";
import Guest from "./guests.js";
import Meal from "./meals.js";
import Restaurant from "./restaurants.js";
import User from "./users.js";

function setupAssociations() {
  try {
    MealRestaurant.hasMany(GuestRestaurant, {
      foreignKey: "meal_restaurant_id",
      as: "GuestRestaurants",
    });
    MealRestaurant.belongsTo(Meal, { foreignKey: "meal_id" });

    GuestRestaurant.belongsTo(Guest, { foreignKey: "guest_id" });

    Meal.hasOne(Restaurant, { foreignKey: "chosen_restaurant" });
    Meal.hasMany(MealRestaurant, { foreignKey: "meal_id" });
    Meal.hasMany(Guest, { as: "Guests", foreignKey: "meal_id" });

    GuestPreference.belongsTo(Guest);
    Guest.hasMany(GuestPreference);
    Guest.hasMany(GuestRestaurant, { foreignKey: "guest_id" });
    Guest.belongsTo(Meal, { foreignKey: "meal_id" });
    Guest.belongsTo(User, { foreignKey: "user_id" });
    User.hasMany(Guest, { foreignKey: "user_id" });
  } catch (err) {
    console.log("RELATIONS ERROR", err);
  }
}

export default setupAssociations;
