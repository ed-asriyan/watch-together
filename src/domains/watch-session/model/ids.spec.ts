import { describe, expect, it } from 'vitest';
import { NICKNAME_MAX_LENGTH, activityId, colourFor, nickname, participantId, roomId } from './ids';
import { ALICE, BOB } from '../../../../test-support/builders';

describe('roomId', () => {
    it('accepts an ordinary generated id', () => {
        expect(roomId('a1b2c3')).toBe('a1b2c3');
    });

    it('normalises case, because the id comes from a URL people type', () => {
        // Legacy lowercased the hash in App.svelte. Two people typing the same
        // room in different case must land in the same room, not two rooms.
        expect(roomId('AbC123')).toBe('abc123');
    });

    it('rejects what cannot be a room', () => {
        expect(roomId('')).toBeNull();
        expect(roomId('   ')).toBeNull();
        expect(roomId('has spaces')).toBeNull();
        expect(roomId('has/slash')).toBeNull();
    });

    it('rejects an id long enough to be an attack on the store', () => {
        expect(roomId('x'.repeat(500))).toBeNull();
    });
});

describe('nickname', () => {
    it('trims surrounding whitespace', () => {
        expect(nickname('  bob  ')).toBe('bob');
    });

    it('caps at the maximum length', () => {
        expect(nickname('x'.repeat(NICKNAME_MAX_LENGTH + 10))?.length).toBe(NICKNAME_MAX_LENGTH);
    });

    it('rejects a blank name so the caller can pick a random one', () => {
        // Legacy behaviour: an empty rename prompt picks a random name.
        expect(nickname('')).toBeNull();
        expect(nickname('   ')).toBeNull();
    });

    it('keeps a single emoji, which the UI renders large', () => {
        expect(nickname('🐙')).toBe('🐙');
    });
});

describe('participantId / activityId', () => {
    it('accept well-formed ids', () => {
        expect(participantId('123456789')).toBe('123456789');
        expect(activityId('0f8b2c')).toBe('0f8b2c');
    });

    it('reject empty ids', () => {
        expect(participantId('')).toBeNull();
        expect(activityId('')).toBeNull();
    });
});

describe('colourFor', () => {
    it('is deterministic, so every client draws a participant the same colour', () => {
        expect(colourFor(ALICE)).toBe(colourFor(ALICE));
    });

    it('distinguishes participants', () => {
        expect(colourFor(ALICE)).not.toBe(colourFor(BOB));
    });

    it('produces a usable hex colour', () => {
        expect(colourFor(ALICE)).toMatch(/^#[0-9a-f]{6}$/i);
    });
});
