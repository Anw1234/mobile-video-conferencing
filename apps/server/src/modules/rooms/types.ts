export type Room = {
  id: string;
  createdAt: number;
  title?: string;
};

export type Participant = {
  id: string;
  roomId: string;
  displayName: string;
  joinedAt: number;
};