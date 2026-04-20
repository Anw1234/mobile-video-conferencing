import { io } from "socket.io-client";
import "./style.css";

const API_BASE = "http://localhost:3000";
const WS_URL = "http://localhost:3000/ws";

const el = (id) => document.getElementById(id);

const roomIdInput = el("roomId");
const displayNameInput = el("displayName");
const btnCreateRoom = el("createRoom");
const btnJoinRoom = el("joinRoom");
const btnStartWs = el("startWs");
const btnLeaveRoom = el("leaveRoom");
const btnToggleAudio = el("toggleAudio");
const btnToggleVideo = el("toggleVideo");
const statusEl = el("status");
const localVideo = el("localVideo");
const remoteVideo = el("remoteVideo");
const participantsList = el("participantsList");

let socket = null;
let roomId = null;
let participantId = null;
let localStream = null;
let pc = null;
let remoteParticipantId = null;
let isAudioEnabled = true;
let isVideoEnabled = true;
let participants = [];
let remoteAudioEnabled = true;
let remoteVideoEnabled = true;

function setStatus(msg) {
  statusEl.textContent = msg;
  console.log(msg);
}

function emitMediaState(nextAudioEnabled, nextVideoEnabled) {
  if (!socket || !participantId) return;

  socket.emit("rtc:mediaState", {
    roomId,
    from: participantId,
    to: remoteParticipantId ?? undefined,
    audioEnabled: nextAudioEnabled,
    videoEnabled: nextVideoEnabled,
  });
}

updateMediaButtons();
setMediaButtonsEnabled(false);
renderParticipants();

function updateMediaButtons() {
  btnToggleAudio.textContent = isAudioEnabled ? "Mute audio" : "Unmute audio";
  btnToggleVideo.textContent = isVideoEnabled ? "Stop video" : "Start video";
}

function setMediaButtonsEnabled(enabled) {
  btnToggleAudio.disabled = !enabled;
  btnToggleVideo.disabled = !enabled;
}

function toggleAudio() {
  if (!localStream) return;

  const audioTracks = localStream.getAudioTracks();
  if (!audioTracks.length) return;

  isAudioEnabled = !isAudioEnabled;
  for (const track of audioTracks) {
    track.enabled = isAudioEnabled;
  }

  updateMediaButtons();
  emitMediaState(isAudioEnabled, isVideoEnabled);
  setStatus(isAudioEnabled ? "Audio unmuted" : "Audio muted");
}

function toggleVideo() {
  if (!localStream) return;

  const videoTracks = localStream.getVideoTracks();
  if (!videoTracks.length) return;

  isVideoEnabled = !isVideoEnabled;
  for (const track of videoTracks) {
    track.enabled = isVideoEnabled;
  }

  updateMediaButtons();
  emitMediaState(isAudioEnabled, isVideoEnabled);
  setStatus(isVideoEnabled ? "Video started" : "Video stopped");
}

function resetPeerConnection() {
  if (pc) {
    try {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
    } catch (e) {
      console.error("pc.close failed", e);
    }
    pc = null;
  }

  remoteParticipantId = null;
  remoteVideo.srcObject = null;

  remoteAudioEnabled = true;
  remoteVideoEnabled = true;
  renderRemoteMediaBadges();
}

function stopLocalMedia() {
  if (localStream) {
    for (const track of localStream.getTracks()) {
      try {
        track.stop();
      } catch (e) {
        console.error("track.stop failed", e);
      }
    }
  }

  localStream = null;
  localVideo.srcObject = null;

  isAudioEnabled = true;
  isVideoEnabled = true;
  updateMediaButtons();
  setMediaButtonsEnabled(false);
}

function disconnectSocket() {
  if (!socket) return;
  try {
    socket.disconnect();
  } catch (e) {
    console.error("socket.disconnect failed", e);
  }
  socket = null;
}

function resetSessionState() {
  participantId = null;
  roomId = roomIdInput.value.trim() || null;
  btnStartWs.disabled = true;
  btnLeaveRoom.disabled = true;
  setMediaButtonsEnabled(false);

  participants = [];
  renderParticipants();
}

async function ensureLocalMedia() {
  if (localStream) return localStream;

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  localVideo.srcObject = localStream;
  isAudioEnabled = true;
  isVideoEnabled = true;
  updateMediaButtons();
  setMediaButtonsEnabled(true);

  return localStream;
}

