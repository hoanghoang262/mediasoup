import { ParticipantInterface } from './Participant';

export interface RoomInterface {
  id: string;
  participants: Map<string, ParticipantInterface>;
  createdAt: Date;
  routerId?: string;
}

export class Room {
  readonly id: string;
  readonly createdAt: Date;
  private _routerId?: string;
  private _participants: Set<string>;
  private _participantMap: Map<string, ParticipantInterface>;

  constructor(props: RoomInterface) {
    this.id = props.id;
    this.createdAt = props.createdAt;
    this._routerId = props.routerId;
    this._participantMap = props.participants;
    this._participants = new Set<string>(props.participants.keys());
  }

  static create(id: string): Room {
    return new Room({
      id,
      createdAt: new Date(),
      participants: new Map<string, ParticipantInterface>(),
      routerId: undefined,
    });
  }

  get routerId(): string | undefined {
    return this._routerId;
  }

  set routerId(id: string | undefined) {
    this._routerId = id;
  }

  get participants(): string[] {
    return Array.from(this._participants);
  }

  addParticipant(
    participantId: string,
    participant: ParticipantInterface,
  ): void {
    this._participants.add(participantId);
    this._participantMap.set(participantId, participant);
  }

  removeParticipant(participantId: string): void {
    this._participants.delete(participantId);
    this._participantMap.delete(participantId);
  }

  hasParticipant(participantId: string): boolean {
    return this._participants.has(participantId);
  }

  get participantCount(): number {
    return this._participants.size;
  }

  isEmpty(): boolean {
    return this._participants.size === 0;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      createdAt: this.createdAt,
      routerId: this._routerId,
      participants: Array.from(this._participants),
      participantCount: this._participants.size,
    };
  }
}
