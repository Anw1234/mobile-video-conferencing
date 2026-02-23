import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  namespace: "/ws",
  cors: { origin: true, credentials: true },
})
export class RoomsGateway {
  @WebSocketServer()
  server!: Server;

  /**
   * Clientul trimite: socket.emit('rooms:subscribe', { roomId })
   * Noi băgăm socket-ul în "room" ca să putem face server.to(roomId).emit(...)
   */
  @SubscribeMessage("rooms:subscribe")
  handleSubscribe(
    @MessageBody() body: { roomId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    if (!body?.roomId) return { ok: false };
    socket.join(body.roomId);
    return { ok: true, roomId: body.roomId };
  }

  @SubscribeMessage("rooms:unsubscribe")
  handleUnsubscribe(
    @MessageBody() body: { roomId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    if (!body?.roomId) return { ok: false };
    socket.leave(body.roomId);
    return { ok: true, roomId: body.roomId };
  }
}