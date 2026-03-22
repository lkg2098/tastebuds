import asyncHandler from "express-async-handler";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import user_model from "../models/users.js";
import * as user_controller from "./usersController.js";
import User from "../models/users.js";

export const user_is_logged_in = (req, res, next) => {
  console.log("checking...");
  res.status(200).json({ message: "Successfully logged in!" });
};
export const generate_auth_tokens = (user_id, username) => {
  let accessToken = jwt.sign({ user_id, username }, process.env.JWT_SECRET, {
    expiresIn: "2d",
  });
  let refreshToken = jwt.sign({ username }, process.env.REFRESH_SECRET, {
    expiresIn: "10d",
  });

  return { accessToken, refreshToken };
};

export const generate_password_auth_token = (phone_number) => {
  let passwordToken = jwt.sign(
    { phone_number: phone_number },
    process.env.JWT_SECRET,
    { expiresIn: "20m" },
  );
  return passwordToken;
};

export const register = asyncHandler(async (req, res, next) => {
  const { username, password, phone_number } = req.body;

  const userWithUsername = await User.findOne({ username });
  const userWithPhoneNumber = await User.findOne({ phone_number });

  if (userWithUsername) {
    res.status(401).json({ error: "This username is taken" });
  } else if (userWithPhoneNumber) {
    res.status(401).json({ error: "This phone number is taken" });
  } else {
    let newUser = await User.create({
      username,
      password,
      phone_number,
    }).catch((err) => res.status(500).json({ error: err }));
    let accessTokens = this.generate_auth_tokens(newUser.id, username);
    res.status(200).json({
      ...accessTokens,
      message: "Registered successfully",
      userId: newUser.id,
    });
  }
});

export const login = asyncHandler(async (req, res, next) => {
  try {
    const { username, password } = req.body;

    let user = await User.findOne({ where: { username } });

    if (user) {
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) {
          res.status(500).json({ error: err });
        } else {
          if (result) {
            let accessTokens = generate_auth_tokens(user.id, username);
            res
              .status(200)
              .json({ ...accessTokens, message: "Login successful" });
          } else {
            res.status(401).json({ error: "Incorrect password" });
          }
        }
      });
    } else {
      res.status(401).json({ error: "Invalid username" });
    }
  } catch (err) {
    console.log(err);
  }
});

export const get_verification_code = asyncHandler(async (req, res, next) => {
  const code = Math.floor(Math.random() * 9000 + 1000);
  res.status(200).json({ smsCode: code });
});
