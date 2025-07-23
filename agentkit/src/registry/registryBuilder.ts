import { z } from "zod";
import { ActionProvider, Action } from "../action-providers/actionProvider";
import { WalletProvider } from "../wallet-providers";
import { Network } from "../network";
import { 
  ActionRegistry, 
  RegistryActionProvider, 
  RegistryAction, 
  ActionParameter,
  RegistryConfig,
  PROVIDER_CATEGORIES,
  ACTION_CATEGORIES,
  ProviderCategory,
  ActionCategory
} from "./types";
import { StoredActionMetadata, ACTION_DECORATOR_KEY } from "../action-providers/actionDecorator";

/**
 * RegistryBuilder scans ActionProviders and builds a comprehensive registry
 */
export class RegistryBuilder {
  private config: RegistryConfig;
  private registry: ActionRegistry;

  constructor(config: RegistryConfig = {}) {
    this.config = config;
    this.registry = {
      providers: new Map(),
      actions: new Map(),
      metadata: {
        providerCount: 0,
        actionCount: 0,
        buildTime: new Date(),
        version: config.version || "1.0.0"
      }
    };
  }

  /**
   * Build registry from a list of ActionProvider instances
   */
  async buildFromProviders(
    providers: ActionProvider[], 
    walletProvider?: WalletProvider
  ): Promise<ActionRegistry> {
    for (const provider of providers) {
      await this.addProvider(provider, walletProvider);
    }

    this.updateRegistryMetadata();
    return this.registry;
  }

  /**
   * Add a single ActionProvider to the registry
   */
  private async addProvider(
    provider: ActionProvider, 
    walletProvider?: WalletProvider
  ): Promise<void> {
    const providerId = this.generateProviderId(provider);
    
    // Check if provider already exists
    if (this.registry.providers.has(providerId)) {
      console.warn(`Provider ${providerId} already exists in registry, skipping`);
      return;
    }

    const registryProvider = this.createRegistryProvider(provider, providerId);
    this.registry.providers.set(providerId, registryProvider);

    // Extract and add actions
    await this.addActionsFromProvider(provider, providerId, walletProvider);
  }

  /**
   * Create RegistryActionProvider from ActionProvider
   */
  private createRegistryProvider(
    provider: ActionProvider, 
    providerId: string
  ): RegistryActionProvider {
    const category = this.getProviderCategory(provider.name);
    const supportedNetworks = this.getSupportedNetworks(provider);
    const requiresWallet = this.checkProviderRequiresWallet(provider);

    return {
      id: providerId,
      name: provider.name,
      description: this.getProviderDescription(provider.name),
      category,
      supportedNetworks,
      requiresWallet,
      provider,
      metadata: {
        tags: this.getProviderTags(provider.name),
        documentationUrl: this.getProviderDocumentationUrl(provider.name),
        version: "1.0.0",
        lastUpdated: new Date()
      }
    };
  }

  /**
   * Extract actions from a provider and add to registry
   */
  private async addActionsFromProvider(
    provider: ActionProvider,
    providerId: string,
    walletProvider?: WalletProvider
  ): Promise<void> {
    try {
      // Get actions using the provider's getActions method
      const actions = walletProvider 
        ? provider.getActions(walletProvider)
        : this.getActionsWithoutWallet(provider);

      for (const action of actions) {
        const actionId = this.generateActionId(providerId, action.name);
        const registryAction = this.createRegistryAction(action, actionId, providerId, provider);
        this.registry.actions.set(actionId, registryAction);
      }
    } catch (error) {
      console.warn(`Failed to extract actions from provider ${providerId}:`, error);
    }
  }

  /**
   * Get actions from provider without wallet (for registry purposes)
   */
  private getActionsWithoutWallet(provider: ActionProvider): Action[] {
    const actions: Action[] = [];

    // Use reflection to get action metadata directly
    const actionsMetadataMap: StoredActionMetadata | undefined = Reflect.getMetadata(
      ACTION_DECORATOR_KEY,
      provider.constructor,
    );

    if (!actionsMetadataMap) {
      return actions;
    }

    for (const actionMetadata of actionsMetadataMap.values()) {
      actions.push({
        name: actionMetadata.name,
        description: actionMetadata.description,
        schema: actionMetadata.schema,
        invoke: actionMetadata.invoke
      });
    }

    return actions;
  }

