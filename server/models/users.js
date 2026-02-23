import pool from "../pool.js";

import { Sequelize, DataTypes } from "@sequelize/core";
import db from "../config/database.js";
import { Op } from "sequelize";

const User = db.define("user", {
  username: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: true },
  phone_number: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true },
  push_token: { type: DataTypes.STRING, allowNull: true },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

export default User;
