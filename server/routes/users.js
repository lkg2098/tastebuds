const express = require("express");
const router = express.Router();

// require user controller
const user_controller = require("../controllers/usersController");
const meal_controller = require("../controllers/mealsController");
const member_controller = require("../controllers/membersController");
const sms_controller = require("../controllers/smsController");
const { generate_password_auth_token } = require("../controllers/auth");
const { verifyToken } = require("../middleware/auth");

//user info
router.get("/", verifyToken, user_controller.users_list);

router.post("/verifyUser", user_controller.user_verify_unique);

router.post("/search", verifyToken, user_controller.users_query_username);

router.get("/account", verifyToken, user_controller.user_get_by_id);

router.put("/account", verifyToken, user_controller.user_update);

router.get("/:username", user_controller.user_get_by_username);

router.put(
  "/account/username",
  verifyToken,
  user_controller.user_update_username
);

// send sms code when user is logged in
// gets username and phone from jwt token verification
router.get(
  "/account/passwordCode",
  verifyToken,
  user_controller.user_get_recovery_phone,
  sms_controller.sendCode
);

// verify sms code when user is logged in
// gets username and phone from jwt token verification
router.put(
  "/account/passwordCode",
  verifyToken,
  user_controller.user_get_recovery_phone,
  sms_controller.verifyCode,
  (req, res, next) => {
    let phone_number = req.phone;
    let passwordToken = generate_password_auth_token(phone_number);
    res.status(200).json({ passwordToken });
  }
);

router.get("/account/password", verifyToken, (req, res, next) => {
  res.status(200).json({ message: "User authenticated" });
});

// verify token here takes a different jwt token than other auth routes
router.put(
  "/account/password",
  verifyToken,
  user_controller.user_update_password
);

router.delete("/", verifyToken, user_controller.user_delete);

module.exports = router;
