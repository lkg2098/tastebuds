import express from "express";
const router = express.Router();

import * as geocoding_controller from "../controllers/geocodingController.js";
import { verifyToken, refreshToken } from "../middleware/auth.js";

router.get("/", verifyToken, geocoding_controller.autocomplete);

export default router;
