/**
 * Outbound (driven) ports: interfaces the application CALLS and adapters
 * IMPLEMENT.
 *
 * Nothing here mentions Firebase, Vidstack, WebTorrent, `localStorage` or
 * Sentry. Each is one adapter's contract, and the ones that matter
 * (`RoomGatewayPort`, `MediaPlayerPort`, `ClockPort`) have a shared contract
 * test suite every implementation must pass.
 */

export type { RoomGatewayPort, RoomSession } from './room-gateway';
export type { MediaPlayerPort } from './media-player';
export type { MediaResolverPort, ResolvedMedia, DeliveryStats } from './media-resolver';
export type { ClockPort } from './clock';
export type { SchedulerPort } from './scheduler';
export type { ProfileStorePort, StoredProfile } from './profile-store';
export type { IdGeneratorPort } from './id-generator';
export type { TelemetryPort, TelemetryContext } from './telemetry';
export type { ErrorReporterPort } from './error-reporter';
export type { LocationPort } from './location';
