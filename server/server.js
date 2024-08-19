const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const { exit } = require("process");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const mealsRouter = require("./routes/meals");
const restaurantsRouter = require("./routes/restaurants");
const locationsRouter = require("./routes/location");

const member_model = require("./models/members");

const app = express();

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://tastebuds-4mr3.onrender.com",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
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

io.engine.on("connection_error", (err) => {
  console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
});

io.on("connection", (socket) => {
  console.log("user connected");
  socket.on("joinMeal", (mealId, memberId) => {
    console.log("joining meal");
    socket.join(mealId);
  });

  socket.on("testEndpoint", () => {
    socket.emit("test succeeded");
  });

  socket.on("leaveMeal", (mealId, memberId) => {
    console.log("leaving meal");
    socket.leave(mealId);
  });

  socket.on("deleteMeal", (mealId) => {
    socket.to(mealId).emit("sessionDeleted");
  });

  socket.on("like", (meal, restaurant) => {
    console.log(restaurant);
    if (restaurant && restaurant.score != 1) {
      socket.to(meal).emit("newResData", restaurant, 1);
    } else {
      socket.to(meal).emit("match", restaurant);
    }
  });

  socket.on("dislike", (meal, restaurant) => {
    console.log(restaurant);
    socket.to(meal).emit("newResData", restaurant, 0);
  });

  socket.on("settingsChange", (meal, settings) => {
    console.log(settings);
    socket.to(meal).emit("settingsUpdate", settings);
  });

  socket.on("requestData", (meal) => {
    console.log(meal);
    io.to(meal).emit("sendData", "someData");
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

module.exports = app;
