import { Room } from '../../../domain/entities/Room';
import { RoomRepositoryInterface } from '../../../domain/repositories/RoomRepository';
import { RoomDto } from '../../dtos/RoomDto';

export class GetOrCreateRoomUseCase {
  constructor(private readonly _roomRepository: RoomRepositoryInterface) {}

  async execute(id: string): Promise<RoomDto> {
    let room = await this._roomRepository.findById(id);

    if (!room) {
      // Create new room if it doesn't exist
      room = Room.create(id);
      await this._roomRepository.save(room);
    }

    return RoomDto.fromDomain(room);
  }
}
