/**
 * Register all protocol features
 */

import { registerProtocolFeature } from '../FeatureRegistry.js';

// Base Protocol features
import { TransportFeature } from './base-protocol/TransportFeature.js';
import { JsonRpcFeature } from './base-protocol/JsonRpcFeature.js';

// Lifecycle features
import { InitializationFeature } from './lifecycle/InitializationFeature.js';
import { CapabilitiesFeature } from './lifecycle/CapabilitiesFeature.js';
import { VersionFeature } from './lifecycle/VersionFeature.js';

// Server features
import { ToolsFeature } from './server-features/ToolsFeature.js';
import { ResourcesFeature } from './server-features/ResourcesFeature.js';
import { PromptsFeature } from './server-features/PromptsFeature.js';

// Register all features
export function registerAllFeatures(): void {
  // Base Protocol
  registerProtocolFeature(new TransportFeature());
  registerProtocolFeature(new JsonRpcFeature());

  // Lifecycle
  registerProtocolFeature(new InitializationFeature());
  registerProtocolFeature(new CapabilitiesFeature());
  registerProtocolFeature(new VersionFeature());

  // Server Features
  registerProtocolFeature(new ToolsFeature());
  registerProtocolFeature(new ResourcesFeature());
  registerProtocolFeature(new PromptsFeature());

  // TODO: Add utilities features (ping, progress, cancellation, completion, logging, pagination)
}
