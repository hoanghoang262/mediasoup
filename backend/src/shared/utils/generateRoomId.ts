import { customAlphabet } from 'nanoid';

import { RoomRepositoryInterface } from '../../domain/repositories/RoomRepository';

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 10);

/**
 * Generates a unique room ID in the format 'abc-defg-hijk' (10 lowercase letters, grouped with dashes).
 * Checks the repository to ensure uniqueness.
 */
export async function generateRoomId(
  roomRepository: RoomRepositoryInterface,
): Promise<string> {
  let id: string;
  let exists = true;
  do {
    const raw = nanoid();
    // Format: abc-defg-hijk
    id = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 10)}`;
    exists = !!(await roomRepository.findById(id));
  } while (exists);
  return id;
}
