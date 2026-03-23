import pool from "../pool.js";

import db from "../config/database.js";
import { Op, Sequelize, DataTypes } from "sequelize";
import bcrypt from "bcrypt";
import Meal from "./meals.js";
import Guest from "./guests.js";

const User = db.define("user", {
  username: { type: DataTypes.STRING, allowNull: false },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue("password", bcrypt.hashSync(value, 8));
    },
  },
  name: { type: DataTypes.STRING, allowNull: true },
  phone_number: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true },
  push_token: { type: DataTypes.STRING, allowNull: true },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  guest_name: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.name || this.username;
    },
  },
});

User.prototype.getMeals = async function (options) {
  const meals = await Meal.findAll({
    include: [
      {
        model: Guest,
        as: "Guests",
        where: { user_id: this.id },
      },
    ],
    ...options,
  });

  return Promise.all(
    meals.map(async (meal) => {
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
      } = meal;

      const guestsWithUsers = await Guest.findAll({
        include: [{ model: User }],
        where: { user_id: { [Op.ne]: this.id }, meal_id: meal.id },
      });

      const guests = guestsWithUsers.map((guest) => guest.user.guest_name);
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
    }),
  );
};

export default User;
