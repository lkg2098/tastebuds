const asyncHandler = require("express-async-handler");
const member_model = require("../models/members");
const user_model = require("../models/users");

exports.meal_members_get = asyncHandler(async (req, res, next) => {
  let members = await member_model.get_meal_members(
    req.params.mealId,
    req.decoded.member_id
  );
  res.status(200).json({ members: members });
});

exports.meal_member_add = asyncHandler(async (req, res, next) => {
  const { user_id, role } = req.body;
  let rows = await member_model.member_create(req.params.mealId, user_id, role);
  console.log(rows);
  if (rows.length) {
    res.status(200).json({ message: "Successfully added member" });
  } else {
    res.status(401).json({ error: "Member already in meal" });
  }
});

exports.meal_members_add = asyncHandler(async (req, res, next) => {
  //checks if admin

  const usernames = req.body.users;
  if (usernames) {
    // get user ids from usernames (check if the users exist in the process)
    const userIds = await user_model.get_many_ids_by_usernames(usernames);

    if (userIds.length) {
      const idsSet = new Set(userIds.map((user) => user.user_id));

      // get all members currently in the meal
      let existingMembers = await member_model.get_existing_member_ids(
        req.params.mealId
      );

      // find all users not already in meal
      let existingIdSet = new Set(existingMembers.map((user) => user.user_id));
      const newIds = idsSet.difference(existingIdSet);

      // add new ids if they exist
      if (newIds.size) {
        await member_model.member_create_many(req.params.mealId, [...newIds]);

        const responseBody = {
          message: `Successfully added ${userIds.length} new member${
            userIds.length > 1 ? "s" : ""
          }`,
          errors: [],
        };

        if (userIds.length != usernames.length) {
          responseBody.errors.push(
            "Some users could not be added: users not found"
          );
        }
        if (newIds.length != userIds.length) {
          responseBody.errors.push("Some users already in meal");
        }
        res.status(200).json(responseBody);
      } else {
        res.status(401).json({ error: "All users already in meal" });
      }
    } else {
      res.status(401).json({ error: "Could not find users to add" });
    }
  } else {
    res.status(401).json({ error: "No members to add" });
  }
});

exports.meal_member_get_round = asyncHandler(async (req, res, next) => {
  let memberRound = await member_model.member_get_round(req.decoded.member_id);
  res.status(200).json({ round: memberRound });
});

exports.meal_member_update_round = asyncHandler(async (req, res, next) => {
  let memberRound = await member_model.member_update_round(
    req.decoded.member_id
  );
  res.status(200).json({ message: "Updated successfully", round: memberRound });
});

exports.meal_members_delete = asyncHandler(async (req, res, next) => {
  //checks if admin or removing self
  if (req.decoded && req.decoded.role == "admin") {
    await member_model.member_delete(req.params.mealId, req.params.userId);
    res.status(200).json();
  } else {
    res.status(401).json({ error: "Not authorized" });
  }
});

exports.leave_meal = asyncHandler(async (req, res, next) => {
  //checks if admin or removing self
  await member_model.member_delete(req.params.mealId, req.decoded.user_id);
  res.status(200).json();
});
