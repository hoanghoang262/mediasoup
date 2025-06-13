import { Participant } from '../../../../src/domain/entities/Participant';

describe('Participant Entity', () => {
  describe('Participant.create', () => {
    it('should create a participant with required properties', () => {
      const participantId = 'user123';
      const participant = Participant.create(participantId);

      expect(participant.id).toBe(participantId);
      expect(participant.joinedAt).toBeInstanceOf(Date);
      expect(participant.displayName).toBeUndefined();
      expect(participant.device).toBeUndefined();
    });

    it('should create participant with display name', () => {
      const participant = Participant.create('user123', 'John Doe');

      expect(participant.id).toBe('user123');
      expect(participant.displayName).toBe('John Doe');
      expect(participant.joinedAt).toBeInstanceOf(Date);
    });

    it('should create participant with display name and device', () => {
      const participant = Participant.create('user123', 'John Doe', 'mobile');

      expect(participant.id).toBe('user123');
      expect(participant.displayName).toBe('John Doe');
      expect(participant.device).toBe('mobile');
      expect(participant.joinedAt).toBeInstanceOf(Date);
    });

    it('should create participant with current timestamp', () => {
      const beforeCreation = new Date();
      const participant = Participant.create('user123');
      const afterCreation = new Date();

      expect(participant.joinedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(participant.joinedAt.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
    });
  });

  describe('Constructor', () => {
    it('should create participant from interface', () => {
      const joinedAt = new Date('2023-01-01T00:00:00Z');
      const participant = new Participant({
        id: 'user456',
        joinedAt,
        displayName: 'Jane Smith',
        device: 'desktop',
      });

      expect(participant.id).toBe('user456');
      expect(participant.joinedAt).toBe(joinedAt);
      expect(participant.displayName).toBe('Jane Smith');
      expect(participant.device).toBe('desktop');
    });

    it('should handle minimal participant data', () => {
      const joinedAt = new Date();
      const participant = new Participant({
        id: 'user789',
        joinedAt,
      });

      expect(participant.id).toBe('user789');
      expect(participant.joinedAt).toBe(joinedAt);
      expect(participant.displayName).toBeUndefined();
      expect(participant.device).toBeUndefined();
    });
  });

  describe('Properties', () => {
    it('should have immutable properties at compile time', () => {
      const participant = Participant.create('user123', 'John Doe', 'mobile');

      // These properties are readonly at compile time
      // At runtime, they're just regular properties but TypeScript prevents modification
      expect(participant.id).toBe('user123');
      expect(participant.displayName).toBe('John Doe');
      expect(participant.device).toBe('mobile');
      expect(participant.joinedAt).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string id', () => {
      const participant = Participant.create('');
      expect(participant.id).toBe('');
    });

    it('should handle empty display name', () => {
      const participant = Participant.create('user123', '');
      expect(participant.displayName).toBe('');
    });

    it('should handle empty device', () => {
      const participant = Participant.create('user123', 'John', '');
      expect(participant.device).toBe('');
    });

    it('should handle special characters in id', () => {
      const specialId = 'user@123#test$%';
      const participant = Participant.create(specialId);
      expect(participant.id).toBe(specialId);
    });

    it('should handle unicode in display name', () => {
      const unicodeName = '用户123 👤 Émilie';
      const participant = Participant.create('user123', unicodeName);
      expect(participant.displayName).toBe(unicodeName);
    });
  });

  describe('Type Safety', () => {
    it('should implement ParticipantInterface', () => {
      const participant = Participant.create('user123', 'John Doe', 'mobile');

      // Should have all required interface properties
      expect(typeof participant.id).toBe('string');
      expect(participant.joinedAt).toBeInstanceOf(Date);
      expect(typeof participant.displayName).toBe('string');
      expect(typeof participant.device).toBe('string');
    });

    it('should work with optional properties', () => {
      const participant = Participant.create('user123');

      expect(typeof participant.id).toBe('string');
      expect(participant.joinedAt).toBeInstanceOf(Date);
      expect(participant.displayName).toBeUndefined();
      expect(participant.device).toBeUndefined();
    });
  });
});
