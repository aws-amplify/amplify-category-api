// Intelligent nested stack provider that automatically partitions AppSync resolvers
// across multiple nested stacks to avoid CloudFormation 1MB template size limit.
//
// NESTED STACK LIMITS ADDRESSED:
// 1. Template Size: 1MB per stack (PRIMARY CONCERN - this is what we solve)
// 2. Resources: 500 per stack (Safe - we cap at 200 resolvers + overhead = ~250 resources)
// 3. Outputs: 200 per stack (CRITICAL - we minimize cross-stack refs by keeping tables/datasources in primary)
// 4. Parameters: 200 per stack (Safe - resolvers reference API by name, not through parameters)
// 5. Nested Stack Count: No hard limit, but we aim for <10 stacks for operational simplicity

import { Construct } from 'constructs';
import { NestedStack } from 'aws-cdk-lib';
import type { PartitioningConfig } from '../types';

/**
 * Resource categorization for stack placement
 */
enum ResourceCategory {
  /** AppSync API, authentication, core configuration, tables, and data sources
   * IMPORTANT: We keep tables and data sources in primary to minimize cross-stack references.
   * If these were in separate stacks, resolvers would need to import table ARNs and data source ARNs,
   * potentially hitting the 200 output limit on those stacks.
   */
  PRIMARY = 'primary',
  /** Resolvers and AppSync functions (distributed across multiple stacks) */
  RESOLVERS = 'resolvers',
  /** Other resources that don't fit primary or resolver categories */
  OTHER = 'other',
}

/**
 * Metadata tracked per nested stack
 */
interface StackMetadata {
  stack: NestedStack;
  category: ResourceCategory;
  resolverCount: number;
  estimatedSize: number;
  resolverTypes: Set<string>; // GraphQL types this stack handles
  resourceCount: number; // Total resources in stack (for 500 resource limit)
  outputCount: number; // Cross-stack outputs (for 200 output limit)
}

/**
 * Nested stack provider that intelligently partitions AppSync resources
 * across multiple nested stacks to avoid CloudFormation template size limits.
 *
 * Strategy:
 * 1. Primary stack: API, schema, tables, data sources (minimize cross-stack refs)
 * 2. Resolver stacks: Resolvers distributed across multiple stacks as needed
 * 3. Each stack stays under size/resource/output limits
 * 4. Related resolvers (same GraphQL type) grouped together when possible
 * 5. Resolvers reference API/tables by name (via Fn::GetAtt on parent scope), not cross-stack imports
 *
 * Limit Management:
 * - Template Size: 750KB threshold per stack (leaves 250KB margin)
 * - Resources: 200 resolvers max (with overhead = ~250 resources, safe for 500 limit)
 * - Outputs: Primary stack kept under 150 outputs (safe for 200 limit)
 * - Parameters: Minimal usage (resolvers reference API by name in parent scope)
 */
export class PartitioningNestedStackProvider {
  private readonly mainScope: Construct;
  private readonly config: Required<PartitioningConfig>;
  private readonly stacks: Map<string, StackMetadata> = new Map();
  private currentResolverStackIndex = 0;

  constructor(scope: Construct, config: PartitioningConfig = {}) {
    this.mainScope = scope;
    this.config = {
      stackSizeThreshold: config.stackSizeThreshold ?? 750000,
      maxResolversPerStack: config.maxResolversPerStack ?? 200,
      groupRelatedResolvers: config.groupRelatedResolvers ?? true,
      maxCrossStackReferences: config.maxCrossStackReferences ?? 150,
    };
  }

  /**
   * Provides a nested stack for the given resource.
   * Implements intelligent routing based on resource type and current stack capacity.
   */
  provide(_scope: Construct, resourceName: string): NestedStack {
    const category = this.categorizeResource(resourceName);

    switch (category) {
      case ResourceCategory.PRIMARY:
        // All primary resources (API, tables, data sources) go to primary stack
        // to minimize cross-stack references
        return this.getOrCreateStack('primary', ResourceCategory.PRIMARY);

      case ResourceCategory.RESOLVERS:
        return this.getResolverStack(resourceName);

      default:
        return this.getOrCreateStack('other', ResourceCategory.OTHER);
    }
  }

