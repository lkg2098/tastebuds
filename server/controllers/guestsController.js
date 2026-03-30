import asyncHandler from "express-async-handler";
import { Op } from "sequelize";
import Guest from "../models/guests.js";
import User from "../models/users.js";

export const meal_guests_get = asyncHandler(async (req, res, next) => {
  const guests = await Guest.findAll({
    where: {
      meal_id: req.params.mealId,
      id: { [Op.ne]: req.decoded.guest_id },
    },
    attributes: ["user_id", "role"],
    include: [
      {
        model: User,
        attributes: ["user_id", "name", "username"],
      },
    ],
  });

  res.status(200).json({
    guests: guests.map((guest) => ({
      user_id: guest.user_id,
      name: guest.user?.name,
      username: guest.user?.username,
      role: guest.role,
    })),
  });
});

export const meal_guest_add = asyncHandler(async (req, res, next) => {
  const { user_id, role } = req.body;

  const [guest, created] = await Guest.findOrCreate({
    where: { meal_id: req.params.mealId, user_id },
    defaults: { role: role || "guest" },
  });

  if (created && guest) {
    res.status(200).json({ message: "Successfully added guest" });
  } else {
    res.status(401).json({ error: "Guest already in meal" });
  }
});

export const meal_guest_get_round = asyncHandler(async (req, res, next) => {
  const guest = await Guest.findByPk(req.decoded.guest_id, {
    attributes: ["round"],
  });
  res.status(200).json({ round: guest?.round });
});

export const meal_guest_update_round = asyncHandler(async (req, res, next) => {
  const [, updatedRows] = await Guest.update(
    { round: req.body.round },
    {
      where: { id: req.decoded.guest_id },
      returning: true,
    },
  );

  res.status(200).json({
    message: "Updated successfully",
    round: updatedRows?.[0]?.round,
  });
});

export const meal_guests_delete = asyncHandler(async (req, res, next) => {
  if (req.decoded && req.decoded.role == "admin") {
    await Guest.destroy({
      where: { meal_id: req.params.mealId, user_id: req.params.userId },
    });
    res.status(200).json();
  } else {
    res.status(401).json({ error: "Not authorized" });
  }
});

export const leave_meal = asyncHandler(async (req, res, next) => {
  await Guest.destroy({
    where: { meal_id: req.params.mealId, user_id: req.decoded.user_id },
  });
  res.status(200).json();
});
