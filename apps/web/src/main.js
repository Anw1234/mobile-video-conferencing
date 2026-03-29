import { io } from "socket.io-client";
import "../style.css";

const API_BASE = "http://localhost:3000";
const WS_URL = "http://localhost:3000/ws";

const el = (id) => document.getElementById(id);

const roomIdInput = el("roomId");
const displayNameInput = el("displayName");
const btnCreateRoom = el("createRoom");
const btnJoinRoom = el("joinRoom");
const btnStartWs = el("startWs");
const statusEl = el("status");

const localVideo = el("localVideo");
const remoteVideo = el("remoteVideo");

let socket = null;
let roomId = null;
let participantId = null;

let localStream = null;
let pc = null;
let remoteParticipantId = null;

function setStatus(msg) {
  statusEl.textContent = msg;
  console.log(msg);
}

async function ensureLocalMedia() {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localVideo.srcObject = localStream;
  return localStream;
}

function createPeerConnection(toParticipantId) {
  remoteParticipantId = toParticipantId;

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    socket.emit("rtc:ice", {
      roomId,
      from: participantId,
      to: remoteParticipantId,
      data: event.candidate,
    });
  };

  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }

  return pc;
}

async function makeOffer(toParticipantId) {
  if (!pc) createPeerConnection(toParticipantId);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("rtc:offer", {
    roomId,
    from: participantId,
    to: toParticipantId,
    data: offer,
  });

  setStatus(`Sent offer to ${toParticipantId}`);
}

async function handleOffer(msg) {
  const { from, data } = msg;
  if (!pc) createPeerConnection(from);

  await pc.setRemoteDescription(data);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("rtc:answer", {
    roomId,
    from: participantId,
    to: from,
    data: answer,
  });

  setStatus(`Got offer from ${from}, sent answer`);
}

async function handleAnswer(msg) {
  const { data, from } = msg;
  if (!pc) return;
  await pc.setRemoteDescription(data);
  setStatus(`Got answer from ${from}`);
}

async function handleIce(msg) {
  const { data } = msg;
  if (!pc) return;
  try {
    await pc.addIceCandidate(data);
  } catch (e) {
    console.error("addIceCandidate failed", e);
  }
}

btnCreateRoom.onclick = async () => {
  setStatus("Creating room...");
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "WebRTC room" }),
  });
  const room = await res.json();
  roomIdInput.value = room.id;
  setStatus(`Created room: ${room.id}`);
};

btnJoinRoom.onclick = async () => {
  roomId = roomIdInput.value.trim();
  const displayName = displayNameInput.value.trim();

  if (!roomId) return setStatus("Room ID missing");
  if (!displayName) return setStatus("Display name missing");

  setStatus("Joining room...");
  const res = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });

  const joinRes = await res.json();
  participantId = joinRes.participantId;

  setStatus(`Joined. participantId=${participantId}`);
  btnStartWs.disabled = false;
};

btnStartWs.onclick = async () => {
  if (!roomId || !participantId) return setStatus("Join first");

  await ensureLocalMedia();

  socket = io(WS_URL, { transports: ["websocket"] });

  socket.on("connect", () => {
    setStatus(`WS connected (${socket.id}). rtc:join...`);
    socket.emit("rtc:join", { roomId, participantId });
  });

  socket.on("rtc:peerJoined", async (m) => {
    setStatus(`Peer joined: ${m.participantId}`);
    await makeOffer(m.participantId);
  });

  socket.on("rtc:offer", handleOffer);
  socket.on("rtc:answer", handleAnswer);
  socket.on("rtc:ice", handleIce);

  socket.on("rtc:peerLeft", (m) => {
    setStatus(`Peer left: ${m.participantId}`);
    remoteVideo.srcObject = null;
    if (pc) pc.close();
    pc = null;
    remoteParticipantId = null;
  });
};