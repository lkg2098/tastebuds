const pool = require("../pool");

exports.member_create = async (mealId, userId, role) => {
  try {
    let result = await pool.query(
      `insert into meal_members(user_id, meal_id, role) values ($1,$2,$3)
      on conflict(user_id, meal_id) do nothing
      returning member_id`,
      [userId, mealId, role]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.member_create_many = async (mealId, userIds) => {
  let values = userIds
    .map((userId) => `(${userId},${mealId},'guest')`)
    .join(",");

  try {
    const result = await pool.query(
      `insert into meal_members(user_id, meal_id, role) 
      values ${values} 
      on conflict(user_id, meal_id) do nothing
      returning member_id`,
      []
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_valid_meal_member = async (mealId, userId) => {
  try {
    const result = await pool.query(
      "select member_id, role from meal_members where meal_id = $1 and user_id = $2",
      [mealId, userId]
    );
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_meal_members = async (mealId, memberId) => {
  try {
    const result = await pool.query(
      `select users.user_id, users.name, users.username, meal_members.role
  from users
  join meal_members
  on users.user_id = meal_members.user_id
  where meal_members.meal_id = $1 and meal_members.member_id != $2`,
      [mealId, memberId]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_members_count = async (mealId) => {
  try {
    const result = await pool.query(
      `select count(distinct user_id) as member_count
    from meal_members
    group by meal_id
    having meal_id = $1`,
      [mealId]
    );
    return result.rows[0].member_count;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_existing_member_ids = async (mealId) => {
  try {
    const result = await pool.query(
      "select user_id from meal_members where meal_id=$1",
      [mealId]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_bad_tags = async (mealId, userId) => {
  try {
    const result = await pool.query(
      `select bad_tags from meal_members where meal_id = $1 and user_id = $2`,
      [mealId, userId]
    );
    return result.rows[0].bad_tags;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_min_rating = async (mealId, userId) => {
  try {
    const result = await pool.query(
      `select min_rating from meal_members where meal_id = $1 and user_id = $2`,
      [mealId, userId]
    );
    return result.rows[0].min_rating;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.member_get_round = async (memberId) => {
  try {
    const result = await pool.query(
      `select round from meal_members 
      where member_id = $1`,
      [memberId]
    );
    return result.rows[0].round;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.member_update_round = async (memberId, round) => {
  try {
    const result = await pool.query(
      `update meal_members set round = $2 where member_id = $1 returning round`,
      [memberId, round]
    );
    return result.rows[0].round;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.member_get_settings = async (mealId, userId) => {
  try {
    const result = await pool.query(
      `select min_rating, bad_tags, round from meal_members where meal_id = $1 and user_id = $2`,
      [mealId, userId]
    );
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.member_update_bad_tags = async (memberId, tagList) => {
  try {
    const result = await pool.query(
      `update meal_members set bad_tags = $1 where member_id=$2 returning bad_tags`,
      [tagList, memberId]
    );
    return result.rows[0].bad_tags;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.member_update_min_rating = async (memberId, rating) => {
  try {
    const result = await pool.query(
      `update meal_members set min_rating = $1 where member_id=$2 returning min_rating`,
      [rating, memberId]
    );
    return result.rows[0].min_rating;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.member_delete = async (mealId, userId) => {
  try {
    await pool.query(
      "delete from meal_members where meal_id = $1 and user_id = $2",
      [mealId, userId]
    );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
