import { Room } from '../entities/Room';

export interface RoomRepositoryInterface {
  findAll(): Promise<Room[]>;
  findById(id: string): Promise<Room | null>;
  save(room: Room): Promise<void>;
  delete(id: string): Promise<void>;
}
