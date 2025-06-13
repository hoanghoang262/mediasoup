export interface UserInterface {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserInterface) {
    this.id = props.id;
    this.username = props.username;
    this.email = props.email;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<UserInterface, 'id' | 'createdAt' | 'updatedAt'>,
  ): User {
    const now = new Date();
    return new User({
      id: crypto.randomUUID(),
      username: props.username,
      email: props.email,
      createdAt: now,
      updatedAt: now,
    });
  }

  toJSON(): UserInterface {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
