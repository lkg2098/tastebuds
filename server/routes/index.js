const express = require("express");
const router = express.Router();
const pool = require("../pool");
const bcrypt = require("bcrypt");
const sms = require("../sms");

// require user controller
const user_controller = require("../controllers/usersController");
const sms_controller = require("../controllers/smsController");
const auth = require("../controllers/auth");
const { verifyToken, refreshToken } = require("../middleware/auth");

router.get("/", verifyToken, auth.user_is_logged_in);

router.get("/signup", user_controller.user_register_page);

router.post("/signup", sms_controller.verifyCode, auth.register);

router.get("/login", user_controller.user_login_page);

router.post("/login", auth.login);

router.post("/refresh", refreshToken);

// send sms code when existing user forgot account and is logged out
// username is input and used to get phone number
router.get(
  "/forgotPassword",
  user_controller.user_get_recovery_phone,
  sms_controller.sendCode
);

// verify sms code when existing user forgot account and is logged out
// username is input and used to get phone number
router.put(
  "/forgotPassword",
  user_controller.user_get_recovery_phone,
  sms_controller.verifyCode,
  (req, res, next) => {
    let phone_number = req.phone;
    let passwordToken = auth.generate_password_auth_token(phone_number);
    res.status(200).json({ passwordToken });
  }
);

// send sms code for phone number validation on create account
// will be passed phone number directly
router.get(
  "/verifyPhone",
  async (req, res, next) => {
    console.log(req);
    if (req.query.phone_number) {
      req.phone = req.query.phone_number;
      next();
    } else {
      res.status(401).json({ error: "No phone number provided" });
    }
  },
  sms_controller.sendCode
);

// router.post(
//   "/sms",
//   async (req, res, next) => {
//     console.log(req);
//     if (req.query.phone_number) {
//       req.phone = req.query.phone_number;
//       next();
//     } else {
//       res.status(401).json({ error: "No phone number provided" });
//     }
//   },
//   sms_controller.verifyCode
// );

module.exports = router;
