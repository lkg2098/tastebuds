const asyncHandler = require("express-async-handler");
const meal_model = require("../models/meals");
const member_model = require("../models/members");
const user_model = require("../models/users");
const restaurant_model = require("../models/restaurants");
const { parse_meal_body } = require("../middleware/mealsMiddleware");

exports.meals_list_by_user_id = asyncHandler(async (req, res, next) => {
  if (req.decoded) {
    const { time } = req.query;
    console.log(time);
    if (!time) {
      const meals = await meal_model
        .get_meals_by_user_id(req.decoded.user_id)
        .catch((err) => res.status(500).json({ error: err }));
      console.log(meals);
      res.status(200).json({ meals: meals });
    } else if (time == "past") {
      const meals = await meal_model
        .get_past_meals_by_user_id(req.decoded.user_id)
        .catch((err) => res.status(500).json({ error: err }));
      res.status(200).json({ meals: meals });
    } else if (time == "future") {
      const meals = await meal_model
        .get_future_meals_by_user_id(req.decoded.user_id)
        .catch((err) => res.status(500).json({ error: err }));
      res.status(200).json({ meals: meals });
    } else {
      res.status(401).json({ error: "Invalid time specified" });
    }
  } else {
    res.status(401).json({ error: "Not authorized" });
  }
});

exports.meal_search = asyncHandler(async (req, res, next) => {
  if (req.decoded) {
    const meals = await meal_model.meals_search(
      req.body.queryTerm,
      req.decoded.user_id
    );
    // const users = await meal_model.meal_members_search(
    //   req.body.queryTerm,
    //   req.decoded.user_id
    // );

    res.status(200).json({});
  }
});

exports.meal_create = asyncHandler(async (req, res, next) => {
  if (req.decoded) {
    console.log(req.body);
    const adminId = req.decoded.user_id;
    console.log(adminId);
    // verify that admin user exists
    const adminUser = await user_model
      .get_user_by_id(adminId)
      .catch((err) =>
        res.status(500).json({ error: "Server Internal Error: " + err })
      );
    console.log(adminUser);
    if (adminUser) {
      const {
        meal_name,
        meal_photo,
        created_at,
        scheduled_at,
        location_id,
        location_coords,
        radius,
        budget,
      } = parse_meal_body(req);
      console.log(req.body);
      //create meal
      let meal = await meal_model.meal_create(
        meal_name,
        meal_photo,
        created_at,
        scheduled_at,
        location_id,
        location_coords,
        radius,
        budget
      );

      // add admin user
      let testAdmin = await member_model.member_create(meal, adminId, "admin");
      console.log(testAdmin);
      if (meal) {
        res.status(200).json({ meal_id: meal });
      } else {
        res
          .status(401)
          .json({ error: "Insufficient data. Could not create meal" });
      }
    } else {
      res.status(404).json({ error: "Admin user not found" });
    }
  } else {
    res.status(401).json({ error: "Not authorized" });
  }
});

exports.meal_get_by_id = asyncHandler(async (req, res, next) => {
  //verifies membership
  console.log(req.params.mealId, req.decoded.member_id);
  const meal = await meal_model
    .meal_get_by_id(req.params.mealId, req.decoded.member_id)
    .catch((err) => {
      console.log(err);
    });
  console.log(meal);
  res.status(200).json({ meal: meal, userRole: req.decoded.role });
});

exports.meal_delete = asyncHandler(async (req, res, next) => {
  //checks if admin
  if (req.decoded.role && req.decoded.role == "admin") {
    await meal_model.meal_delete(req.params.mealId).catch((err) => {
      console.log(err);
      res.status(500).json({ error: err });
    });
    res.status(200).json();
  } else {
    res.status(401).json({ error: "Not authorized" });
  }
});

exports.meal_update = asyncHandler(async (req, res, next) => {
  // verifies membership
  const meal = parse_meal_body(req);
  console.log(meal);
  if (meal.chosen_restaurant) {
    const updatedMeal = await meal_model.meal_update_chosen_restaurant(
      req.params.mealId,
      meal.chosen_restaurant
    );
    if (updatedMeal) {
      res.status(200).json(updatedMeal);
    } else {
      res.status(401).json({ error: "Could not add chosen restaurant" });
    }
  } else if (meal.liked !== undefined) {
    const updatedMeal = await meal_model.meal_update_liked(
      req.params.mealId,
      meal.liked
    );
    if (updatedMeal) {
      res.status(200).json({ liked: updatedMeal.liked });
    } else {
      res.status(401).json({ error: "Could not update meal" });
    }
  } else {
    if (req.decoded.role && req.decoded.role == "admin") {
      const updatedMeal = await meal_model.meal_update_meal(
        req.params.mealId,
        meal
      );
      if (updatedMeal) {
        res.status(200).json(updatedMeal);
      } else {
        res.status(401).json({ error: "Could not update meal" });
      }
    } else {
      res.status(401).json({ error: "Not authorized" });
    }
  }
});

exports.meal_check_round = asyncHandler(async (req, res, next) => {
  let meal_round = await meal_model.meal_check_round(req.params.mealId);
  if (meal_round == 0) {
    let unseenResRows = await meal_model.meal_unseen_rows(
      req.params.mealId,
      req.decoded.member_id
    );
    if (unseenResRows.length == 0) {
      let check_meal_restaurants =
        await restaurant_model.meal_restaurants_exist(req.params.mealId);
      if (check_meal_restaurants) {
        meal_round = await meal_model.update_meal_round(req.params.mealId);
      }
    }
    res.status(200).json({ meal_round });
  } else {
    let unrankedMembers = await meal_model.get_remaining_unranked_members(
      req.params.mealId
    );
    if (unrankedMembers.length > 0) {
      res.status(200).json({
        remainingMembers: unrankedMembers.map((item) => item.member_id),
      });
    } else {
      let chosen_restaurant = await meal_model.choose_best_ranked(
        req.params.mealId
      );
      res.status(200).json({ chosen_restaurant });
    }
  }
});

exports.meal_update_round = asyncHandler(async (req, res, next) => {
  let updated = await meal_model.update_meal_round(req.params.mealId);
  res.status(200).json({});
});
