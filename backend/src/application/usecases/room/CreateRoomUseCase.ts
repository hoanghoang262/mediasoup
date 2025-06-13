import { Room } from '../../../domain/entities/Room';
import { RoomRepositoryInterface } from '../../../domain/repositories/RoomRepository';
import { RoomDto } from '../../dtos/RoomDto';

export class CreateRoomUseCase {
  constructor(private readonly _roomRepository: RoomRepositoryInterface) {}

  async execute(id: string): Promise<RoomDto> {
    const room = Room.create(id);
    await this._roomRepository.save(room);
    return RoomDto.fromDomain(room);
  }
}
