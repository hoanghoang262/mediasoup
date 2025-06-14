import { UserRepositoryInterface } from '../../../domain/repositories/UserRepository';
import { UserDto } from '../../dtos/UserDto';

export class GetAllUsersUseCase {
  constructor(private readonly _userRepository: UserRepositoryInterface) {}

  async execute(): Promise<UserDto[]> {
    const users = await this._userRepository.findAll();
    return users.map((user) => UserDto.fromDomain(user));
  }
}
