import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

type RtcJoinPayload = {
  roomId: string;
  participantId: string;
};

type RtcSignalPayload = {
  roomId: string;
  from: string; // participantId
  to?: string;  // participantId (optional)
  data: any;    // SDP / ICE
};

@WebSocketGateway({
  namespace: "/ws",
  cors: { origin: true, credentials: true },
})
export class RtcGateway {
  @WebSocketServer()
  server!: Server;

  // roomId -> (participantId -> socketId)
  private readonly socketsByRoom = new Map<string, Map<string, string>>();

  private upsert(roomId: string, participantId: string, socketId: string) {
    const roomMap = this.socketsByRoom.get(roomId) ?? new Map<string, string>();
    roomMap.set(participantId, socketId);
    this.socketsByRoom.set(roomId, roomMap);
  }

  private remove(roomId: string, participantId: string) {
    const roomMap = this.socketsByRoom.get(roomId);
    if (!roomMap) return;
    roomMap.delete(participantId);
    if (roomMap.size === 0) this.socketsByRoom.delete(roomId);
  }

  private getSocketId(roomId: string, participantId: string) {
    return this.socketsByRoom.get(roomId)?.get(participantId);
  }

  @SubscribeMessage("rtc:join")
  onJoin(
    @MessageBody() body: RtcJoinPayload,
    @ConnectedSocket() socket: Socket,
  ) {
    if (!body?.roomId || !body?.participantId) return { ok: false };

    socket.data.roomId = body.roomId;
    socket.data.participantId = body.participantId;

    socket.join(body.roomId);
    this.upsert(body.roomId, body.participantId, socket.id);

    // anunță restul din room că a intrat un peer nou
    socket.to(body.roomId).emit("rtc:peerJoined", {
      roomId: body.roomId,
      participantId: body.participantId,
    });

    return { ok: true };
  }

  @SubscribeMessage("rtc:offer")
  onOffer(
    @MessageBody() msg: RtcSignalPayload,
    @ConnectedSocket() socket: Socket,
  ) {
    if (!msg?.roomId || !msg?.from || !msg?.data) return;

    if (msg.to) {
      const targetSocketId = this.getSocketId(msg.roomId, msg.to);
      if (targetSocketId) {
        this.server.to(targetSocketId).emit("rtc:offer", msg);
      }
      return;
    }

    // broadcast în room, fără sender
    socket.to(msg.roomId).emit("rtc:offer", msg);
  }

  @SubscribeMessage("rtc:answer")
  onAnswer(
    @MessageBody() msg: RtcSignalPayload,
    @ConnectedSocket() socket: Socket,
  ) {
    if (!msg?.roomId || !msg?.from || !msg?.data) return;

    if (msg.to) {
      const targetSocketId = this.getSocketId(msg.roomId, msg.to);
      if (targetSocketId) {
        this.server.to(targetSocketId).emit("rtc:answer", msg);
      }
      return;
    }

    socket.to(msg.roomId).emit("rtc:answer", msg);
  }

  @SubscribeMessage("rtc:ice")
  onIce(
    @MessageBody() msg: RtcSignalPayload,
    @ConnectedSocket() socket: Socket,
  ) {
    if (!msg?.roomId || !msg?.from || !msg?.data) return;

    if (msg.to) {
      const targetSocketId = this.getSocketId(msg.roomId, msg.to);
      if (targetSocketId) {
        this.server.to(targetSocketId).emit("rtc:ice", msg);
      }
      return;
    }

    socket.to(msg.roomId).emit("rtc:ice", msg);
  }

  // cleanup la disconnect
  handleDisconnect(socket: Socket) {
    const roomId = socket.data?.roomId as string | undefined;
    const participantId = socket.data?.participantId as string | undefined;
    if (!roomId || !participantId) return;

    this.remove(roomId, participantId);

    socket.to(roomId).emit("rtc:peerLeft", {
      roomId,
      participantId,
    });
  }
}