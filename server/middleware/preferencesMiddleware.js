const asyncHandler = require("express-async-handler");
const preference_model = require("../models/preferences");

exports.prevent_duplicate_preferences = asyncHandler(async (req, res, next) => {
  const { mealId } = req.params;
  const { user_id } = req.decoded;
  const { toAdd } = req.body;
  const wanted = req.query.wanted;

  if (!wanted) {
    res.status(401).json({ error: "Missing query parameter" });
  } else if (wanted === "1") {
    if (toAdd.length) {
      let oldPreferences = await preference_model.get_wanted_preferences(
        mealId,
        user_id
      );
      let oldPrefSet = new Set(oldPreferences.map((p) => p.preference_tag));
      let newPrefSet = new Set(toAdd);
      let cleaned = newPrefSet.difference(oldPrefSet);
      req.toAddCleaned = [...cleaned];
      next();
    } else {
      req.toAddCleaned = toAdd;
      next();
    }
  } else if (wanted === "0") {
    if (toAdd.length) {
      let oldPreferences = await preference_model.get_unwanted_preferences(
        mealId,
        user_id
      );
      let oldPrefSet = new Set(oldPreferences.map((p) => p.preference_tag));
      let newPrefSet = new Set(toAdd);
      let cleaned = newPrefSet.difference(oldPrefSet);
      req.toAddCleaned = [...cleaned];
      next();
    } else {
      req.toAddCleaned = toAdd;
      next();
    }
  } else {
    res.status(401).json({ error: "Invalid query value" });
  }
});

exports.validate_preference_data = asyncHandler(async (req, res, next) => {
  if (req.body.preferences) {
    let preferenceList = req.body.preferences;
    // console.log(preferenceList);
    if (preferenceList.length <= 3) {
      const permitted_tags = new Set([
        "american_restaurant",
        "barbecue_restaurant",
        "brazilian_restaurant",
        "breakfast_restaurant",
        "brunch_restaurant",
        "chinese_restaurant",
        "fast_food_restaurant",
        "french_restaurant",
        "greek_restaurant",
        "hamburger_restaurant",
        "indian_restaurant",
        "indonesian_restaurant",
        "italian_restaurant",
        "japanese_restaurant",
        "korean_restaurant",
        "lebanese_restaurant",
        "mediterranean_restaurant",
        "mexican_restaurant",
        "middle_eastern_restaurant",
        "pizza_restaurant",
        "ramen_restaurant",
        "sandwich_shop",
        "seafood_restaurant",
        "spanish_restaurant",
        "steak_house",
        "sushi_restaurant",
        "thai_restaurant",
        "turkish_restaurant",
        "vietnamese_restaurant",
      ]);
      for (let tag of preferenceList) {
        if (!permitted_tags.has(tag)) {
          res.status(401).json({ error: `Invalid preference ${tag}` });
        }
      }
      next();
    } else {
      res.status(401).json({ error: "Too many tags selected" });
    }
  } else {
    next();
  }
});

exports.parse_settings_body = (req) => {
  return {
    preferences: req.body.preferences || null,
    min_rating: req.body.min_rating || null,
    google_data_string: req.body.google_data_string,
  };
};
