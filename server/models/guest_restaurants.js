import { Sequelize, DataTypes } from "@sequelize/core";
import db from "../config/database.js";

const GuestRestaurant = db.define("guest_restaurant", {
  guest_id: { type: DataTypes.INTEGER, allowNull: false },
  meal_restaurant_id: { type: DataTypes.INTEGER, allowNull: false },
  approved: { type: DataTypes.BOOLEAN, allowNull: true },
  score: { type: DataTypes.INTEGER, allowNull: true },
  hidden_from_user: { type: DataTypes.BOOLEAN, allowNull: true },
  rank: { type: DataTypes.INTEGER, allowNull: true },
  vetoed: { type: DataTypes.BOOLEAN, allowNull: true },
});

GuestRestaurant.prototype.vetoedForMeal = async function () {
  const vetoedRestaurant = await GuestRestaurant.findOne({
    where: { meal_restaurant_id: this.meal_restaurant_id, vetoed: "t" },
  });

  return !!vetoedRestaurant;
};

GuestRestaurant.prototype.totalScore = async function () {};

export default GuestRestaurant;
