import { User } from '../../domain/entities/User';

export interface UserDtoInterface {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export class UserDto {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;

  constructor(props: UserDtoInterface) {
    this.id = props.id;
    this.username = props.username;
    this.email = props.email;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static fromDomain(user: User): UserDto {
    return new UserDto({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  }
}
