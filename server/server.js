const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const { exit } = require("process");
const http = require("http");
const cors = require("cors");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const mealsRouter = require("./routes/meals");
const restaurantsRouter = require("./routes/restaurants");
const locationsRouter = require("./routes/location");

const member_model = require("./models/members");

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

module.exports = { app, server };
