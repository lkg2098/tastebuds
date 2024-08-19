const asyncHandler = require("express-async-handler");
const restaurant_model = require("../models/restaurants");
const member_model = require("../models/members");

exports.restaurants_get_by_meal = asyncHandler(async (req, res, next) => {
  // get restaurant scores - separate column for this member's scores
  // scores data should be sorted by disliked, not seen, and then by score, low to high
  // go through scores, update google data map with score, user raw score, disliked, and seen by user
  // add res's not seen by user to liked, unseen, and disliked lists
  // return all lists
  const meal_restaurants = await restaurant_model.get_meal_restaurants(
    req.params.mealId,
    req.decoded.member_id,
    req.query.place_ids
  );
  console.log(req.decoded.member_id);
  console.log(meal_restaurants);
  res.status(200).json({
    scores: meal_restaurants,
  });
  // res.status(200).json({
  //   scores: meal_restaurants,
  //   restaurantsMap: req.google_data,
  //   google_sql_string: req.google_sql_string,
  //   tag_map: req.tag_map,
  //   locationInfo: req.locationInfo,
  // });
});

exports.restaurant_add = asyncHandler(async (req, res, next) => {
  const { place_id } = req.body;
  const { approved } = req.query;
  if (place_id && (approved == 0 || approved == 1)) {
    let restaurant = await restaurant_model.get_restaurant_by_ids(
      req.params.mealId,
      req.decoded.user_id,
      req.body.place_id
    );

    if (!restaurant) {
      let id = await restaurant_model.meal_restaurant_create({
        place_id: place_id,
        approved: approved,
        meal_id: req.params.mealId,
        user_id: req.decoded.user_id,
      });

      if (id) {
        res
          .status(200)
          .json({ message: "Successfully added", liked: approved == 1 });
      } else {
        res.status(500).json({ error: "Could not add restaurant data" });
      }
    } else {
      res.status(401).json({ error: "Restaurant already exists" });
    }
  } else {
    res.status(401).json({ error: "Missing restaurant data" });
  }
});

exports.restaurant_update = asyncHandler(async (req, res, next) => {
  const { place_id, action } = req.body;
  if (
    place_id &&
    (action == "like" || action == "dislike" || action == "veto")
  ) {
    let restaurant = await restaurant_model.get_restaurant_by_ids(
      req.decoded.member_id,
      req.body.place_id
    );

    if (restaurant) {
      if (action == "veto") {
      } else {
        let updated = await restaurant_model.meal_restaurant_update_approved({
          place_id: place_id,
          approved: action == "like",
          member_id: req.decoded.member_id,
        });
        if (updated) {
          res
            .status(200)
            .json({ message: "Successfully updated", liked: updated.approved });
        } else {
          res.status(500).json({ error: "Could not update restaurant data" });
        }
      }
    } else {
      res.status(401).json({ error: "Restaurant does not exist" });
    }
  } else {
    res.status(401).json({ error: "Missing restaurant data" });
  }
});

exports.create_restaurants = asyncHandler(async (req, res, next) => {
  const places_data_string = req.body.tags;

  const restaurants = await restaurant_model.create_member_restaurants(
    req.body.member_id,
    places_data_string
  );
  res.status(200).json({ restaurants: [] });
});

exports.restaurant_delete = asyncHandler(async (req, res, next) => {
  if (req.params.mealId && req.decoded.user_id && req.params.placeId) {
    await restaurant_model.meal_restaurant_delete(
      req.params.mealId,
      req.decoded.user_id,
      req.params.placeId
    );
    res.status(200).json({ message: "Successfully deleted" });
  } else {
    res.status(401).json({ error: "Could not delete restaurant" });
  }
});

exports.clear_meal_restaurants = asyncHandler(async (req, res, next) => {
  if (req.params.mealId) {
    await restaurant_model.clear_meal_restaurants(req.params.mealId);
    res.status(200).json({ message: "Successfully deleted" });
  } else {
    res.status(401).json({ error: "Could not delete restaurant" });
  }
});
