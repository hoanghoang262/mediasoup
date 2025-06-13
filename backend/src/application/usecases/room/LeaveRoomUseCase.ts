import { RoomRepositoryInterface } from '../../../domain/repositories/RoomRepository';

export class LeaveRoomUseCase {
  constructor(private readonly _roomRepository: RoomRepositoryInterface) {}

  async execute(roomId: string, participantId: string): Promise<void> {
    const room = await this._roomRepository.findById(roomId);

    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (!room.hasParticipant(participantId)) {
      throw new Error(`Participant ${participantId} not in room ${roomId}`);
    }

    room.removeParticipant(participantId);
    await this._roomRepository.save(room);

    // If room is empty, we could optionally remove it
    // This would be handled by the RoomManager in the infrastructure layer
  }
}
