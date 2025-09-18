const { server } = require("./server");
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: "https://tastebuds-4mr3.onrender.com",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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
      socket.to(meal).emit("newResData", restaurant, "like");
    } else {
      socket.to(meal).emit("match", restaurant);
    }
  });

  socket.on("dislike", (meal, restaurant) => {
    console.log(restaurant);
    socket.to(meal).emit("newResData", restaurant, "dislike");
  });

  socket.on("settingsChange", (meal, settings) => {
    console.log("settings", settings);
    socket.to(meal).emit("settingsUpdate", settings || {});
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});
