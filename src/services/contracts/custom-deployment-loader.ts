import type { SingletonDeployment } from '@safe-global/safe-deployments'
import {
  getSafeSingletonDeployment,
  getSafeL2SingletonDeployment,
  getMultiSendCallOnlyDeployment,
  getFallbackHandlerDeployment,
  getProxyFactoryDeployment,
  getSignMessageLibDeployment,
  getCreateCallDeployment,
} from '@safe-global/safe-deployments'
import type { CustomDeploymentsConfig, CustomChainConfig, CustomContractDeployment } from '@/config/custom-deployments.types'

/**
 * Custom deployment loader for Safe contracts
 * Supports client-side runtime loading with integrity checking
 */
class CustomDeploymentLoader {
  private customChains: Map<string, CustomChainConfig> = new Map()
  private loaded = false
  private loading = false
  private loadPromise: Promise<void> | null = null
  gatewayUrl: string | undefined = undefined

  /**
   * Load custom deployments from configuration
   * In browser: fetches from /config/custom-chains.json endpoint
   * During build: uses environment variable if available
   */
  async load(): Promise<void> {
    if (this.loaded) {
      return
    }

    // If already loading, wait for that promise
    if (this.loading && this.loadPromise) {
      return this.loadPromise
    }

    this.loading = true
    this.loadPromise = this._doLoad()

    try {
      await this.loadPromise
    } finally {
      this.loading = false
    }
  }

  private async _doLoad(): Promise<void> {
    try {
      // Client-side: fetch from runtime endpoint
      if (typeof window !== 'undefined') {
        try {
          // Add timestamp to bust any caching
          const cacheBuster = `?t=${Date.now()}`
          const response = await fetch(`/config/custom-chains.json${cacheBuster}`, {
            cache: 'no-cache',
            headers: {
              'Accept': 'application/json',
            },
          })

          if (!response.ok) {
            throw new Error(`Failed to fetch custom chains config: ${response.status}`)
          }

          const data = await response.json()

          // Verify integrity if hash is provided
          const expectedHash = response.headers.get('X-Config-Hash')
          if (expectedHash) {
            const actualHash = await this.computeHash(JSON.stringify(data))
            if (actualHash !== expectedHash) {
              console.error('Custom chains config integrity check failed!')
              throw new Error('Config integrity verification failed')
            }
            console.log('Custom chains config integrity verified')
          }

          this.loadFromConfig(data)
          this.loaded = true
          console.log('Custom chain deployments loaded from runtime endpoint')
          if (data.gatewayUrl) {
            this.gatewayUrl = data.gatewayUrl
          }
          return
        } catch (error) {
          console.warn('Failed to fetch custom chains config, using package defaults:', error)
          // Fall through to use defaults
        }
      }

      // Build-time: use environment variable if available
      const envConfig = process.env.CUSTOM_CHAINS_CONFIG
      if (envConfig) {
        this.loadFromString(envConfig)
        this.loaded = true
        console.log('Custom chain deployments loaded from build-time environment variable')
        return
      }

      // No custom configuration found - use package defaults only
      console.debug('No custom chain configuration found, using package defaults only')
      this.loaded = true
    } catch (error) {
      console.error('Failed to load custom deployments:', error)
      this.loaded = true // Mark as loaded to prevent infinite retries
      // Don't throw - fail gracefully and use package defaults
    }
  }

  /**
   * Compute SHA-256 hash of a string for integrity checking
   */
  private async computeHash(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    // Type assertion: Uint8Array is a valid BufferSource but TS types are strict
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer as BufferSource)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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

    // Get ABI from the package deployment for this version
    const packageDeployment = this.getPackageDeployment(contractName, version)
    if (!packageDeployment) {
      console.warn(`Could not find package deployment for ${contractName}@${version}, skipping custom deployment`)
      return undefined
    }

    // Convert to SingletonDeployment format, using package ABI
    const result = {
      defaultAddress: deployment.address,
      released: true,
      contractName: contractName,
      version: version,
      networkAddresses: {
        [chainId]: deployment.address,
      },
      abi: packageDeployment.abi,
      ...(deployment.blockNumber && {
        deployments: {
          [chainId]: {
            address: deployment.address,
            blockNumber: deployment.blockNumber,
          },
        },
      }),
    }
    return result
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
   * Get the package deployment for a contract to retrieve its ABI
   */
  private getPackageDeployment(contractName: string, version: string): SingletonDeployment | undefined {
    try {
      // Use a dummy network to get the deployment (we only need the ABI)
      const filter = { version }

      switch (contractName) {
        case 'Safe':
        case 'GnosisSafe':
          return getSafeSingletonDeployment(filter)
        case 'SafeL2':
        case 'GnosisSafeL2':
          return getSafeL2SingletonDeployment(filter)
        case 'MultiSendCallOnly':
          return getMultiSendCallOnlyDeployment(filter)
        case 'CompatibilityFallbackHandler':
          return getFallbackHandlerDeployment(filter)
        case 'SafeProxyFactory':
        case 'ProxyFactory':
          return getProxyFactoryDeployment(filter)
        case 'SignMessageLib':
          return getSignMessageLibDeployment(filter)
        case 'CreateCall':
          return getCreateCallDeployment(filter)
        default:
          return undefined
      }
    } catch (error) {
      console.warn(`Failed to get package deployment for ${contractName}@${version}:`, error)
      return undefined
    }
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
