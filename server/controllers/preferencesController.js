import asyncHandler from "express-async-handler";
import * as guest_model from "../models/guests.js";
import * as restaurant_model from "../models/restaurants.js";
import { parse_settings_body } from "../middleware/preferencesMiddleware.js";

export const get_preferences_for_meal = asyncHandler(async (req, res, next) => {
  const { mealId } = req.params;
  const { user_id } = req.decoded;
  const { setting } = req.query;

  if (setting == "unwantedCuisines") {
    let preferences = [];
    preferences = await guest_model.get_bad_tags(mealId, user_id);
    console.log("here");
    // console.log(preferences);
    res.status(200).json({ role: req.decoded.role, preferences });
  } else if (setting == "rating") {
    let rating = await guest_model.get_min_rating(mealId, user_id);
    res.status(200).json({ role: req.decoded.role, rating });
  } else if (setting == "all") {
    let settings = await guest_model.guest_get_settings(mealId, user_id);
    // console.log(settings);
    res.status(200).json({
      role: req.decoded.role,
      guest_id: req.decoded.guest_id,
      round: settings.round,
      settings: {
        rating: settings.min_rating,
        preferences: settings.bad_tags,
      },
    });
  } else {
    res.status(401).json({ error: "Invalid settings query" });
  }

  // const { wanted } = req.query;
  // let preferences = [];
  // if (!wanted) {
  //   preferences = await preferences_model.get_preferences(mealId, user_id);
  //   res.status(200).json({ preferences: preferences });
  // } else if (wanted === "0") {
  //   preferences = await preferences_model.get_unwanted_preferences(
  //     mealId,
  //     user_id
  //   );
  //   res.status(200).json({ preferences: preferences });
  // } else if (wanted === "1") {
  //   preferences = await preferences_model.get_wanted_preferences(
  //     mealId,
  //     user_id
  //   );
  //   res.status(200).json({ preferences: preferences });
  // } else {
  //   res.status(401).json({ error: "Invalid query value" });
  // }
});

async function update_guest_preferences(
  guest_id,
  preferences = null,
  min_rating = null,
) {
  if (preferences) {
    let tagList = await guest_model.guest_update_bad_tags(
      guest_id,
      preferences,
    );
  }
  if (min_rating) {
    let updatedRating = await guest_model.guest_update_min_rating(
      guest_id,
      min_rating,
    );
  }
}

export const add_preferences = asyncHandler(async (req, res, next) => {
  const { mealId } = req.params;
  const { guest_id } = req.decoded;

  const { preferences, min_rating, google_data_string } =
    parse_settings_body(req);
  // console.log(req.body);
  if (google_data_string && (preferences || min_rating)) {
    await update_guest_preferences(guest_id, preferences, min_rating);
    const guestLinkId = await guest_model.get_guest_link_id_by_guest(guest_id);

    const scores = await restaurant_model.create_guest_restaurants(
      guestLinkId,
      google_data_string,
      mealId,
    );
    res.status(200).json({ scores });
  } else {
    res.status(401).json({ error: "missing data" });
  }
});

export const update_preferences = asyncHandler(async (req, res, next) => {
  const { mealId } = req.params;
  const { guest_id } = req.decoded;

  const { preferences, min_rating, google_data_string } =
    parse_settings_body(req);
  if (google_data_string && (preferences || min_rating)) {
    await update_guest_preferences(guest_id, preferences, min_rating);
    const guestLinkId = await guest_model.get_guest_link_id_by_guest(guest_id);

    let scores = await restaurant_model.update_guest_restaurants(
      guestLinkId,
      google_data_string,
      mealId,
    );

    res.status(200).json({
      message: "Successfully updated preferences",
      scores,
    });
  } else {
    res.status(401).json({ error: "missing data" });
  }
});