function createPeerConnection(toParticipantId) {
  remoteParticipantId = toParticipantId;

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (event) => {
    if (!event.candidate || !socket) return;

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

function renderParticipants() {
  if (!participantsList) return;

  participantsList.innerHTML = "";

  if (!participants.length) {
    const li = document.createElement("li");
    li.textContent = "No participants";
    participantsList.appendChild(li);
    return;
  }

  for (const p of participants) {
    const li = document.createElement("li");
    const isMe = p.id === participantId;
    li.textContent = isMe ? `${p.displayName} (you)` : `${p.displayName}`;
    participantsList.appendChild(li);
  }
}

function renderRemoteMediaBadges() {
  const remoteWrapper = document.getElementById("remoteWrapper");
  if (!remoteWrapper) return;

  let topBadge = document.getElementById("remoteAudioBadge");
  let bottomBadge = document.getElementById("remoteVideoBadge");

  if (!topBadge) {
    topBadge = document.createElement("div");
    topBadge.id = "remoteAudioBadge";
    topBadge.className = "overlay-badge";
    remoteWrapper.appendChild(topBadge);
  }

  if (!bottomBadge) {
    bottomBadge = document.createElement("div");
    bottomBadge.id = "remoteVideoBadge";
    bottomBadge.className = "overlay-badge overlay-badge-bottom";
    remoteWrapper.appendChild(bottomBadge);
  }

  topBadge.innerHTML = !remoteAudioEnabled
    ? `🎤 Off`
    : "";

  bottomBadge.innerHTML = !remoteVideoEnabled
    ? `📷 Off`
    : "";

  topBadge.style.display = !remoteAudioEnabled ? "flex" : "none";
  bottomBadge.style.display = !remoteVideoEnabled ? "flex" : "none";
}

async function fetchParticipants() {
  if (!roomId) return;

  try {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/participants`);
    const data = await res.json();

    if (!res.ok) {
      console.error("Failed to fetch participants", data);
      return;
    }

    participants = Array.isArray(data) ? data : [];
    renderParticipants();
  } catch (e) {
    console.error("fetchParticipants failed", e);
  }
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
  emitMediaState(isAudioEnabled, isVideoEnabled);
}

async function handleAnswer(msg) {
  const { from, data } = msg;
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

async function leaveRoom() {
  const currentRoomId = roomId;
  const currentParticipantId = participantId;

  resetPeerConnection();
  stopLocalMedia();
  disconnectSocket();

  if (currentRoomId && currentParticipantId) {
    try {
      await fetch(`${API_BASE}/rooms/${currentRoomId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: currentParticipantId }),
      });
    } catch (e) {
      console.error("leave request failed", e);
    }
  }

  resetSessionState();
  setStatus("Left room");
}

btnCreateRoom.onclick = async () => {
  try {
    setStatus("Creating room...");

    const res = await fetch(`${API_BASE}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "WebRTC room" }),
    });

    const room = await res.json();
    roomIdInput.value = room.id;
    roomId = room.id;

    setStatus(`Created room: ${room.id}`);
  } catch (e) {
    console.error(e);
    setStatus("Create room failed");
  }
};

btnJoinRoom.onclick = async () => {
  try {
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

    if (!res.ok) {
      console.error("Join failed response", joinRes);
      return setStatus(joinRes.message || "Join failed");
    }

    if (!joinRes?.participantId) {
      console.error("Invalid join response", joinRes);
      return setStatus("Join failed");
    }

    participantId = joinRes.participantId;
    await fetchParticipants();

    setStatus(`Joined. participantId=${participantId}`);
    btnStartWs.disabled = false;
    btnLeaveRoom.disabled = false;
  } catch (e) {
    console.error(e);
    setStatus("Join room failed");
  }
};

btnStartWs.onclick = async () => {
  try {
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
      resetPeerConnection();
    });

    btnStartWs.disabled = true;
    btnLeaveRoom.disabled = false;

    socket.on("rooms:participants", (payload) => {
      if (payload?.roomId !== roomId) return;
      participants = Array.isArray(payload.participants)
        ? payload.participants
        : [];
      renderParticipants();
    });
    socket.on("rtc:mediaState", (msg) => {
      if (!msg) return;

      remoteAudioEnabled = msg.audioEnabled;
      remoteVideoEnabled = msg.videoEnabled;
      renderRemoteMediaBadges();
    });
  } catch (e) {
    console.error(e);
    setStatus("WS connect failed");
  }
};

btnLeaveRoom.onclick = async () => {
  await leaveRoom();
};

btnToggleAudio.onclick = () => {
  toggleAudio();
};

btnToggleVideo.onclick = () => {
  toggleVideo();
};
