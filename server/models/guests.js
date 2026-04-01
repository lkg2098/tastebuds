import { Sequelize, DataTypes } from "sequelize";
import db from "../config/database.js";
import pool from "../pool.js";

const Guest = db.define(
  "guest",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "guest_id",
    },
  meal_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isIn: [["admin", "guest"]] },
  },
  round: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 2 },
  },
  bad_tags: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
  min_rating: { type: DataTypes.FLOAT, allowNull: true },
  },
  { tableName: "meal_guests" },
);

export const get_valid_meal_guest = async (mealId, userId) => {
  const guest = await Guest.findOne({
    where: { meal_id: mealId, user_id: userId },
    attributes: ["id", "role"],
  });

  if (!guest) {
    return null;
  }

  return { guest_id: guest.id, role: guest.role };
};

export const get_guest_link_id = async (mealId, userId) => {
  try {
    const result = await pool.query(
      `select guest_id from meal_guests where meal_id = $1 and user_id = $2`,
      [mealId, userId],
    );
    return result.rows[0]?.guest_id ?? null;
  } catch (err) {
    return null;
  }
};

export const get_guest_link_id_by_guest = async (guestId) => {
  const guest = await Guest.findByPk(guestId, {
    attributes: ["meal_id", "user_id"],
  });
  if (!guest) {
    return null;
  }
  return get_guest_link_id(guest.meal_id, guest.user_id);
};

export const guest_create = async (mealId, userId, role) => {
  const [guest] = await Guest.findOrCreate({
    where: { meal_id: mealId, user_id: userId },
    defaults: { role },
  });

  try {
    const result = await pool.query(
      `insert into meal_guests(user_id, meal_id, role)
       values ($1, $2, $3)
       on conflict(user_id, meal_id) do nothing
       returning guest_id`,
      [userId, mealId, role],
    );
    return result.rows[0]?.guest_id ?? get_guest_link_id(mealId, userId);
  } catch (err) {
    return guest.id;
  }
};

export const guest_delete = async (mealId, userId) => {
  await Guest.destroy({ where: { meal_id: mealId, user_id: userId } });
  try {
    await pool.query(
      `delete from meal_guests where meal_id = $1 and user_id = $2`,
      [mealId, userId],
    );
  } catch (err) {
    return;
  }
};

export const guest_update_round = async (guestId, round) => {
  const guestLinkId = await get_guest_link_id_by_guest(guestId);
  if (!guestLinkId) {
    const [, updatedRows] = await Guest.update(
      { round },
      { where: { id: guestId }, returning: true },
    );
    return updatedRows?.[0]?.round ?? null;
  }
  const result = await pool.query(
    `update meal_guests set round = $2 where guest_id = $1 returning round`,
    [guestLinkId, round],
  );
  return result.rows[0]?.round;
};

export const guest_get_round = async (guestId) => {
  const guestLinkId = await get_guest_link_id_by_guest(guestId);
  if (!guestLinkId) {
    const guest = await Guest.findByPk(guestId, { attributes: ["round"] });
    return guest?.round ?? null;
  }
  const result = await pool.query(
    `select round from meal_guests where guest_id = $1`,
    [guestLinkId],
  );
  return result.rows[0]?.round ?? null;
};

export const get_bad_tags = async (mealId, userId) => {
  const result = await pool.query(
    `select bad_tags from meal_guests where meal_id = $1 and user_id = $2`,
    [mealId, userId],
  );
  return result.rows[0]?.bad_tags ?? null;
};

export const get_min_rating = async (mealId, userId) => {
  const result = await pool.query(
    `select min_rating from meal_guests where meal_id = $1 and user_id = $2`,
    [mealId, userId],
  );
  return result.rows[0]?.min_rating ?? null;
};

export const guest_get_settings = async (mealId, userId) => {
  const result = await pool.query(
    `select min_rating, bad_tags, round from meal_guests where meal_id = $1 and user_id = $2`,
    [mealId, userId],
  );
  return result.rows[0];
};

export const guest_update_bad_tags = async (guestId, tagList) => {
  const guestLinkId = await get_guest_link_id_by_guest(guestId);
  if (!guestLinkId) {
    return null;
  }
  const result = await pool.query(
    `update meal_guests set bad_tags = $1 where guest_id = $2 returning bad_tags`,
    [tagList, guestLinkId],
  );
  return result.rows[0]?.bad_tags;
};

export const guest_update_min_rating = async (guestId, rating) => {
  const guestLinkId = await get_guest_link_id_by_guest(guestId);
  if (!guestLinkId) {
    return null;
  }
  const result = await pool.query(
    `update meal_guests set min_rating = $1 where guest_id = $2 returning min_rating`,
    [rating, guestLinkId],
  );
  return result.rows[0]?.min_rating;
};

export default Guest;