  /**
   * Create RegistryAction from Action
   */
  private createRegistryAction(
    action: Action,
    actionId: string,
    providerId: string,
    provider: ActionProvider
  ): RegistryAction {
    const category = this.getActionCategory(action.name);
    const parameters = this.extractParameters(action.schema);
    const requiresWallet = this.checkActionRequiresWallet(action.name, provider);
    const supportedNetworks = this.getSupportedNetworks(provider);

    return {
      id: actionId,
      name: action.name,
      description: action.description,
      category,
      providerId,
      providerName: provider.name,
      schema: action.schema,
      parameters,
      requiresWallet,
      supportedNetworks,
      invoke: action.invoke,
      metadata: {
        tags: this.getActionTags(action.name),
        examples: this.getActionExamples(action.name),
        performance: {
          avgExecutionTime: this.getActionExecutionTime(action.name),
          isExpensive: this.isActionExpensive(action.name)
        },
        lastUpdated: new Date()
      }
    };
  }

  /**
   * Extract parameter information from Zod schema
   */
  private extractParameters(schema: z.ZodSchema): ActionParameter[] {
    const parameters: ActionParameter[] = [];

    try {
      // Handle different Zod schema types
      if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        for (const [key, fieldSchema] of Object.entries(shape)) {
          parameters.push(this.extractParameter(key, fieldSchema as z.ZodSchema));
        }
      }
    } catch (error) {
      console.warn("Failed to extract parameters from schema:", error);
    }

