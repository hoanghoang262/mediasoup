import { RoomRepositoryInterface } from '../../../domain/repositories/RoomRepository';
import { RoomDto } from '../../dtos/RoomDto';

export class JoinRoomUseCase {
  constructor(private readonly _roomRepository: RoomRepositoryInterface) {}

  async execute(id: string): Promise<RoomDto | null> {
    const existingRoom = await this._roomRepository.findById(id);
    if (existingRoom) {
      return RoomDto.fromDomain(existingRoom);
    }
    return null;
  }
}
