const { io } = require("socket.io-client");

const roomId = process.argv[2];
const participantId = process.argv[3];
const to = process.argv[4]; // optional

if (!roomId || !participantId) {
  console.log("Usage: node rtc-test.cjs <roomId> <participantId> [toParticipantId]");
  process.exit(1);
}

const socket = io("http://localhost:3000/ws", { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("connected", socket.id, { roomId, participantId });
  socket.emit("rtc:join", { roomId, participantId });

  // după 1 sec, trimite un “fake offer”
  setTimeout(() => {
    socket.emit("rtc:offer", {
      roomId,
      from: participantId,
      to,
      data: { sdp: "fake-offer-sdp", type: "offer" },
    });
    console.log("sent rtc:offer");
  }, 1000);

  // după 2 sec, trimite un “fake ice”
  setTimeout(() => {
    socket.emit("rtc:ice", {
      roomId,
      from: participantId,
      to,
      data: { candidate: "fake-ice-candidate" },
    });
    console.log("sent rtc:ice");
  }, 2000);
});

socket.on("rtc:peerJoined", (m) => console.log("rtc:peerJoined", m));
socket.on("rtc:peerLeft", (m) => console.log("rtc:peerLeft", m));
socket.on("rtc:offer", (m) => console.log("rtc:offer", m));
socket.on("rtc:answer", (m) => console.log("rtc:answer", m));
socket.on("rtc:ice", (m) => console.log("rtc:ice", m));