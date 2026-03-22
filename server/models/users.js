import pool from "../pool.js";

import { Sequelize, DataTypes } from "@sequelize/core";
import db from "../config/database.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";

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

export default User;
