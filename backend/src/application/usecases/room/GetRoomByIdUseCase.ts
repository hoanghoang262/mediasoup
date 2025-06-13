import { RoomRepositoryInterface } from '../../../domain/repositories/RoomRepository';
import { RoomDto } from '../../dtos/RoomDto';

export class GetRoomByIdUseCase {
  constructor(private readonly _roomRepository: RoomRepositoryInterface) {}

  async execute(id: string): Promise<RoomDto | null> {
    const room = await this._roomRepository.findById(id);
    return room ? RoomDto.fromDomain(room) : null;
  }
}
