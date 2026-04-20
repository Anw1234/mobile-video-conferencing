import React, { useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
} from "react-native";
import { io } from "socket.io-client";
import {
  mediaDevices,
  RTCPeerConnection,
  RTCView,
} from "react-native-webrtc";
import { Ionicons } from "@expo/vector-icons";

const API_BASE = "http://192.168.1.245:3000";
const WS_URL = "http://192.168.1.245:3000/ws";

type JoinRoomResponse = {
  roomId: string;
  participantId: string;
  token: string;
  participant: {
    id: string;
    roomId: string;
    displayName: string;
    joinedAt: number;
  };
};

type RtcJoinPayload = {
  roomId: string;
  participantId: string;
};

type RtcSignalPayload = {
  roomId: string;
  from: string;
  to?: string;
  data: any;
};

export default function HomeScreen() {
  const [roomId, setRoomId] = useState("");
  const [displayName, setDisplayName] = useState("Andrei Mobile");
  const [status, setStatus] = useState("Idle");
  const [participantId, setParticipantId] = useState<string | null>(null);

  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);

  const socketRef = useRef<any>(null);
  const pcRef = useRef<any>(null);
  const remoteParticipantIdRef = useRef<string | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const [participants, setParticipants] = useState<
  { id: string; displayName: string; roomId: string; joinedAt: number }[]
