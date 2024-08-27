import io from "socket.io-client";

// const socket = io("https://tastebuds-4mr3.onrender.com", {
//   transports: ["websocket"],
// });

const socket = io("http://localhost:3000/", {
  transports: ["websocket"],
});

export default socket;
