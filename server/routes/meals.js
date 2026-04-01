import express from "express";
const router = express.Router();

import { verifyToken } from "../middleware/auth.js";
import {
  verify_meal_guest,
  check_meal_round,
} from "../middleware/mealsMiddleware.js";
import {
  prevent_duplicate_preferences,
  validate_preference_data,
} from "../middleware/preferencesMiddleware.js";

import * as meal_controller from "../controllers/mealsController.js";
import * as guest_controller from "../controllers/guestsController.js";
import * as restaurant_controller from "../controllers/restaurantsController.js";
import * as preference_controller from "../controllers/preferencesController.js";
import * as google_controller from "../controllers/googleController.js";

// list meals
router.get("/", verifyToken, meal_controller.meals_list_by_user_id);

// search meals
router.post("/search", verifyToken, meal_controller.meal_search);

// create meal
router.post("/new", verifyToken, meal_controller.meal_create);

router.get("/test", verifyToken, google_controller.get_address);

// get meal by id
router.get(
  "/:mealId",
  verifyToken,
  verify_meal_guest,
  meal_controller.meal_get_by_id,
);

// update meal
router.put(
  "/:mealId",
  verifyToken,
  verify_meal_guest,
  meal_controller.meal_update,
);

// delete meal
router.delete(
  "/:mealId",
  verifyToken,
  verify_meal_guest,
  meal_controller.meal_delete,
);

// meal guests
router.get(
  "/:mealId/guests",
  verifyToken,
  verify_meal_guest,
  guest_controller.meal_guests_get,
);

// add guest
router.post(
  "/:mealId/guests/new",
  verifyToken,
  verify_meal_guest,
  guest_controller.meal_guest_add,
);

// get guest round
router.get(
  "/:mealId/guests/round",
  verifyToken,
  verify_meal_guest,
  guest_controller.meal_guest_get_round,
);

// update guest round
router.put(
  "/:mealId/guests/round",
  verifyToken,
  verify_meal_guest,
  guest_controller.meal_guest_update_round,
);

router.get(
  "/:mealId/restaurants/dislikes",
  verifyToken,
  verify_meal_guest,
  restaurant_controller.restaurants_get_top_dislikes,
);

router.post(
  "/:mealId/restaurants/rank",
  verifyToken,
  verify_meal_guest,
  restaurant_controller.restaurants_set_ranks,
);

// get guest preferences
router.get(
  "/:mealId/preferences",
  verifyToken,
  verify_meal_guest,
  preference_controller.get_preferences_for_meal,
);

// update preferences
router.put(
  "/:mealId/preferences",
  verifyToken,
  verify_meal_guest,
  validate_preference_data,
  preference_controller.update_preferences,
);

// add preferences
router.post(
  "/:mealId/preferences",
  verifyToken,
  verify_meal_guest,
  validate_preference_data,
  preference_controller.add_preferences,
);

router.get(
  "/:mealId/round",
  verifyToken,
  verify_meal_guest,
  meal_controller.meal_check_round,
);

router.put(
  "/:mealId/round",
  verifyToken,
  verify_meal_guest,
  meal_controller.meal_update_round,
);

router.delete(
  "/:mealId/guests/:userId",
  verifyToken,
  verify_meal_guest,
  guest_controller.meal_guests_delete,
);

router.delete(
  "/:mealId/guests",
  verifyToken,
  verify_meal_guest,
  guest_controller.leave_meal,
);

// meal restaurants
// check that meal has restaurants
router.get(
  "/:mealId/restaurants/check",
  verifyToken,
  verify_meal_guest,
  restaurant_controller.check_meal_restaurants_exist,
);

// get all meal scores
router.get(
  "/:mealId/restaurants",
  verifyToken,
  verify_meal_guest,
  restaurant_controller.restaurants_get_by_meal,
);

// update restaurant data (like or dislike)
router.put(
  "/:mealId/guests/restaurants",
  verifyToken,
  verify_meal_guest,
  restaurant_controller.restaurant_update,
);

// update restaurants according to new preferences
router.post(
  "/:mealId/restaurants",
  verifyToken,
  verify_meal_guest,
  restaurant_controller.update_meal_restaurants,
);

//get chosen restaurant data
router.get(
  "/:mealId/chosen_restaurant",
  verifyToken,
  verify_meal_guest,
  google_controller.get_chosen_restaurant_details,
);

// router.delete(
//   "/:mealId/restaurants/:placeId",
//   verifyToken,
//   verify_meal_guest,
//   restaurant_controller.restaurant_delete
// );

// router.delete(
//   "/:mealId/restaurants",
//   verifyToken,
//   verify_meal_guest,
//   restaurant_controller.clear_guest_restaurants
// );

// google data
router.get(
  "/:mealId/googleData",
  verifyToken,
  verify_meal_guest,
  google_controller.sample_google_data,
  async (req, res, next) => {
    let { tag_map, places_data, db_ids } = req.googleData;
    let locationInfo = req.locationInfo;
    // console.log(locationInfo);
    for (let id of db_ids) {
      places_data[id.res_id] = places_data[id.place_id];
      delete places_data[id.place_id];
    }

    res.status(200).json({
      restaurantsMap: places_data,
      tag_map: tag_map,
      locationInfo: locationInfo,
    });
  },
);

router.put(
  "/:mealId/googleData",
  verifyToken,
  verify_meal_guest,
  google_controller.sample_google_data,
  google_controller.update_google_data,
);

export default router;
