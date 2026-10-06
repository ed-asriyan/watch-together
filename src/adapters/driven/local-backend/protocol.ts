import type { RemoteRoomState } from '../../../domains/watch-session/model/room-replica';
import type { RoomMutation } from '../memory/room-store';

/**
 * The wire protocol between the browser and the local backend
 * (`backend/local/server.ts`). JSON text frames over one WebSocket.
 *
 * Shared by both ends so they cannot disagree about a message shape. The room
 * mutations themselves are the in-memory gateway's `RoomMutation`: the backend
 * applies them to the same `RoomStore`, so "what a write means" has exactly
 * one definition in the codebase.
 *
 * Every client message carries a `req` number and is answered by exactly one
 * `ack` with the same number. Room traffic is pushed as `mutation` frames to
 * every connection subscribed to the room — the sender's own included, and
 * always BEFORE the sender's `ack`. Over one ordered socket that means a
 * client has seen the effect of its own write by the time the write resolves,
 * the same guarantee Firebase gives with local events.
 */
export type ClientMessage =
    | { readonly t: 'open'; readonly req: number; readonly room: string; readonly self: string }
    | { readonly t: 'close'; readonly req: number; readonly room: string; readonly self: string }
    | { readonly t: 'arm'; readonly req: number; readonly room: string; readonly self: string }
    | {
        readonly t: 'mutate';
        readonly req: number;
        readonly room: string;
        readonly self: string;
        readonly mutation: RoomMutation;
    }
    | { readonly t: 'time'; readonly req: number };

export type ServerMessage =
    | {
        readonly t: 'ack';
        readonly req: number;
        readonly error?: string;
        /** Present on the answer to `open`. */
        readonly snapshot?: RemoteRoomState;
        /** Present on the answer to `time`: the server's clock, epoch ms. */
        readonly serverTime?: number;
    }
    | { readonly t: 'mutation'; readonly room: string; readonly mutation: RoomMutation };

/** Default port of `npm run backend:local`. */
export const LOCAL_BACKEND_DEFAULT_PORT = 8787;
