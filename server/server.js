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

import setupAssociations from "./models/relations.js";

db.sync({ alter: true });

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

export { app, server };
