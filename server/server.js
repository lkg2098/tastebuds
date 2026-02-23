import express from "express";
import "dotenv/config";
import bodyParser from "body-parser";
import { exit } from "process";
import http from "http";
import cors from "cors";
import db from "./config/database.js";

db.authenticate()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Error connecting to database:", err));

import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";
import mealsRouter from "./routes/meals.js";
import restaurantsRouter from "./routes/restaurants.js";
import locationsRouter from "./routes/location.js";

import User from "./models/users.js";
import Restaurant from "./models/restaurants.js";
import Meal from "./models/meals.js";
import MealUser from "./models/guests.js";
import MealUserRestaurant from "./models/guest_restaurants.js";
import MealRestaurant from "./models/meal_restaurants.js";
import Preference from "./models/preferences.js";
import MealUserPreference from "./models/guest_preferences.js";
import setupAssociations from "./models/relations.js";

MealUserRestaurant.sync({ alter: true })
  .then(() =>
    console.log(
      "The table for the MealUserRestaurant model was just (re)created!",
    ),
  )
  .catch((err) => console.log(err));
MealUser.sync({ alter: true })
  .then(() =>
    console.log("The table for the MealUser model was just (re)created!"),
  )
  .catch((err) => console.log(err));

MealRestaurant.sync({ alter: true })
  .then(() =>
    console.log("The table for the MealRestaurant model was just (re)created!"),
  )
  .catch((err) => console.log(err));
User.sync({ alter: true })
  .then(() => console.log("The table for the User model was just (re)created!"))
  .catch((err) => console.log(err));

Restaurant.sync({ alter: true })
  .then(() =>
    console.log("The table for the Restaurant model was just (re)created!"),
  )
  .catch((err) => console.log(err));

Meal.sync({ alter: true })
  .then(() => console.log("The table for the Meal model was just (re)created!"))
  .catch((err) => console.log(err));

Preference.sync()
  .then(() =>
    console.log("The table for the Preference model was just (re)created!"),
  )
  .catch((err) => console.log(err));

MealUserPreference.sync()
  .then(() =>
    console.log(
      "The table for the MealUserPreference model was just (re)created!",
    ),
  )
  .catch((err) => console.log(err));

setupAssociations();

const app = express();

app.use(cors());
const server = http.createServer(app);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/meals", mealsRouter);
app.use("/restaurants", restaurantsRouter);
// app.use("/location", locationsRouter);

const port = process.env.PORT || 3000;

app.closeServer = () => {
  server.close();
};

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

export default { app, server };
