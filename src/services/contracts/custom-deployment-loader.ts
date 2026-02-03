import type { SingletonDeployment } from '@safe-global/safe-deployments'
import type { CustomDeploymentsConfig, CustomChainConfig, CustomContractDeployment } from '@/config/custom-deployments.types'

/**
 * Custom deployment loader for Safe contracts
 * Loads custom chain configurations from JSON files or environment variables
 */
class CustomDeploymentLoader {
  private customChains: Map<string, CustomChainConfig> = new Map()
  private loaded = false

  /**
   * Load custom deployments from configuration
   * This runs on the server side during build or SSR
   */
  async load(): Promise<void> {
    if (this.loaded) {
      return
    }

    try {
      // Try to load from environment variable first
      const envConfig = process.env.CUSTOM_CHAINS_CONFIG
      if (envConfig) {
        this.loadFromString(envConfig)
        this.loaded = true
        return
      }

      // Try to load from file (using dynamic import with relative path from project root)
      try {
        const configModule = await import('../../../config/chains/custom-chains.json')
        const config = configModule.default as CustomDeploymentsConfig
        this.loadFromConfig(config)
        this.loaded = true
      } catch (error) {
        // Config file doesn't exist, that's okay - just use defaults from package
        console.debug('No custom chain configuration file found, using package defaults only')
      }
    } catch (error) {
      console.error('Failed to load custom deployments:', error)
      // Don't throw - fail gracefully and use package defaults
    }
  }

  /**
   * Load configuration from a JSON string
   */
  private loadFromString(jsonString: string): void {
    try {
      const config = JSON.parse(jsonString) as CustomDeploymentsConfig
      this.loadFromConfig(config)
    } catch (error) {
      console.error('Failed to parse custom deployments JSON:', error)
    }
  }

  /**
   * Load configuration from a config object
   */
  private loadFromConfig(config: CustomDeploymentsConfig): void {
    if (!config.chains || !Array.isArray(config.chains)) {
      console.warn('Invalid custom deployments config: missing or invalid chains array')
      return
    }

    for (const chain of config.chains) {
      if (!chain.chainId || !chain.contracts) {
        console.warn('Invalid chain config: missing chainId or contracts', chain)
        continue
      }
      this.customChains.set(chain.chainId, chain)
    }

    console.log(`Loaded custom deployments for ${this.customChains.size} chain(s)`)
  }

  /**
   * Get a custom deployment for a specific chain and contract
   * Returns undefined if no custom deployment is configured
   */
  getDeployment(
    chainId: string,
    contractName: string,
    version: string,
  ): SingletonDeployment | undefined {
    const chain = this.customChains.get(chainId)
    if (!chain) {
      return undefined
    }

    // Get the version-specific contracts
    const versionContracts = chain.contracts[version as '1.3.0' | '1.4.1']
    if (!versionContracts) {
      return undefined
    }

    // Map contract names to our internal naming
    const contractKey = this.mapContractName(contractName, version) as keyof typeof versionContracts
    const deployment = versionContracts[contractKey] as CustomContractDeployment | undefined

    if (!deployment) {
      return undefined
    }

    // Convert to SingletonDeployment format
    return {
      defaultAddress: deployment.address,
      released: true,
      contractName: contractName,
      version: version,
      networkAddresses: {
        [chainId]: deployment.address,
      },
      ...(deployment.blockNumber && {
        deployments: {
          [chainId]: {
            address: deployment.address,
            blockNumber: deployment.blockNumber,
          },
        },
      }),
    }
  }

  /**
   * Check if a custom deployment exists for a chain
   */
  hasCustomChain(chainId: string): boolean {
    return this.customChains.has(chainId)
  }

  /**
   * Get all custom chain IDs
   */
  getCustomChainIds(): string[] {
    return Array.from(this.customChains.keys())
  }

  /**
   * Map contract names between different Safe versions
   */
  private mapContractName(contractName: string, version: string): string {
    // For v1.4.1, the names are different
    if (version === '1.4.1') {
      const nameMap: Record<string, string> = {
        'CompatibilityFallbackHandler': 'compatibilityFallbackHandler',
        'CreateCall': 'createCall',
        'Safe': 'safe',
        'SafeL2': 'safeL2',
        'MultiSend': 'multiSend',
        'MultiSendCallOnly': 'multiSendCallOnly',
        'SafeProxyFactory': 'safeProxyFactory',
        'SignMessageLib': 'signMessageLib',
        'SimulateTxAccessor': 'simulateTxAccessor',
      }
      return nameMap[contractName] || contractName.toLowerCase()
    }

    // For v1.3.0
    const nameMap: Record<string, string> = {
      'CompatibilityFallbackHandler': 'compatibilityFallbackHandler',
      'CreateCall': 'createCall',
      'GnosisSafe': 'gnosisSafe',
      'GnosisSafeL2': 'gnosisSafeL2',
      'MultiSend': 'multiSend',
      'MultiSendCallOnly': 'multiSendCallOnly',
      'ProxyFactory': 'proxyFactory',
      'SignMessageLib': 'signMessageLib',
      'SimulateTxAccessor': 'simulateTxAccessor',
    }
    return nameMap[contractName] || contractName.toLowerCase()
  }

  /**
   * Reset the loader (useful for testing)
   */
  reset(): void {
    this.customChains.clear()
    this.loaded = false
  }
}

// Singleton instance
export const customDeploymentLoader = new CustomDeploymentLoader()
