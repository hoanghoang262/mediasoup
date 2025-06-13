export interface ParticipantInterface {
  id: string;
  joinedAt: Date;
  displayName?: string;
  device?: string;
}

export class Participant implements ParticipantInterface {
  readonly id: string;
  readonly joinedAt: Date;
  readonly displayName?: string;
  readonly device?: string;

  constructor(props: ParticipantInterface) {
    this.id = props.id;
    this.joinedAt = props.joinedAt;
    this.displayName = props.displayName;
    this.device = props.device;
  }

  static create(
    id: string,
    displayName?: string,
    device?: string,
  ): Participant {
    return new Participant({
      id,
      joinedAt: new Date(),
      displayName,
      device,
    });
  }
}