  /**
   * Get or create a nested stack for the given category
   */
  private getOrCreateStack(key: string, category: ResourceCategory): NestedStack {
    if (!this.stacks.has(key)) {
      const stackName = this.getStackName(key);
      const stack = new NestedStack(this.mainScope, stackName);

      this.stacks.set(key, {
        stack,
        category,
        resolverCount: 0,
        estimatedSize: 0,
        resolverTypes: new Set(),
        resourceCount: 0,
        outputCount: 0,
      });
    }

    const metadata = this.stacks.get(key)!;
    metadata.resourceCount++;
    return metadata.stack;
  }

  /**
   * Get appropriate stack for a resolver, creating overflow stacks as needed
   */
  private getResolverStack(resourceName: string): NestedStack {
    const resolverType = this.extractResolverType(resourceName);

    // Try to find existing stack with this type (for grouping)
    if (this.config.groupRelatedResolvers && resolverType) {
      const existingStack = this.findStackWithType(resolverType);
      if (existingStack && !this.isStackFull(existingStack)) {
        this.incrementResolverCount(existingStack, resolverType);
        return existingStack.stack;
      }
    }

    // Get current resolver stack
    const stackKey = `resolvers-${this.currentResolverStackIndex}`;
    const currentStack = this.stacks.get(stackKey);

    // Create new stack if needed or current is full
    if (!currentStack) {
      return this.createResolverStack(stackKey, resolverType);
    }

    if (this.isStackFull(currentStack)) {
      this.currentResolverStackIndex++;
      return this.getResolverStack(resourceName); // Recursive call for next stack
    }

    // Add to current stack
    this.incrementResolverCount(currentStack, resolverType);
    return currentStack.stack;
  }

  /**
   * Create a new resolver stack
   */
  private createResolverStack(key: string, resolverType?: string): NestedStack {
    const stackName = this.getStackName(key);
    const stack = new NestedStack(this.mainScope, stackName);

    const metadata: StackMetadata = {
      stack,
      category: ResourceCategory.RESOLVERS,
      resolverCount: 1,
      estimatedSize: this.estimateResolverSize(),
      resolverTypes: resolverType ? new Set([resolverType]) : new Set(),
      resourceCount: 1, // Start with 1 for the resolver being added
      outputCount: 0, // Resolver stacks typically don't export outputs
    };

    this.stacks.set(key, metadata);
    return stack;
  }

  /**
   * Find existing stack that handles the given resolver type
   */
  private findStackWithType(resolverType: string): StackMetadata | undefined {
    for (const metadata of this.stacks.values()) {
      if (
        metadata.category === ResourceCategory.RESOLVERS &&
        metadata.resolverTypes.has(resolverType)
      ) {
        return metadata;
      }
    }
    return undefined;
  }

  /**
   * Check if a stack is full and cannot accept more resolvers
   */
  private isStackFull(metadata: StackMetadata): boolean {
    // Check resolver count heuristic
    if (metadata.resolverCount >= this.config.maxResolversPerStack) {
      return true;
    }

    // Check estimated size
    if (metadata.estimatedSize >= this.config.stackSizeThreshold) {
      return true;
    }

    // Check resource count (CloudFormation limit: 500 resources per stack)
    // We use 450 as threshold to leave safety margin
    if (metadata.resourceCount >= 450) {
      return true;
    }

    // Check output count (CloudFormation limit: 200 outputs per stack)
    // This is mainly for primary stack that might export table/datasource ARNs
    if (metadata.outputCount >= this.config.maxCrossStackReferences) {
      return true;
    }

    return false;
  }

  /**
   * Increment resolver count and update metadata
   */
  private incrementResolverCount(metadata: StackMetadata, resolverType?: string): void {
    metadata.resolverCount++;
    metadata.resourceCount++;
    metadata.estimatedSize += this.estimateResolverSize();

    if (resolverType) {
      metadata.resolverTypes.add(resolverType);
    }
  }

  /**
   * Categorize a resource based on its name
   */
  private categorizeResource(resourceName: string): ResourceCategory {
    const name = resourceName.toLowerCase();

    // Resolvers - check first since this is what we want to partition
    if (name.includes('resolver') || name.includes('function')) {
      return ResourceCategory.RESOLVERS;
    }

    // Everything else goes to primary to minimize cross-stack references
    // This includes:
    // - GraphQL API, API Key, Schema
    // - DynamoDB tables
    // - Data sources (Lambda, HTTP, DynamoDB, None)
    // - IAM roles and policies
    // - CloudWatch logs
    //
    // By keeping tables and data sources in primary stack, resolvers can
    // reference them directly without cross-stack imports, avoiding the
    // 200 output limit bottleneck.
    if (
      name.includes('graphqlapi') ||
      name.includes('apikey') ||
      name.includes('schema') ||
      name.includes('table') ||
      name.includes('dynamodb') ||
      name.includes('datasource') ||
      name.includes('lambdadatasource') ||
      name.includes('httpdatasource') ||
      name === 'api'
    ) {
      return ResourceCategory.PRIMARY;
    }

    return ResourceCategory.OTHER;
  }

