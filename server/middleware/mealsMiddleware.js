import asyncHandler from "express-async-handler";
import * as guest_model from "../models/guests.js";
import * as meal_model from "../models/meals.js";

export const verify_meal_guest = asyncHandler(async (req, res, next) => {
  if (req.decoded) {
    const mealId = req.params.mealId;
    const guest = await guest_model
      .get_valid_meal_guest(mealId, req.decoded.user_id)
      .catch((err) => res.status(500).json({ error: err }));

    if (guest) {
      req.decoded = {
        ...req.decoded,
        role: guest.role,
        guest_id: guest.guest_id,
      };
      next();
    } else {
      console.log("Not authorized, guest not in meal");
      return res
        .status(401)
        .json({ error: "Not authorized, guest not in meal" });
    }
  } else {
    console.log("Not authorized, guest not found");
    return res.status(401).json({ error: "Not authorized" });
  }
});

export const parse_meal_body = (req) => {
  return {
    meal_name: req.body.meal_name,
    meal_photo: req.body.meal_photo,
    created_at: new Date().toISOString(),
    scheduled_at: req.body.scheduled_at,
    location_id: req.body.location_id,
    location_coords: req.body.location_coords || [],
    radius: req.body.radius,
    budget: req.body.budget,
    chosen_restaurant: req.body.chosen_restaurant,
    liked: req.body.liked,
  };
};

export const check_meal_round = asyncHandler(async (req, res, next) => {
  let updated = await meal_model.meal_check_round(req.params.mealId);
  res.status(200).json({ meal_round_updated: false });
});
