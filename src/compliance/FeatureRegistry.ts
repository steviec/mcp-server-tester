/**
 * Registry for managing protocol features and their tests
 */

import type { ProtocolFeature, ProtocolCategory, ProtocolFeatureInfo } from './types.js';
import type { McpCapability } from './CapabilityDetector.js';

export class FeatureRegistry {
  private static features = new Map<ProtocolFeature, ProtocolFeatureInfo>();

  /**
   * Register a protocol feature with its tests
   */
  static registerFeature(info: ProtocolFeatureInfo): void {
    this.features.set(info.feature, info);
  }

  /**
   * Get information about a specific feature
   */
  static getFeature(feature: ProtocolFeature): ProtocolFeatureInfo | undefined {
    return this.features.get(feature);
  }

  /**
   * Get all registered features
   */
  static getAllFeatures(): ProtocolFeatureInfo[] {
    return Array.from(this.features.values());
  }

  /**
   * Get features by category
   */
  static getFeaturesByCategory(category: ProtocolCategory): ProtocolFeatureInfo[] {
    return Array.from(this.features.values()).filter(f => f.category === category);
  }

  /**
   * Get features that should run based on server capabilities
   */
  static getApplicableFeatures(serverCapabilities: Set<McpCapability>): ProtocolFeatureInfo[] {
    return Array.from(this.features.values()).filter(
      f => !f.requiredCapability || serverCapabilities.has(f.requiredCapability)
    );
  }

  /**
   * Get features that are skipped due to missing capabilities
   */
  static getSkippedFeatures(serverCapabilities: Set<McpCapability>): ProtocolFeatureInfo[] {
    return Array.from(this.features.values()).filter(
      f => f.requiredCapability && !serverCapabilities.has(f.requiredCapability)
    );
  }

  /**
   * Group features by category for organized display
   */
  static getFeaturesByCategories(): Map<ProtocolCategory, ProtocolFeatureInfo[]> {
    const grouped = new Map<ProtocolCategory, ProtocolFeatureInfo[]>();

    // Initialize all categories
    const categories: ProtocolCategory[] = [
      'base-protocol',
      'lifecycle',
      'server-features',
      'utilities',
    ];
    categories.forEach(cat => grouped.set(cat, []));

    // Group features
    for (const feature of this.features.values()) {
      const categoryFeatures = grouped.get(feature.category)!;
      categoryFeatures.push(feature);
    }

    return grouped;
  }

  /**
   * Clear all registered features (useful for testing)
   */
  static clear(): void {
    this.features.clear();
  }
}

export function registerProtocolFeature(info: ProtocolFeatureInfo): void {
  FeatureRegistry.registerFeature(info);
}
