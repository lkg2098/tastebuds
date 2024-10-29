const asyncHandler = require("express-async-handler");
const preferences_model = require("../models/preferences");
const member_model = require("../models/members");
const restaurant_model = require("../models/restaurants");
const { parse_settings_body } = require("../middleware/preferencesMiddleware");

exports.get_preferences_for_meal = asyncHandler(async (req, res, next) => {
  const { mealId } = req.params;
  const { user_id } = req.decoded;
  const { setting } = req.query;

  if (setting == "unwantedCuisines") {
    let preferences = [];
    preferences = await member_model.get_bad_tags(mealId, user_id);
    console.log("here");
    // console.log(preferences);
    res.status(200).json({ role: req.decoded.role, preferences });
  } else if (setting == "rating") {
    let rating = await member_model.get_min_rating(mealId, user_id);
    res.status(200).json({ role: req.decoded.role, rating });
  } else if (setting == "all") {
    let settings = await member_model.member_get_settings(mealId, user_id);
    // console.log(settings);
    res.status(200).json({
      role: req.decoded.role,
      member_id: req.decoded.member_id,
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

async function update_preferences(
  member_id,
  preferences = null,
  min_rating = null
) {
  if (preferences) {
    let tagList = await member_model.member_update_bad_tags(
      member_id,
      preferences
    );
  }
  if (min_rating) {
    let updatedRating = await member_model.member_update_min_rating(
      member_id,
      min_rating
    );
  }
}

exports.add_preferences = asyncHandler(async (req, res, next) => {
  const { mealId } = req.params;
  const { member_id } = req.decoded;

  const { preferences, min_rating, google_data_string } =
    parse_settings_body(req);
  // console.log(req.body);
  if (google_data_string && (preferences || min_rating)) {
    await update_preferences(member_id, preferences, min_rating);

    const scores = await restaurant_model.create_member_restaurants(
      member_id,
      google_data_string,
      mealId
    );
    res.status(200).json({ scores });
  } else {
    res.status(401).json({ error: "missing data" });
  }
});

exports.update_preferences = asyncHandler(async (req, res, next) => {
  const { mealId } = req.params;
  const { member_id } = req.decoded;

  const { preferences, min_rating, google_data_string } =
    parse_settings_body(req);
  if (google_data_string && (preferences || min_rating)) {
    await update_preferences(member_id, preferences, min_rating);

    let scores = await restaurant_model.update_member_restaurants(
      member_id,
      google_data_string,
      mealId
    );

    res.status(200).json({
      message: "Successfully updated preferences",
      scores,
    });
  } else {
    res.status(401).json({ error: "missing data" });
  }
});
