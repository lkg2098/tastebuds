import db from "../config/database.js";
import { Sequelize, DataTypes } from "sequelize";

const GuestPreference = db.define("guest_preference", {
  preference_id: { type: DataTypes.INTEGER, allowNull: false },
  guest_id: { type: DataTypes.INTEGER, allowNull: false },
  wants: { type: DataTypes.BOOLEAN },
});

export default GuestPreference;
