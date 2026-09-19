import { roomGatewayContract } from '../../../domains/watch-session/ports/outbound/__contracts__/room-gateway.contract';
import { InMemoryRoomGateway } from './room-gateway';
import { T0 } from '../../../../test-support/builders';

// Binding the shared contract to an implementation. The suite itself is
// untouched — that is the point of it being a parameterized function.
roomGatewayContract('in-memory', async () => new InMemoryRoomGateway(() => T0));