>([]);

  const setStatusSafe = (msg: string) => {
    console.log(msg);
    setStatus(msg);
  };

  const createRoom = async () => {
    try {
      setStatusSafe("Creating room...");

      const res = await fetch(`${API_BASE}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Mobile room" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusSafe(data?.message || "Create room failed");
        return;
      }

      setRoomId(data.id);
      setStatusSafe(`Created room: ${data.id}`);
    } catch (error) {
      console.error(error);
      setStatusSafe("Create room failed");
    }
  };

  const joinRoom = async () => {
    try {
      if (!roomId.trim()) {
        setStatusSafe("Room ID missing");
        return;
      }

      if (!displayName.trim()) {
        setStatusSafe("Display name missing");
        return;
      }

      setStatusSafe("Joining room...");

      const res = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      const data: JoinRoomResponse | { message?: string } = await res.json();

      if (!res.ok || !("participantId" in data)) {
        setStatusSafe((data as { message?: string })?.message || "Join failed");
        return;
      }

      setParticipantId(data.participantId);
      setStatusSafe(`Joined room: ${data.participantId}`);
      await fetchParticipants();
    } catch (error) {
      console.error(error);
      setStatusSafe("Join room failed");
    }
  };

  const fetchParticipants = async () => {
  try {
    if (!roomId) return;

    const res = await fetch(`${API_BASE}/rooms/${roomId}/participants`);
    const data = await res.json();

    if (!res.ok) {
      console.error("Failed to fetch participants", data);
      return;
    }

    setParticipants(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("fetchParticipants failed", error);
  }
};

  const ensureLocalMedia = async (): Promise<any> => {
    if (localStream) return localStream;

    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: "user",
      },
    });

    setLocalStream(stream);
    return stream;
  };

  const createPeerConnection = async (toParticipantId: string): Promise<any> => {
    remoteParticipantIdRef.current = toParticipantId;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    (pc as any).onicecandidate = (event: any) => {
      if (!event?.candidate || !socketRef.current || !participantId) return;

      const payload: RtcSignalPayload = {
        roomId,
        from: participantId,
        to: remoteParticipantIdRef.current ?? undefined,
        data: event.candidate,
      };

      socketRef.current.emit("rtc:ice", payload);
    };

    (pc as any).ontrack = (event: any) => {
      const stream = event?.streams?.[0];
      if (stream) {
        setRemoteStream(stream);
      }
    };

    const stream = await ensureLocalMedia();
    stream.getTracks().forEach((track: any) => {
      pc.addTrack(track, stream);
    });

    pcRef.current = pc;
    return pc;
  };

  const makeOffer = async (toParticipantId: string) => {
    try {
      if (!participantId) {
        setStatusSafe("Missing participantId");
        return;
      }

      let pc = pcRef.current;
      if (!pc) {
        pc = await createPeerConnection(toParticipantId);
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const payload: RtcSignalPayload = {
        roomId,
        from: participantId,
        to: toParticipantId,
        data: offer,
      };

      socketRef.current?.emit("rtc:offer", payload);

      setStatusSafe(`Sent offer to ${toParticipantId}`);
    } catch (error) {
      console.error(error);
      setStatusSafe("Create/send offer failed");
    }
  };

  const connectWs = async () => {
    try {
      if (!roomId || !participantId) {
        setStatusSafe("Join first");
        return;
      }

      await ensureLocalMedia();

      const socket = io(WS_URL, {
        transports: ["websocket"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setStatusSafe(`WS connected: ${socket.id}`);
        setIsWsConnected(true);

        const payload: RtcJoinPayload = {
          roomId,
          participantId,
        };

        socket.emit("rtc:join", payload);
      });

      socket.on("rtc:peerJoined", async (m: { participantId: string }) => {
        setStatusSafe(`Peer joined: ${m.participantId}`);
        await makeOffer(m.participantId);
        emitMediaState(isAudioEnabled, isVideoEnabled);
      });

      socket.on("rtc:offer", async (msg: RtcSignalPayload) => {
        try {
          if (!participantId) return;

          const { from, data } = msg;

          let pc = pcRef.current;
          if (!pc) {
            pc = await createPeerConnection(from);
          }

          await pc.setRemoteDescription(data);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          const payload: RtcSignalPayload = {
            roomId,
            from: participantId,
            to: from,
            data: answer,
          };

          socket.emit("rtc:answer", payload);

          setStatusSafe(`Got offer from ${from}, sent answer`);
        } catch (error) {
          console.error(error);
          setStatusSafe("Handle offer failed");
        }
      });

      socket.on("rtc:answer", async (msg: RtcSignalPayload) => {
        try {
          const { from, data } = msg;
          if (!pcRef.current) return;

          await pcRef.current.setRemoteDescription(data);
          setStatusSafe(`Got answer from ${from}`);
        } catch (error) {
          console.error(error);
          setStatusSafe("Handle answer failed");
        }
      });

      socket.on("rtc:ice", async (msg: RtcSignalPayload) => {
        try {
          const { data } = msg;
          if (!pcRef.current) return;

          await pcRef.current.addIceCandidate(data);
        } catch (error) {
          console.error(error);
          setStatusSafe("Add ICE failed");
        }
      });

      socket.on("rtc:peerLeft", () => {
        setStatusSafe("Peer left");
        setRemoteStream(null);

        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }

        fetchParticipants();
      });

      socket.on("rtc:mediaState", (msg: any) => {
        if (!msg) return;
        setRemoteAudioEnabled(msg.audioEnabled);
        setRemoteVideoEnabled(msg.videoEnabled);
      });

      socket.on("rooms:participants", (payload: any) => {
        if (!payload?.roomId || payload.roomId !== roomId) return;
        setParticipants(Array.isArray(payload.participants) ? payload.participants : []);
      });

    } catch (error) {
      console.error(error);
      setStatusSafe("WS connect failed");
    }
  };

  const leaveRoom = async () => {
    try {
      const currentRoomId = roomId;
      const currentParticipantId = participantId;

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      if (localStream) {
        localStream.getTracks().forEach((track: any) => track.stop());
      }

      setLocalStream(null);
      setRemoteStream(null);
      remoteParticipantIdRef.current = null;

      if (currentRoomId && currentParticipantId) {
        await fetch(`${API_BASE}/rooms/${currentRoomId}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: currentParticipantId }),
        });
      }

      setParticipantId(null);
      setStatusSafe("Left room");

      setRemoteAudioEnabled(true);
      setRemoteVideoEnabled(true);
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
      setParticipants([]);
      setIsWsConnected(false);
    } catch (error) {
      console.error(error);
      setStatusSafe("Leave failed");
    }
  };

  function toggleAudio() {
  if (!localStream) return;

  const nextAudioEnabled = !isAudioEnabled;

  localStream.getAudioTracks().forEach((track: any) => {
    track.enabled = nextAudioEnabled;
  });

  setIsAudioEnabled(nextAudioEnabled);
  emitMediaState(nextAudioEnabled, isVideoEnabled);
}

  function toggleVideo() {
  if (!localStream) return;

  const nextVideoEnabled = !isVideoEnabled;

  localStream.getVideoTracks().forEach((track: any) => {
    track.enabled = nextVideoEnabled;
  });

  setIsVideoEnabled(nextVideoEnabled);
  emitMediaState(isAudioEnabled, nextVideoEnabled);
}

  function emitMediaState(
    nextAudioEnabled: boolean,
    nextVideoEnabled: boolean
  ) {
    if (!socketRef.current || !participantId) return;

    socketRef.current.emit("rtc:mediaState", {
      roomId,
      from: participantId,
      to: remoteParticipantIdRef.current ?? undefined,
      audioEnabled: nextAudioEnabled,
      videoEnabled: nextVideoEnabled,
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Mobile WebRTC Test</Text>

        <TextInput
          style={styles.input}
          placeholder="Room ID"
          value={roomId}
          onChangeText={setRoomId}
        />

        <TextInput
          style={styles.input}
          placeholder="Display name"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <View style={styles.row}>
          <Button title="Create room" onPress={createRoom} />
          <Button title="Join room" onPress={joinRoom} />
        </View>

        <View style={styles.row}>
          <Button title="Connect WS" onPress={connectWs} />
          <Button title="Leave" onPress={leaveRoom} />
        </View>

        <View style={styles.row}>
          <Button
            title={isAudioEnabled ? "Mute audio" : "Unmute audio"}
            onPress={toggleAudio}
          />
          <Button
            title={isVideoEnabled ? "Stop video" : "Start video"}
            onPress={toggleVideo}
          />
        </View>

        <View style={styles.indicatorRow}>
          <View style={styles.indicator}>
            <Ionicons
              name={isAudioEnabled ? "mic" : "mic-off"}
              size={18}
              color={isAudioEnabled ? "green" : "red"}
            />
            <Text style={styles.indicatorText}>
              {isAudioEnabled ? "Mic on" : "Muted"}
            </Text>
          </View>

          <View style={styles.indicator}>
            <Ionicons
              name={isVideoEnabled ? "videocam" : "videocam-off"}
              size={18}
              color={isVideoEnabled ? "green" : "red"}
            />
            <Text style={styles.indicatorText}>
              {isVideoEnabled ? "Video on" : "Video stopped"}
            </Text>
          </View>
        </View>

        <Text style={styles.status}>{status}</Text>
          {participantId && (
            <View style={styles.participantsBox}>
              <Text style={styles.participantsTitle}>Participants</Text>

              {!isWsConnected ? (
                participants.some((p) => p.id !== participantId) ? (
                  <Text style={styles.participantItem}>Someone is here</Text>
                ) : (
                  <Text style={styles.participantItem}>Waiting for others...</Text>
                )
              ) : (
                <>
                  {participants
                    .filter((p) => p.id === participantId)
                    .map((p) => (
                      <Text key={p.id} style={styles.participantItem}>
                        {p.displayName} (you)
                      </Text>
                    ))}

                  {participants
                    .filter((p) => p.id !== participantId)
                    .map((p) => (
                      <Text key={p.id} style={styles.participantItem}>
                        {p.displayName}
                      </Text>
                    ))}

                  {participants.length === 1 && (
                    <Text style={styles.participantItem}>Waiting for others...</Text>
                  )}
                </>
              )}
            </View>
          )}

        <Text style={styles.label}>Local</Text>
        {localStream ? (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.video}
            objectFit="cover"
            mirror
          />
        ) : (
          <View style={styles.placeholder} />
        )}

        <Text style={styles.label}>Remote</Text>
        <View style={styles.remoteWrapper}>
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.video}
              objectFit="cover"
            />
          ) : (
            <View style={styles.placeholder} />
          )}

          {!remoteAudioEnabled && (
            <View style={styles.overlayBadge}>
              <Ionicons name="mic-off" size={16} color="#fff" />
              <Text style={styles.overlayBadgeText}>Muted</Text>
            </View>
          )}

          {!remoteVideoEnabled && (
            <View style={styles.overlayBadgeBottom}>
              <Ionicons name="videocam-off" size={16} color="#fff" />
              <Text style={styles.overlayBadgeText}>Video off</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  status: {
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  video: {
    width: "100%",
    height: 240,
    backgroundColor: "#111",
    borderRadius: 12,
  },
  placeholder: {
    width: "100%",
    height: 240,
    backgroundColor: "#ddd",
    borderRadius: 12,
  },
indicatorRow: {
  flexDirection: "row",
  gap: 12,
  marginBottom: 12,
},

indicator: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: "#f3f3f3",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
},

indicatorText: {
  fontSize: 14,
  fontWeight: "500",
},

remoteWrapper: {
  position: "relative",
},

overlayBadge: {
  position: "absolute",
  top: 10,
  left: 10,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: "rgba(0,0,0,0.7)",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
},

overlayBadgeBottom: {
  position: "absolute",
  bottom: 10,
  left: 10,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: "rgba(0,0,0,0.7)",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
},

overlayBadgeText: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "600",
},

participantsBox: {
  marginTop: 8,
  marginBottom: 8,
  padding: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  backgroundColor: "#fafafa",
},

participantsTitle: {
  fontSize: 16,
  fontWeight: "700",
  marginBottom: 8,
},

participantItem: {
  fontSize: 14,
  marginBottom: 6,
},
});