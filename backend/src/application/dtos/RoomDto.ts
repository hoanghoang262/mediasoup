import { Room } from '../../domain/entities/Room';

export interface RoomDtoInterface {
  id: string;
  createdAt: string;
  routerId?: string;
  participants: string[];
  participantCount: number;
}

export class RoomDto {
  id: string;
  createdAt: string;
  routerId?: string;
  participants: string[];
  participantCount: number;

  constructor(props: RoomDtoInterface) {
    this.id = props.id;
    this.createdAt = props.createdAt;
    this.routerId = props.routerId;
    this.participants = props.participants;
    this.participantCount = props.participantCount;
  }

  static fromDomain(room: Room): RoomDto {
    return new RoomDto({
      id: room.id,
      createdAt: room.createdAt.toISOString(),
      routerId: room.routerId,
      participants: room.participants,
      participantCount: room.participantCount,
    });
  }
}
