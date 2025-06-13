import { RoomRepositoryInterface } from '../../../domain/repositories/RoomRepository';
import { RoomDto } from '../../dtos/RoomDto';

export class GetAllRoomsUseCase {
  constructor(private readonly _roomRepository: RoomRepositoryInterface) {}

  async execute(): Promise<RoomDto[]> {
    const rooms = await this._roomRepository.findAll();
    return rooms.map((room) => RoomDto.fromDomain(room));
  }
}
