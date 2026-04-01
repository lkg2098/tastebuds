import asyncHandler from "express-async-handler";
import * as restaurant_model from "../models/restaurants.js";
import * as guest_model from "../models/guests.js";
import * as google_controller from "./googleController.js";

export const restaurants_get_by_meal = asyncHandler(async (req, res, next) => {
  // get restaurant scores - separate column for this guest's scores
  // scores data should be sorted by disliked, not seen, and then by score, low to high
  // go through scores, update google data map with score, user raw score, disliked, and seen by user
  // add res's not seen by user to liked, unseen, and disliked lists
  // return all lists

  const guestLinkId = await guest_model.get_guest_link_id_by_guest(
    req.decoded.guest_id,
  );
  const guestRestaurants = await restaurant_model.get_guest_restaurants(
    req.params.mealId,
    guestLinkId,
  );
  // console.log(req.decoded.guest_id);
  // console.log(guestRestaurants);
  res.status(200).json({
    scores: guestRestaurants,
  });
  // res.status(200).json({
  //   scores: guestRestaurants,
  //   restaurantsMap: req.google_data,
  //   google_sql_string: req.google_sql_string,
  //   tag_map: req.tag_map,
  //   locationInfo: req.locationInfo,
  // });
});

export const restaurants_get_top_dislikes = asyncHandler(
  async (req, res, next) => {
    const guestLinkId = await guest_model.get_guest_link_id_by_guest(
      req.decoded.guest_id,
    );
    const dislikes = await restaurant_model.get_guest_restaurant_dislikes(
      guestLinkId,
    );
    res.status(200).json({ restaurants: dislikes.map((item) => item.res_id) });
  },
);

export const restaurants_set_ranks = asyncHandler(async (req, res, next) => {
  let rankArray = req.body.ranks;
  if (rankArray.length < 1 || rankArray.length > 5) {
    res.status(401).json({ error: "Invalid input array" });
  } else {
    const guestLinkId = await guest_model.get_guest_link_id_by_guest(
      req.decoded.guest_id,
    );
    await restaurant_model.set_guest_ranks(
      guestLinkId,
      req.params.mealId,
      rankArray,
    );
    let guest_round = await guest_model.guest_update_round(
      req.decoded.guest_id,
      2,
    );
    res.status(200).json({ message: "Successfully updated", guest_round });
  }
});

export const check_meal_restaurants_exist = asyncHandler(
  async (req, res, next) => {
    let restaurantsExist = await restaurant_model.meal_restaurants_exist(
      req.params.mealId,
    );
    res.status(200).json({ restaurantsExist });
  },
);

// export const restaurant_add = asyncHandler(async (req, res, next) => {
//   const { place_id } = req.body;
//   const { approved } = req.query;
//   if (place_id && (approved == 0 || approved == 1)) {
//     let restaurant = await restaurant_model.get_restaurant_by_guest_ids(
//       req.params.mealId,
//       req.decoded.user_id,
//       req.body.place_id
//     );

//     if (!restaurant) {
//       let id = await restaurant_model.meal_restaurant_create({
//         place_id: place_id,
//         approved: approved,
//         meal_id: req.params.mealId,
//         user_id: req.decoded.user_id,
//       });

//       if (id) {
//         res
//           .status(200)
//           .json({ message: "Successfully added", liked: approved == 1 });
//       } else {
//         res.status(500).json({ error: "Could not add restaurant data" });
//       }
//     } else {
//       res.status(401).json({ error: "Restaurant already exists" });
//     }
//   } else {
//     res.status(401).json({ error: "Missing restaurant data" });
//   }
// });

export const restaurant_update = asyncHandler(async (req, res, next) => {
  const { res_id, action } = req.body;
  if (res_id && (action == "like" || action == "dislike" || action == "veto")) {
    const guestLinkId = await guest_model.get_guest_link_id_by_guest(
      req.decoded.guest_id,
    );
    let restaurant = await restaurant_model.get_restaurant_by_guest_ids(
      guestLinkId,
      res_id,
    );

    if (restaurant) {
      if (action == "veto") {
      } else if (action == "like") {
        let updated = await restaurant_model.meal_restaurant_like(
          guestLinkId,
          res_id,
        );
        if (updated) {
          res
            .status(200)
            .json({ message: "Successfully updated", liked: updated.approved });
        } else {
          res.status(500).json({ error: "Could not update restaurant data" });
        }
      } else {
        let updated = await restaurant_model.meal_restaurant_dislike(
          guestLinkId,
          res_id,
        );
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

export const create_restaurants = asyncHandler(async (req, res, next) => {
  const places_data_string = req.body.tags;
  const guestLinkId = await guest_model.get_guest_link_id_by_guest(
    req.decoded.guest_id,
  );

  const restaurants = await restaurant_model.create_guest_restaurants(
    guestLinkId,
    places_data_string,
    req.params.mealId,
  );
  res.status(200).json({ restaurants: [] });
});

export const update_meal_restaurants = asyncHandler(async (req, res, next) => {
  let google_data_array; // {res_id: int, regularOpeningHours: [], priceLevel: string}
  let { date, budget } = req.body; // date: ISO string, budget: [int,int]

  if (req.body.google_data_array) {
    google_data_array = req.body.google_data_array;
  } else if (req.google_data_array) {
    google_data_array = req.google_data_array;
  }

  if (google_data_array) {
    let data_arr = google_data_array.map((res) => ({
      meal_id: Number(req.params.mealId),
      res_id: res.res_id,
      is_open: res.regularOpeningHours
        ? google_controller.filter_by_hours(
            res.regularOpeningHours,
            new Date(date),
          )
        : true,
      in_budget: google_controller.filter_by_budget(res.priceLevel, budget),
    }));
    console.log(data_arr);
    await restaurant_model.upsert_meal_restaurants(data_arr);

    res.status(200).json({ message: "Successfully added" });
  } else {
    res.status(401).json({ error: "No restaurant data provided" });
  }
});

// export const guest_restaurant_delete = asyncHandler(async (req, res, next) => {
//   if (req.params.mealId && req.decoded.user_id && req.params.placeId) {
//     await restaurant_model.meal_restaurant_delete(
//       req.params.mealId,
//       req.decoded.user_id,
//       req.params.placeId
//     );
//     res.status(200).json({ message: "Successfully deleted" });
//   } else {
//     res.status(401).json({ error: "Could not delete restaurant" });
//   }
// });

// export const clear_guest_restaurants = asyncHandler(async (req, res, next) => {
//   if (req.params.mealId) {
//     await restaurant_model.clear_guest_restaurants(req.params.mealId);
//     res.status(200).json({ message: "Successfully deleted" });
//   } else {
//     res.status(401).json({ error: "Could not delete restaurant" });
//   }
// });
