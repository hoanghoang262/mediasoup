import { User } from '../../domain/entities/User';
import { UserRepositoryInterface } from '../../domain/repositories/UserRepository';

export class InMemoryUserRepository implements UserRepositoryInterface {
  private _users: User[] = [];

  constructor(initialUsers: User[] = []) {
    this._users = [...initialUsers];
  }

  async findAll(): Promise<User[]> {
    return [...this._users];
  }

  async findById(id: string): Promise<User | null> {
    const user = this._users.find((user) => user.id === id);
    return user || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = this._users.find((user) => user.username === username);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = this._users.find((user) => user.email === email);
    return user || null;
  }

  async save(user: User): Promise<void> {
    const existingIndex = this._users.findIndex((u) => u.id === user.id);

    if (existingIndex >= 0) {
      this._users[existingIndex] = user;
    } else {
      this._users.push(user);
    }
  }

  async delete(id: string): Promise<void> {
    this._users = this._users.filter((user) => user.id !== id);
  }
}
