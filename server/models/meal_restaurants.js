import { Sequelize, DataTypes } from "@sequelize/core";
import db from "../config/database.js";

const MealRestaurant = db.define("meal_restaurant", {
  res_id: { type: DataTypes.INTEGER, allowNull: false },
  meal_id: { type: DataTypes.INTEGER, allowNull: false },
  in_budget: { type: DataTypes.BOOLEAN, allowNull: true },
  is_open: { type: DataTypes.BOOLEAN, allowNull: true },
});

export default MealRestaurant;
