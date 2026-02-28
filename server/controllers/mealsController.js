import asyncHandler from "express-async-handler";
import * as meal_model from "../models/meals.js";
import * as member_model from "../models/members.js";
import * as user_model from "../models/users.js";
import * as restaurant_model from "../models/restaurants.js";
import { parse_meal_body } from "../middleware/mealsMiddleware.js";
import User from "../models/users.js";
import Meal from "../models/meals.js";
import { Op } from "sequelize";
import moment from "moment";

export const meals_list_by_user_id = asyncHandler(async (req, res, next) => {
  if (req.decoded) {
    const { time } = req.query;
    const { user_id } = req.decoded;

    try {
      const user = await User.findByPk(user_id);
      let mealFilters = {};

      if (time == "past") {
        mealFilters = {
          where: { scheduled_at: { [Op.lt]: moment().toDate() } },
        };
      } else if (time == "future") {
        mealFilters = {
          where: { scheduled_at: { [Op.gte]: moment().toDate() } },
        };
      } else if (time) {
        res.status(401).json({ error: "Invalid time specified" });
      }

      const meals = await user
        .getMeals({
          include: [
            {
              model: User,
              where: { [Op.not]: { id: user_id } },
              required: false,
            },
          ],
          ...mealFilters,
        })
        .catch((err) => console.log(err));

      const mealsInfo = meals.map((meal) => {
        const {
          meal_name,
          scheduled_at,
          location_id,
          latitude,
          longitude,
          radius,
          budget,
          chosen_restaurant,
          liked,
          users,
        } = meal;

        const guests = users.map((user) => user.guest_name);
        return {
          meal_name,
          scheduled_at,
          location_id,
          latitude,
          longitude,
          radius,
          budget,
          chosen_restaurant,
          liked,
          guests,
        };
      });
      res.status(200).json({ meals: mealsInfo });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: err });
    }
  } else {
    res.status(401).json({ error: "Not authorized" });
  }
});

export const meal_search = asyncHandler(async (req, res, next) => {
  if (req.decoded) {
    const meals = await meal_model.meals_search(
      req.body.queryTerm,
      req.decoded.user_id,
    );
    // const users = await meal_model.meal_members_search(
    //   req.body.queryTerm,
    //   req.decoded.user_id
    // );

    res.status(200).json({});
  }
});

export const meal_create = asyncHandler(async (req, res, next) => {
  if (req.decoded) {
    console.log(req.body);
    const adminId = req.decoded.user_id;
    console.log(adminId);
    // verify that admin user exists
    const adminUser = await User.findByPk(adminId).catch((err) =>
      res.status(500).json({ error: "Server Internal Error: " + err }),
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
        budget,
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

export const meal_get_by_id = asyncHandler(async (req, res, next) => {
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

export const meal_delete = asyncHandler(async (req, res, next) => {
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

export const meal_update = asyncHandler(async (req, res, next) => {
  // verifies membership
  const meal = parse_meal_body(req);
  console.log(meal);
  if (meal.chosen_restaurant) {
    const updatedMeal = await meal_model.meal_update_chosen_restaurant(
      req.params.mealId,
      meal.chosen_restaurant,
    );
    if (updatedMeal) {
      res.status(200).json(updatedMeal);
    } else {
      res.status(401).json({ error: "Could not add chosen restaurant" });
    }
  } else if (meal.liked !== undefined) {
    const updatedMeal = await meal_model.meal_update_liked(
      req.params.mealId,
      meal.liked,
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
        meal,
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

export const meal_check_round = asyncHandler(async (req, res, next) => {
  let meal_round = await meal_model.meal_check_round(req.params.mealId);
  if (meal_round == 0) {
    let unseenResRows = await meal_model.meal_unseen_rows(
      req.params.mealId,
      req.decoded.member_id,
    );
    if (unseenResRows.length == 0) {
      meal_round = await meal_model.update_meal_round(req.params.mealId);
    }
    res.status(200).json({ meal_round });
  } else {
    let unrankedMembers = await meal_model.get_remaining_unranked_members(
      req.params.mealId,
    );
    if (unrankedMembers.length > 0) {
      res.status(200).json({
        remainingMembers: unrankedMembers.map((item) => item.member_id),
      });
    } else {
      let chosen_restaurant = await meal_model.choose_best_ranked(
        req.params.mealId,
      );
      res.status(200).json({ chosen_restaurant });
    }
  }
});

export const meal_update_round = asyncHandler(async (req, res, next) => {
  let updated = await meal_model.update_meal_round(req.params.mealId);
  res.status(200).json({});
});
