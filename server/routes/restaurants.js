import express from "express";
const router = express.Router();

import * as google_controller from "../controllers/googleController.js";
import { verifyToken } from "../middleware/auth.js";
import { verify_meal_member } from "../middleware/mealsMiddleware.js";

router.get("/", google_controller.nearby_search);

router.get("/coords", verifyToken, google_controller.more_results);

router.post("/photo", verifyToken, google_controller.get_google_photo);
export default router;
