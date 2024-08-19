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
    origin: "http://localhost:3000/", //"https://tastebuds-4mr3.onrender.com",
    methods: ["GET", "POST"],
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

io.on("connection", (socket) => {
  console.log("user connected");
  socket.on("joinMeal", (mealId, memberId) => {
    socket.join(mealId);
  });

  socket.on("leaveMeal", (mealId, memberId) => {
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
