const pool = require("../pool");

exports.create_user = async (username, password, phone_number) => {
  try {
    const result = await pool.query(
      "INSERT INTO users(username, password, phone_number) values($1,$2,$3) returning *",
      [username, password, phone_number]
    );

    return result.rows[0].user_id;
  } catch (err) {
    throw err;
  }
};

exports.update_username = async (id, username) => {
  try {
    const result = await pool.query(
      "update users set username = $1 where user_id = $2 returning username",
      [username, id]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

exports.update_password = async (id, passwordHash) => {
  try {
    await pool.query("update users set password = $1 where user_id = $2", [
      passwordHash,
      id,
    ]);
  } catch (err) {
    throw err;
  }
};

exports.update_name = async (id, name) => {
  try {
    const result = await pool.query(
      "update users set name = $1 where user_id = $2 returning name",
      [name, id]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

exports.update_phone_number = async (id, phone) => {
  try {
    const result = await pool.query(
      "update users set phone_number = $1 where user_id = $2 returning phone_number",
      [phone, id]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

exports.update_email = async (id, email) => {
  try {
    const result = await pool.query(
      "update users set email = $1 where user_id = $2 returning email",
      [email, id]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

exports.update_profile_image = async (id, url) => {
  try {
    const result = await pool.query(
      "update users set profile_image = $1 where user_id = $2 returning profile_image",
      [url, id]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

exports.update_push_token = async (id, token) => {
  try {
    const result = await pool.query(
      "update users set push_token = $1 where user_id = $2 returning push_token",
      [token, id]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

exports.list_users = async () => {
  try {
    let result = await pool.query("select * from users", []);
    return result.rows;
  } catch (err) {
    throw err;
  }
};

exports.search_users = async (queryTerm, searcher) => {
  try {
    let result = await pool.query(
      "select user_id, username, name from users where (username like $1 or name like $1) and username != $2",
      [`%${queryTerm}%`, searcher]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_user_by_id = async (id) => {
  try {
    const result = await pool.query("select * from users where user_id = $1", [
      id,
    ]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

exports.get_many_ids_by_usernames = async (usernames) => {
  const queries = usernames.join("' , '");
  try {
    const result = await pool.query(
      `select user_id from users 
    where username in ('${queries}')`,
      []
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_user_by_username = async (username) => {
  try {
    let result = await pool.query("select * from users where username = $1", [
      username,
    ]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

exports.check_existing_phone = async (phone_number) => {
  try {
    let result = await pool.query(
      "select user_id from users where phone_number = $1",
      [phone_number]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

exports.delete_user = async (id) => {
  try {
    await pool.query("delete from users where user_id = $1", [id]);
  } catch (err) {
    throw err;
  }
};
