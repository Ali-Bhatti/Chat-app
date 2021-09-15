const http = require("http");
const path = require("path");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const PORT = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(publicDirectoryPath));

// following function will run when new Connection will be made
io.on("connection", (socket) => {
  console.log("New WebSocket connection");

  /* ------- EVENT EMITTERS --------------- */
  // socket.emit(to specific user), io.emit(to all users), socket.broadcast.emit(to all users except himself/hersefl)
  // io.to(roomName).emit(to all room users), socket.broadcast.to(roomName).emit(to all room users except himself/hersefl)

  // -------- EVENT RECEIVERS -------------

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });
    // for sending back error if occured
    if (error) {
      return callback(error);
    }
    socket.join(user.room);

    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );
    // to send data of all users in a room
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    callback();
  });

  socket.on("sendMessage", (msg, callback) => {
    const user = getUser(socket.id);

    const filter = new Filter();
    if (filter.isProfane(msg)) {
      return callback("Profinity is not allowed");
    }
    io.to(user.room).emit("message", generateMessage(user.username, msg));
    callback(); // to receive the acknowledgement
  });

  // Event receiver to receive location
  socket.on("sendLocation", (location, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      //`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
      generateLocationMessage(
        user.username,
        `https://www.google.com/maps/@${location.latitude},${location.longitude}`
      )
    );
    callback();
  });

  // to emit a msg when a user left
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left.`)
      );
      // to send data of all users in a room
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is up at http://localhost:${PORT}`);
});
