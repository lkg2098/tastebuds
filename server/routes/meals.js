const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const {
  verify_meal_member,
  check_meal_round,
} = require("../middleware/mealsMiddleware");
const {
  prevent_duplicate_preferences,
  validate_preference_data,
} = require("../middleware/preferencesMiddleware");

const meal_controller = require("../controllers/mealsController");
const member_controller = require("../controllers/membersController");
const restaurant_controller = require("../controllers/restaurantsController");
const preference_controller = require("../controllers/preferencesController");
const google_controller = require("../controllers/googleController");

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
  verify_meal_member,
  meal_controller.meal_get_by_id
);

// update meal
router.put(
  "/:mealId",
  verifyToken,
  verify_meal_member,
  meal_controller.meal_update
);

// delete meal
router.delete(
  "/:mealId",
  verifyToken,
  verify_meal_member,
  meal_controller.meal_delete
);

// meal members
router.get(
  "/:mealId/members",
  verifyToken,
  verify_meal_member,
  member_controller.meal_members_get
);

// add member
router.post(
  "/:mealId/members/new",
  verifyToken,
  verify_meal_member,
  member_controller.meal_member_add
);

// get member round
router.get(
  "/:mealId/members/round",
  verifyToken,
  verify_meal_member,
  member_controller.meal_member_get_round
);

// update member round
router.put(
  "/:mealId/members/round",
  verifyToken,
  verify_meal_member,
  member_controller.meal_member_update_round
);

router.get(
  "/:mealId/restaurants/dislikes",
  verifyToken,
  verify_meal_member,
  restaurant_controller.restaurants_get_top_dislikes
);

router.post(
  "/:mealId/restaurants/rank",
  verifyToken,
  verify_meal_member,
  restaurant_controller.restaurants_set_ranks
);

// get member preferences
router.get(
  "/:mealId/preferences",
  verifyToken,
  verify_meal_member,
  preference_controller.get_preferences_for_meal
);

// update preferences
router.put(
  "/:mealId/preferences",
  verifyToken,
  verify_meal_member,
  validate_preference_data,
  preference_controller.update_preferences
);

// add preferences
router.post(
  "/:mealId/preferences",
  verifyToken,
  verify_meal_member,
  validate_preference_data,
  preference_controller.add_preferences
);

router.get(
  "/:mealId/round",
  verifyToken,
  verify_meal_member,
  meal_controller.meal_check_round
);

router.put(
  "/:mealId/round",
  verifyToken,
  verify_meal_member,
  meal_controller.meal_update_round
);

router.delete(
  "/:mealId/members/:userId",
  verifyToken,
  verify_meal_member,
  member_controller.meal_members_delete
);

router.delete(
  "/:mealId/members",
  verifyToken,
  verify_meal_member,
  member_controller.leave_meal
);

// meal restaurants
// check that meal has restaurants
router.get(
  "/:mealId/restaurants/check",
  verifyToken,
  verify_meal_member,
  restaurant_controller.check_meal_restaurants_exist
);

// get all meal scores
router.get(
  "/:mealId/restaurants",
  verifyToken,
  verify_meal_member,
  restaurant_controller.restaurants_get_by_meal
);

// update restaurant data (like or dislike)
router.put(
  "/:mealId/members/restaurants",
  verifyToken,
  verify_meal_member,
  restaurant_controller.restaurant_update
);

// update restaurants according to new preferences
router.post(
  "/:mealId/restaurants",
  verifyToken,
  verify_meal_member,
  restaurant_controller.update_meal_restaurants
);

//get chosen restaurant data
router.get(
  "/:mealId/chosen_restaurant",
  verifyToken,
  verify_meal_member,
  google_controller.get_chosen_restaurant_details
);

// router.delete(
//   "/:mealId/restaurants/:placeId",
//   verifyToken,
//   verify_meal_member,
//   restaurant_controller.restaurant_delete
// );

// router.delete(
//   "/:mealId/restaurants",
//   verifyToken,
//   verify_meal_member,
//   restaurant_controller.clear_member_restaurants
// );

// google data
router.get(
  "/:mealId/googleData",
  verifyToken,
  verify_meal_member,
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
  }
);

router.put(
  "/:mealId/googleData",
  verifyToken,
  verify_meal_member,
  google_controller.sample_google_data,
  google_controller.update_google_data
);

module.exports = router;