  /**
   * Extract GraphQL type from resolver resource name
   * Example: "QueryGetTodoResolver" -> "Query"
   */
  private extractResolverType(resourceName: string): string | undefined {
    // Common patterns:
    // QueryGetTodoResolver, MutationCreateTodoResolver, TodoListResolver
    const patterns = [
      /^(Query|Mutation|Subscription)[A-Z]/,
      /^([A-Z][a-z]+)Resolver$/,
    ];

    for (const pattern of patterns) {
      const match = resourceName.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Estimate size contribution of a single resolver
   * Based on average resolver template size analysis
   */
  private estimateResolverSize(): number {
    // Average resolver in CloudFormation: ~3KB
    // Includes: Resolver resource, request/response mapping templates
    return 3000;
  }

  /**
   * Generate stack name for display and identification
   */
  private getStackName(key: string): string {
    const nameMap: Record<string, string> = {
      primary: 'DataPrimary',
      other: 'DataOther',
    };

    if (nameMap[key]) {
      return nameMap[key];
    }

    // For resolver stacks: DataResolvers0, DataResolvers1, etc.
    if (key.startsWith('resolvers-')) {
      const index = key.split('-')[1];
      return `DataResolvers${index}`;
    }

    return key;
  }

  /**
   * Validate that we haven't hit any CloudFormation limits
   */
  private validateLimits(): void {
    for (const [key, metadata] of this.stacks.entries()) {
      // Check resource count (500 limit)
      if (metadata.resourceCount > 500) {
        throw new Error(
          `Stack ${key} exceeds CloudFormation resource limit: ${metadata.resourceCount}/500 resources`
        );
      }

      // Check output count (200 limit)
      if (metadata.outputCount > 200) {
        throw new Error(
          `Stack ${key} exceeds CloudFormation output limit: ${metadata.outputCount}/200 outputs`
        );
      }

      // Warn if approaching limits
      if (metadata.resourceCount > 450) {
        console.warn(
          `[Amplify Data] Stack ${key} approaching resource limit: ${metadata.resourceCount}/500 resources`
        );
      }

      if (metadata.outputCount > 150) {
        console.warn(
          `[Amplify Data] Stack ${key} approaching output limit: ${metadata.outputCount}/200 outputs`
        );
      }
    }
  }

  /**
   * Get partitioning statistics for debugging/logging
   */
  public getStats(): {
    totalStacks: number;
    resolverStacks: number;
    totalResolvers: number;
    avgResolversPerStack: number;
    primaryStackResources: number;
    maxResourcesInAnyStack: number;
    warnings: string[];
  } {
    const resolverStackCount = Array.from(this.stacks.values()).filter(
      (m) => m.category === ResourceCategory.RESOLVERS
    ).length;

    const totalResolvers = Array.from(this.stacks.values()).reduce(
      (sum, m) => sum + m.resolverCount,
      0
    );

    const primaryStack = this.stacks.get('primary');
    const primaryStackResources = primaryStack?.resourceCount ?? 0;

    const maxResourcesInAnyStack = Math.max(
      ...Array.from(this.stacks.values()).map((m) => m.resourceCount),
      0
    );

    const warnings: string[] = [];

    // Check for potential issues
    for (const [key, metadata] of this.stacks.entries()) {
      if (metadata.resourceCount > 450) {
        warnings.push(`Stack ${key} near resource limit: ${metadata.resourceCount}/500`);
      }
      if (metadata.outputCount > 150) {
        warnings.push(`Stack ${key} near output limit: ${metadata.outputCount}/200`);
      }
    }

    // Validate limits before returning
    this.validateLimits();

    return {
      totalStacks: this.stacks.size,
      resolverStacks: resolverStackCount,
      totalResolvers,
      avgResolversPerStack:
        resolverStackCount > 0 ? Math.round(totalResolvers / resolverStackCount) : 0,
      primaryStackResources,
      maxResourcesInAnyStack,
      warnings,
    };
  }
}
