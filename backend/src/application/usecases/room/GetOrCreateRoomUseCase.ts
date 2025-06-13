import { Room } from '../../../domain/entities/Room';
import { RoomRepositoryInterface } from '../../../domain/repositories/RoomRepository';
import { RoomDto } from '../../dtos/RoomDto';

export class GetOrCreateRoomUseCase {
  constructor(private readonly _roomRepository: RoomRepositoryInterface) {}

  async execute(id: string): Promise<RoomDto> {
    const existingRoom = await this._roomRepository.findById(id);

    if (existingRoom) {
      return RoomDto.fromDomain(existingRoom);
    }

    const newRoom = Room.create(id);
    await this._roomRepository.save(newRoom);
    return RoomDto.fromDomain(newRoom);
  }
}
