import { Room } from '../../domain/entities/Room';
import { RoomRepositoryInterface } from '../../domain/repositories/RoomRepository';

export class InMemoryRoomRepository implements RoomRepositoryInterface {
  private _rooms: Map<string, Room> = new Map();

  constructor(initialRooms: Room[] = []) {
    initialRooms.forEach((room) => {
      this._rooms.set(room.id, room);
    });
  }

  async findAll(): Promise<Room[]> {
    return Array.from(this._rooms.values());
  }

  async findById(id: string): Promise<Room | null> {
    const room = this._rooms.get(id);
    return room || null;
  }

  async save(room: Room): Promise<void> {
    this._rooms.set(room.id, room);
  }

  async delete(id: string): Promise<void> {
    this._rooms.delete(id);
  }

  async getOrCreate(id: string): Promise<Room> {
    let room = await this.findById(id);

    if (!room) {
      room = Room.create(id);
      await this.save(room);
    }

    return room;
  }
}
