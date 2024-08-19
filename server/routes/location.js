const express = require("express");
const router = express.Router();

const geocoding_controller = require("../controllers/geocodingController");
const { verifyToken, refreshToken } = require("../middleware/auth");

router.get("/", verifyToken, geocoding_controller.autocomplete);

module.exports = router;
