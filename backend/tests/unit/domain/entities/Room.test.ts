import { Participant } from '../../../../src/domain/entities/Participant';
import { Room } from '../../../../src/domain/entities/Room';

describe('Room Entity', () => {
  describe('Room.create', () => {
    it('should create a room with valid properties', () => {
      const roomId = 'test-room-123';
      const room = Room.create(roomId);

      expect(room.id).toBe(roomId);
      expect(room.createdAt).toBeInstanceOf(Date);
      expect(room.participants).toEqual([]);
      expect(room.participantCount).toBe(0);
      expect(room.isEmpty()).toBe(true);
      expect(room.routerId).toBeUndefined();
    });

    it('should create room with current timestamp', () => {
      const beforeCreation = new Date();
      const room = Room.create('test-room');
      const afterCreation = new Date();

      expect(room.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(room.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
    });
  });

  describe('Participant Management', () => {
    let room: Room;
    let participant: Participant;

    beforeEach(() => {
      room = Room.create('test-room');
      participant = Participant.create('user123', 'John Doe');
    });

    it('should add participant successfully', () => {
      room.addParticipant('user123', participant);

      expect(room.participants).toContain('user123');
      expect(room.participantCount).toBe(1);
      expect(room.isEmpty()).toBe(false);
      expect(room.hasParticipant('user123')).toBe(true);
    });

    it('should add multiple participants', () => {
      const participant2 = Participant.create('user456', 'Jane Doe');

      room.addParticipant('user123', participant);
      room.addParticipant('user456', participant2);

      expect(room.participants).toEqual(['user123', 'user456']);
      expect(room.participantCount).toBe(2);
      expect(room.hasParticipant('user123')).toBe(true);
      expect(room.hasParticipant('user456')).toBe(true);
    });

    it('should remove participant successfully', () => {
      room.addParticipant('user123', participant);
      room.removeParticipant('user123');

      expect(room.participants).not.toContain('user123');
      expect(room.participantCount).toBe(0);
      expect(room.isEmpty()).toBe(true);
      expect(room.hasParticipant('user123')).toBe(false);
    });

    it('should handle removing non-existent participant gracefully', () => {
      expect(() => room.removeParticipant('non-existent')).not.toThrow();
      expect(room.participantCount).toBe(0);
    });

    it('should not add duplicate participants', () => {
      room.addParticipant('user123', participant);
      room.addParticipant('user123', participant); // Duplicate

      expect(room.participantCount).toBe(1);
      expect(room.participants.filter((id) => id === 'user123')).toHaveLength(
        1,
      );
    });
  });

  describe('Router Management', () => {
    it('should set and get router ID', () => {
      const room = Room.create('test-room');
      const routerId = 'router-123';

      room.routerId = routerId;
      expect(room.routerId).toBe(routerId);
    });

    it('should allow undefined router ID', () => {
      const room = Room.create('test-room');

      room.routerId = undefined;
      expect(room.routerId).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize room correctly', () => {
      const room = Room.create('test-room');
      const participant = Participant.create('user123');
      room.addParticipant('user123', participant);
      room.routerId = 'router-123';

      const json = room.toJSON();

      expect(json).toEqual({
        id: 'test-room',
        createdAt: room.createdAt,
        routerId: 'router-123',
        participants: ['user123'],
        participantCount: 1,
      });
    });

    it('should serialize empty room correctly', () => {
      const room = Room.create('empty-room');

      const json = room.toJSON();

      expect(json).toEqual({
        id: 'empty-room',
        createdAt: room.createdAt,
        routerId: undefined,
        participants: [],
        participantCount: 0,
      });
    });
  });

  describe('Business Logic', () => {
    it('should correctly identify empty room', () => {
      const room = Room.create('test-room');
      expect(room.isEmpty()).toBe(true);

      const participant = Participant.create('user123');
      room.addParticipant('user123', participant);
      expect(room.isEmpty()).toBe(false);

      room.removeParticipant('user123');
      expect(room.isEmpty()).toBe(true);
    });

    it('should maintain participant count correctly', () => {
      const room = Room.create('test-room');
      expect(room.participantCount).toBe(0);

      // Add participants
      for (let i = 1; i <= 5; i++) {
        const participant = Participant.create(`user${i}`);
        room.addParticipant(`user${i}`, participant);
        expect(room.participantCount).toBe(i);
      }

      // Remove participants
      for (let i = 5; i >= 1; i--) {
        room.removeParticipant(`user${i}`);
        expect(room.participantCount).toBe(i - 1);
      }
    });
  });
});
