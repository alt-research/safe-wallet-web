/**
 * Custom chain deployment configuration types
 * Allows loading Safe contract addresses for custom chains without patching npm packages
 */

export interface CustomContractDeployment {
  address: string
  /** Optional: deployment block number for event filtering */
  blockNumber?: number
}

export interface CustomChainContracts {
  /** Safe v1.3.0 contracts */
  '1.3.0'?: {
    compatibilityFallbackHandler?: CustomContractDeployment
    createCall?: CustomContractDeployment
    gnosisSafe?: CustomContractDeployment
    gnosisSafeL2?: CustomContractDeployment
    multiSend?: CustomContractDeployment
    multiSendCallOnly?: CustomContractDeployment
    proxyFactory?: CustomContractDeployment
    signMessageLib?: CustomContractDeployment
    simulateTxAccessor?: CustomContractDeployment
  }
  /** Safe v1.4.1 contracts */
  '1.4.1'?: {
    compatibilityFallbackHandler?: CustomContractDeployment
    createCall?: CustomContractDeployment
    safe?: CustomContractDeployment
    safeL2?: CustomContractDeployment
    multiSend?: CustomContractDeployment
    multiSendCallOnly?: CustomContractDeployment
    safeProxyFactory?: CustomContractDeployment
    signMessageLib?: CustomContractDeployment
    simulateTxAccessor?: CustomContractDeployment
  }
}

export interface CustomChainConfig {
  /** Chain ID as string */
  chainId: string
  /** Optional: Chain name for documentation */
  name?: string
  /** Contract deployments by version */
  contracts: CustomChainContracts
}

export interface CustomDeploymentsConfig {
  /** Configuration file version */
  version: string
  /** Custom chain configurations */
  chains: CustomChainConfig[]
}

