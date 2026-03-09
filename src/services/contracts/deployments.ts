import semverSatisfies from 'semver/functions/satisfies'
import {
  getSafeSingletonDeployment,
  getSafeL2SingletonDeployment,
  getMultiSendCallOnlyDeployment,
  getFallbackHandlerDeployment,
  getProxyFactoryDeployment,
  getSignMessageLibDeployment,
  getCreateCallDeployment,
} from '@safe-global/safe-deployments'
import type { SingletonDeployment, DeploymentFilter } from '@safe-global/safe-deployments'
import type { ChainInfo, SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'

import { LATEST_SAFE_VERSION } from '@/config/constants'
import { customDeploymentLoader } from './custom-deployment-loader'

// Initialize custom deployment loader eagerly
// This promise resolves when custom deployments are loaded
export const customDeploymentsReady = customDeploymentLoader.load()

export const _tryDeploymentVersions = (
  getDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined,
  network: string,
  version: SafeInfo['version'],
  contractName?: string,
): SingletonDeployment | undefined => {
  // Check custom deployments first (synchronous — loader must be awaited before this runs)
  if (contractName && version) {
    const customDeployment = customDeploymentLoader.getDeployment(network, contractName, version)
    if (customDeployment) {
      return customDeployment
    }
  }

  // Unsupported Safe version — assume latest as fallback
  if (version === null) {
    return getDeployment({
      version: LATEST_SAFE_VERSION,
      network,
    })
  }

  return getDeployment({
    version,
    network,
  })
}

export const _isLegacy = (safeVersion: SafeInfo['version']): boolean => {
  const LEGACY_VERSIONS = '<=1.0.0'
  return !!safeVersion && semverSatisfies(safeVersion, LEGACY_VERSIONS)
}

export const _isL2 = (chain: ChainInfo, safeVersion: SafeInfo['version']): boolean => {
  const L2_VERSIONS = '>=1.3.0'

  // Unsupported safe version
  if (safeVersion === null) {
    return chain.l2
  }

  // We had L1 contracts on xDai, EWC and Volta so we also need to check version is after 1.3.0
  return chain.l2 && semverSatisfies(safeVersion, L2_VERSIONS)
}

export const getSafeContractDeployment = (
  chain: ChainInfo,
  safeVersion: SafeInfo['version'],
): SingletonDeployment | undefined => {
  // Check if prior to 1.0.0 to keep minimum compatibility
  if (_isLegacy(safeVersion)) {
    return getSafeSingletonDeployment({ version: '1.0.0' })
  }

  const isL2 = _isL2(chain, safeVersion)
  const getDeployment = isL2 ? getSafeL2SingletonDeployment : getSafeSingletonDeployment
  const contractName = isL2 ? 'SafeL2' : 'Safe'

  return _tryDeploymentVersions(getDeployment, chain.chainId, safeVersion, contractName)
}

export const getMultiSendCallOnlyContractDeployment = (chainId: string, safeVersion: SafeInfo['version']) => {
  return _tryDeploymentVersions(getMultiSendCallOnlyDeployment, chainId, safeVersion, 'MultiSendCallOnly')
}

export const getFallbackHandlerContractDeployment = (chainId: string, safeVersion: SafeInfo['version']) => {
  return _tryDeploymentVersions(getFallbackHandlerDeployment, chainId, safeVersion, 'CompatibilityFallbackHandler')
}

export const getProxyFactoryContractDeployment = (chainId: string, safeVersion: SafeInfo['version']) => {
  return _tryDeploymentVersions(getProxyFactoryDeployment, chainId, safeVersion, 'SafeProxyFactory')
}

export const getSignMessageLibContractDeployment = (chainId: string, safeVersion: SafeInfo['version']) => {
  return _tryDeploymentVersions(getSignMessageLibDeployment, chainId, safeVersion, 'SignMessageLib')
}

export const getCreateCallContractDeployment = (chainId: string, safeVersion: SafeInfo['version']) => {
  return _tryDeploymentVersions(getCreateCallDeployment, chainId, safeVersion, 'CreateCall')
}
