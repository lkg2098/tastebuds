const express = require("express");
const router = express.Router();

const google_controller = require("../controllers/googleController");
const { verifyToken } = require("../middleware/auth");
const { verify_meal_member } = require("../middleware/mealsMiddleware");

router.get("/", google_controller.nearby_search);

router.get("/coords", verifyToken, google_controller.more_results);

router.post("/photo", verifyToken, google_controller.get_google_photo);
module.exports = router;
