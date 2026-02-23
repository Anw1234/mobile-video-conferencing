import { io } from "socket.io-client";

const socket = io("http://localhost:3000/ws", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("connected", socket.id);

  const roomId = process.argv[2];
  if (roomId) socket.emit("rooms:subscribe", { roomId });
});

socket.on("rooms:created", (room) => console.log("rooms:created", room));
socket.on("rooms:participantJoined", (p) => console.log("joined", p));
socket.on("rooms:participantLeft", (p) => console.log("left", p));
socket.on("rooms:participants", (p) => console.log("participants", p));