    return parameters;
  }

  /**
   * Extract single parameter from Zod field schema
   */
  private extractParameter(name: string, schema: z.ZodSchema): ActionParameter {
    const parameter: ActionParameter = {
      name,
      type: this.getZodTypeName(schema),
      required: !schema.isOptional(),
    };

    // Extract additional information based on schema type
    if (schema instanceof z.ZodEnum) {
      parameter.enumValues = schema.options;
    } else if (schema instanceof z.ZodDefault) {
      parameter.defaultValue = schema._def.defaultValue();
      parameter.required = false;
    } else if (schema instanceof z.ZodOptional) {
      parameter.required = false;
      parameter.type = this.getZodTypeName(schema._def.innerType);
    }

    return parameter;
  }

  /**
   * Get human-readable type name from Zod schema
   */
  private getZodTypeName(schema: z.ZodSchema): string {
    if (schema instanceof z.ZodString) return "string";
    if (schema instanceof z.ZodNumber) return "number";
    if (schema instanceof z.ZodBoolean) return "boolean";
    if (schema instanceof z.ZodArray) return "array";
    if (schema instanceof z.ZodObject) return "object";
    if (schema instanceof z.ZodEnum) return "enum";
    if (schema instanceof z.ZodOptional) return this.getZodTypeName(schema._def.innerType);
    if (schema instanceof z.ZodDefault) return this.getZodTypeName(schema._def.innerType);
    return "unknown";
  }

  /**
   * Generate unique provider ID
   */
  private generateProviderId(provider: ActionProvider): string {
    return `provider_${provider.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(providerId: string, actionName: string): string {
    const cleanActionName = actionName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `${providerId}_${cleanActionName}`;
  }

  /**
   * Get provider category with fallback
   */
  private getProviderCategory(providerName: string): ProviderCategory {
    // Check custom mappings first
    const customMapping = this.config.providerCategoryMappings?.[providerName];
    if (customMapping) return customMapping;

    // Auto-detect based on provider name
    const lowerName = providerName.toLowerCase();
    if (lowerName.includes('jupiter') || lowerName.includes('swap')) return PROVIDER_CATEGORIES.DEX;
    if (lowerName.includes('compound') || lowerName.includes('lend')) return PROVIDER_CATEGORIES.LENDING;
    if (lowerName.includes('stake')) return PROVIDER_CATEGORIES.STAKING;
    if (lowerName.includes('defillama') || lowerName.includes('price')) return PROVIDER_CATEGORIES.DATA;
    if (lowerName.includes('wallet')) return PROVIDER_CATEGORIES.WALLET;
    if (lowerName.includes('nft') || lowerName.includes('opensea')) return PROVIDER_CATEGORIES.NFT;
    if (lowerName.includes('bridge')) return PROVIDER_CATEGORIES.BRIDGE;
    if (lowerName.includes('social') || lowerName.includes('farcaster')) return PROVIDER_CATEGORIES.SOCIAL;

    return PROVIDER_CATEGORIES.UTILITY; // Default fallback
  }

  /**
   * Get action category with fallback
   */
  private getActionCategory(actionName: string): ActionCategory {
    // Check custom mappings first
    const customMapping = this.config.actionCategoryMappings?.[actionName];
    if (customMapping) return customMapping;

    // Auto-detect based on action name
    const lowerName = actionName.toLowerCase();
    if (lowerName.includes('swap')) return ACTION_CATEGORIES.SWAP;
    if (lowerName.includes('trade')) return ACTION_CATEGORIES.TRADE;
    if (lowerName.includes('lend')) return ACTION_CATEGORIES.LEND;
    if (lowerName.includes('borrow')) return ACTION_CATEGORIES.BORROW;
    if (lowerName.includes('stake')) return ACTION_CATEGORIES.STAKE;
    if (lowerName.includes('unstake')) return ACTION_CATEGORIES.UNSTAKE;
    if (lowerName.includes('transfer') || lowerName.includes('send')) return ACTION_CATEGORIES.TRANSFER;
    if (lowerName.includes('approve')) return ACTION_CATEGORIES.APPROVE;
    if (lowerName.includes('price') || lowerName.includes('get_token')) return ACTION_CATEGORIES.PRICE;
    if (lowerName.includes('balance')) return ACTION_CATEGORIES.BALANCE;
    if (lowerName.includes('history')) return ACTION_CATEGORIES.HISTORY;
    if (lowerName.includes('mint')) return ACTION_CATEGORIES.MINT;
    if (lowerName.includes('burn')) return ACTION_CATEGORIES.BURN;
    if (lowerName.includes('bridge')) return ACTION_CATEGORIES.BRIDGE_TRANSFER;
    if (lowerName.includes('post') || lowerName.includes('social')) return ACTION_CATEGORIES.SOCIAL_POST;

    return ACTION_CATEGORIES.QUERY; // Default fallback
  }

  /**
   * Get provider description
   */
  private getProviderDescription(providerName: string): string {
    return this.config.providerDescriptions?.[providerName] 
      || `${providerName} action provider for blockchain interactions`;
  }

  /**
   * Get provider tags
   */
  private getProviderTags(providerName: string): string[] {
    return this.config.providerTags?.[providerName] || [providerName.toLowerCase()];
  }

  /**
   * Get action tags
   */
  private getActionTags(actionName: string): string[] {
    return this.config.actionTags?.[actionName] || [];
  }

  /**
   * Get supported networks for provider
   */
  private getSupportedNetworks(provider: ActionProvider): Network[] {
    // This would need to be enhanced based on actual network detection logic
    // For now, return empty array - this could be expanded to test multiple networks
    return [];
  }

  /**
   * Check if provider requires wallet
   */
  private checkProviderRequiresWallet(provider: ActionProvider): boolean {
    // Check if any actions in the provider require wallet
    try {
      const actionsMetadataMap: StoredActionMetadata | undefined = Reflect.getMetadata(
        ACTION_DECORATOR_KEY,
        provider.constructor,
      );

      if (!actionsMetadataMap) return false;

      for (const actionMetadata of actionsMetadataMap.values()) {
        if (actionMetadata.walletProvider) return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if specific action requires wallet
   */
  private checkActionRequiresWallet(actionName: string, provider: ActionProvider): boolean {
    try {
      const actionsMetadataMap: StoredActionMetadata | undefined = Reflect.getMetadata(
        ACTION_DECORATOR_KEY,
        provider.constructor,
      );

      if (!actionsMetadataMap) return false;

      for (const actionMetadata of actionsMetadataMap.values()) {
        if (actionMetadata.name === actionName) {
          return actionMetadata.walletProvider;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get provider documentation URL
   */
  private getProviderDocumentationUrl(providerName: string): string | undefined {
    // This could be expanded with a mapping of provider names to docs
    return undefined;
  }

  /**
   * Get action examples
   */
  private getActionExamples(actionName: string): string[] | undefined {
    // This could be expanded with predefined examples
    return undefined;
  }

  /**
   * Get action execution time estimate
   */
  private getActionExecutionTime(actionName: string): number | undefined {
    // This could be expanded with performance data
    return undefined;
  }

  /**
   * Check if action is expensive
   */
  private isActionExpensive(actionName: string): boolean {
    const lowerName = actionName.toLowerCase();
    return lowerName.includes('swap') || lowerName.includes('trade') || lowerName.includes('bridge');
  }

  /**
   * Update registry metadata
   */
  private updateRegistryMetadata(): void {
    this.registry.metadata.providerCount = this.registry.providers.size;
    this.registry.metadata.actionCount = this.registry.actions.size;
    this.registry.metadata.buildTime = new Date();
  }

  /**
   * Get current registry
   */
  getRegistry(): ActionRegistry {
    return this.registry;
  }
}