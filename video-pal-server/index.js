const express = require("express");
const app = express();
const server = require("http").createServer(app);
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

var waiting_list = [];
var rooms = {};
var users = {};

var findStranger = (socket) => {
  if (waiting_list.length) {
    var peer = waiting_list.pop();
    if (peer) {
      var room = socket.id + "@" + peer.id;
      console.log("currrent_user", socket.id);
      console.log("new_room", room);
      console.log("current_room before joining", socket.rooms);

      peer.join(room);
      socket.join(room);

      rooms[peer.id] = room;
      rooms[socket.id] = room;

      peer.emit("stranger-connected", { room: room });
      socket.emit("stranger-connected", { room: room });
    }
  } else {
    waiting_list.push(socket);
  }
};

io.on("connection", async (socket) => {
  // console.log(Object.keys(users));
  socket.on("find-stranger", () => {
    if (!users[socket.id]) {
      users[socket.id] = socket;
      findStranger(socket);
    }
  });

  socket.on("call-user", ({ offer, room }) => {
    socket.broadcast.to(room).emit("incomming-call", offer);
  });

  socket.on("call-accepted", ({ answer, room }) => {
    socket.broadcast.to(room).emit("call-accepted", answer);
  });

  socket.on("send-message", ({ msg, room }) => {
    io.to(room).emit("new-message", msg);
  });

  socket.on("change-stranger", () => {
    var room = rooms[socket.id];
    io.to(room).emit("leave-room");
    console.log("current_room before leaving", socket.rooms);
    io.sockets.socketsLeave(room);
    console.log("current_room", socket.rooms);
    var peer_id = room.split("@");
    peer_id = peer_id[0] === socket.id ? peer_id[1] : peer_id[0];

    findStranger(socket);
    findStranger(users[peer_id]);
  });

  // socket.on("leave", () => {
  //   var room = rooms[socket.id];
  //   socket.broadcast.to(room).emit("Leaving room");

  //   var peer_id = room.split["@"];
  //   peer_id = peer_id[0] === socket.id ? peer_id[1] : peer_id[0];

  //   // delete users[socket.id];

  //   findStranger(users[peer_id], "leave");
  // });

  socket.on("disconnect", () => {
    var room = rooms[socket.id];
    delete users[socket.id];
    delete rooms[socket.id];
    waiting_list = waiting_list?.filter((peer) => peer.id !== socket.id);
    // if (room?.split("@").includes(socket.id)) {
    //   console.log("in");
    //   io.to(room).emit("leave-room");
    //   var peer_id = room.split("@");
    //   peer_id = peer_id[0] === socket.id ? peer_id[1] : peer_id[0];

    //   findStranger(users[peer_id]);
    // }
  });
});

server.listen(PORT, () => console.log(`Server running on port: ${PORT}`));
