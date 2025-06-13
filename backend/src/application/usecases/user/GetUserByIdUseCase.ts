import { UserRepositoryInterface } from '../../../domain/repositories/UserRepository';
import { UserDto } from '../../dtos/UserDto';

export class GetUserByIdUseCase {
  constructor(private readonly _userRepository: UserRepositoryInterface) {}

  async execute(id: string): Promise<UserDto | null> {
    const user = await this._userRepository.findById(id);
    return user ? UserDto.fromDomain(user) : null;
  }
}
