import asyncHandler from "express-async-handler";
import User from "../models/users.js";
import { generate_auth_tokens } from "./auth.js";
import bcrypt from "bcrypt";

// displays user registrations page
export const user_register_page = asyncHandler(async (req, res, next) => {
  res
    .status(200)
    .json({ message: "Not implemented: user registration GET page" });
});

export const verifyCredentials = async (username, phone) => {
  try {
    let existingUsername = false;
    let existingPhoneNumber = false;

    if (username) {
      existingUsername = await user_model.get_user_by_username(username);
    }

    if (phone) {
      existingPhoneNumber = await user_model.check_existing_phone(phone);
    }

    return {
      usernameExists: Boolean(existingUsername),
      phoneNumberExists: Boolean(existingPhoneNumber),
    };
  } catch (err) {
    console.log(err);
    return err;
  }
};

export const user_verify_unique = asyncHandler(async (req, res, next) => {
  let { username, phone_number } = req.body;

  let { usernameExists, phoneNumberExists } = await this.verifyCredentials(
    username,
    phone_number,
  );
  if (!usernameExists && !phoneNumberExists) {
    res.status(200).json({
      message: "Verified username and phone number!",
      loginInfo: { username, phone_number },
    });
  } else {
    res.status(401).json({
      usernameExists,
      phoneNumberExists,
    });
  }
});

// displays update user information page
export const user_update_page = asyncHandler(async (req, res, next) => {
  res.json("Not implemented: user update GET page");
});

// update user information
export const user_update_username = asyncHandler(async (req, res, next) => {
  let { newUsername } = req.body;
  if (!newUsername || req.decoded.username == newUsername) {
    res.status(500).json({ error: "Invalid new username" });
  } else {
    let existingUser = await User.findOne({ where: { username: newUsername } });

    if (!existingUser) {
      await existingUser.update({
        username: newUsername,
      });

      let accessTokens = generate_auth_tokens(req.decoded.user_id, newUsername);

      res
        .status(200)
        .json({ ...accessTokens, message: "Username updated successfully" });
    } else {
      res.status(500).json({ error: "Username taken" });
    }
  }
});

export const user_update_password = asyncHandler(async (req, res, next) => {
  let { newPassword } = req.body;
  let { phone_number } = req.decoded;
  if (!newPassword) {
    res.status(422).json({ error: "Invalid new password" });
  } else if (!phone_number) {
    res.status(401).json({ error: "Invalid auth token" });
  } else {
    let passwordHash = await bcrypt.hash(newPassword, 8);

    const user = User.findOne({ where: { phone_number } });

    await user.update({ password: passwordHash });

    res.status(200).json({ message: "Successfully reset password" });
  }
});

export const user_update = asyncHandler(async (req, res, next) => {
  const user_id = req.decoded.user_id;

  if (!user_id) {
    res.status(401).json({ message: "Not authorized" });
  }
  try {
    const user = await User.findByPk(user_id);

    await user.update(req.body);
    res.status(200).json({ message: "Successfully updated" });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// get user by id (for account info page)
export const user_get_by_id = asyncHandler(async (req, res, next) => {
  if (req.decoded && req.decoded.user_id) {
    let user = await User.findByPk(req.decoded.user_id);

    if (user) {
      res.status(200).json({ user: user });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } else {
    res.status(401).json({ error: "Not authorized" });
  }
});

// get user by username (for searching and displaying user page)
export const user_get_by_username = asyncHandler(async (req, res, next) => {
  let user = await User.findOne({ where: { username: req.params.username } });
  if (user) {
    res.status(200).json({ user: user });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// display login page
export const user_login_page = asyncHandler(async (req, res, next) => {
  res.json("Not implemented: user login GET page");
});

// list users
export const users_list = asyncHandler(async (req, res, next) => {
  let users = await User.findAll();
  res.status(200).json({ users: users });
});

// query users by username autocomplete
export const users_query_username = asyncHandler(async (req, res, next) => {
  const queryTerm = req.body.queryTerm;
  try {
    const users = await User.findAll({
      where: {
        [Op.not]: { username: searcher },
        [Op.or]: {
          username: { [Op.like]: `%${queryTerm}%` },
          name: { [Op.like]: `%${queryTerm}%` },
        },
      },
    });

    res.status(200).json({ users: users });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

export const user_get_recovery_phone = asyncHandler(async (req, res, next) => {
  let username;
  if (req.decoded) {
    username = req.decoded.username;
  } else if (req.query.username) {
    username = req.query.username;
  } else if (req.body.username) {
    username = req.body.username;
  }

  if (username) {
    const user = await User.findOne({ where: { username: username } });

    if (user.phone_number) {
      req.phone = user.phone_number;
      next();
    } else {
      res
        .status(404)
        .json({ error: "No recovery phone number associated with this user" });
    }
  } else {
    res.status(422).json({ error: "No username provided" });
  }
});

// delete user
export const user_delete = asyncHandler(async (req, res, next) => {
  if (req.decoded) {
    try {
      await User.destroy({ where: { id: req.decoded.user_id } });
      res.status(200).json({ message: "Successfully deleted" });
    } catch (err) {
      res.status(500).json({ error: err });
    }
  } else {
    res.status(401).json({ error: "Not authorized" });
  }
});
