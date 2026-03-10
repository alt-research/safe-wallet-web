import {
  getFallbackHandlerContractDeployment,
  getMultiSendCallOnlyContractDeployment,
  getProxyFactoryContractDeployment,
  getSafeContractDeployment,
  getSignMessageLibContractDeployment,
  getCreateCallContractDeployment,
} from './deployments'
import {
  getSafeL2SingletonDeployment,
  getProxyFactoryDeployment,
  getMultiSendDeployment,
  getMultiSendCallOnlyDeployment,
  getFallbackHandlerDeployment,
  getSignMessageLibDeployment,
  getCreateCallDeployment,
} from '@safe-global/safe-deployments'
import { customDeploymentLoader } from './custom-deployment-loader'
import { LATEST_SAFE_VERSION } from '@/config/constants'
import { ImplementationVersionState } from '@safe-global/safe-gateway-typescript-sdk'
import type { ChainInfo, SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import type { GetContractProps, SafeVersion } from '@safe-global/safe-core-sdk-types'
import { assertValidSafeVersion, createEthersAdapter, createReadOnlyEthersAdapter } from '@/hooks/coreSDK/safeCoreSDK'
import type { BrowserProvider } from 'ethers'
import type { EthersAdapter, SafeContractEthers, SignMessageLibEthersContract } from '@safe-global/protocol-kit'
import semver from 'semver'

import type CompatibilityFallbackHandlerEthersContract from '@safe-global/protocol-kit/dist/src/adapters/ethers/contracts/CompatibilityFallbackHandler/CompatibilityFallbackHandlerEthersContract'

// `UNKNOWN` is returned if the mastercopy does not match supported ones
// @see https://github.com/safe-global/safe-client-gateway/blob/main/src/routes/safes/handlers/safes.rs#L28-L31
//      https://github.com/safe-global/safe-client-gateway/blob/main/src/routes/safes/converters.rs#L77-L79
export const isValidMasterCopy = (implementationVersionState: SafeInfo['implementationVersionState']): boolean => {
  return implementationVersionState !== ImplementationVersionState.UNKNOWN
}

export const _getValidatedGetContractProps = (
  safeVersion: SafeInfo['version'],
): Pick<GetContractProps, 'safeVersion'> => {
  assertValidSafeVersion(safeVersion)

  // SDK request here: https://github.com/safe-global/safe-core-sdk/issues/261
  // Remove '+L2'/'+Circles' metadata from version
  const [noMetadataVersion] = safeVersion.split('+')

  return {
    safeVersion: noMetadataVersion as SafeVersion,
  }
}

// GnosisSafe

const getGnosisSafeContractEthers = async (safe: SafeInfo, ethAdapter: EthersAdapter): Promise<SafeContractEthers> => {
  return ethAdapter.getSafeContract({
    customContractAddress: safe.address.value,
    ..._getValidatedGetContractProps(safe.version),
  })
}

export const getReadOnlyCurrentGnosisSafeContract = async (safe: SafeInfo): Promise<SafeContractEthers> => {
  const ethAdapter = createReadOnlyEthersAdapter()
  return getGnosisSafeContractEthers(safe, ethAdapter)
}

export const getCurrentGnosisSafeContract = async (
  safe: SafeInfo,
  provider: BrowserProvider,
): Promise<SafeContractEthers> => {
  const ethAdapter = await createEthersAdapter(provider)
  return getGnosisSafeContractEthers(safe, ethAdapter)
}

export const getReadOnlyGnosisSafeContract = async (chain: ChainInfo, safeVersion: string = LATEST_SAFE_VERSION) => {
  const ethAdapter = createReadOnlyEthersAdapter()
  const deployment = getSafeContractDeployment(chain, safeVersion)

  const config: any = deployment?.defaultAddress
    ? {
        customContractAddress: deployment.defaultAddress,
        ..._getValidatedGetContractProps(safeVersion),
      }
    : {
        singletonDeployment: deployment,
        ..._getValidatedGetContractProps(safeVersion),
      }

  return ethAdapter.getSafeContract(config)
}

// MultiSend

export const _getMinimumMultiSendCallOnlyVersion = (safeVersion: SafeInfo['version']) => {
  const INITIAL_CALL_ONLY_VERSION = '1.3.0'

  if (!safeVersion) {
    return INITIAL_CALL_ONLY_VERSION
  }

  return semver.gte(safeVersion, INITIAL_CALL_ONLY_VERSION) ? safeVersion : INITIAL_CALL_ONLY_VERSION
}

export const getMultiSendCallOnlyContract = async (
  chainId: string,
  safeVersion: SafeInfo['version'],
  provider: BrowserProvider,
) => {
  const ethAdapter = await createEthersAdapter(provider)
  const multiSendVersion = _getMinimumMultiSendCallOnlyVersion(safeVersion)
  const deployment = getMultiSendCallOnlyContractDeployment(chainId, multiSendVersion)

  const config: any = deployment?.defaultAddress
    ? {
        customContractAddress: deployment.defaultAddress,
        ..._getValidatedGetContractProps(safeVersion),
      }
    : {
        singletonDeployment: deployment,
        ..._getValidatedGetContractProps(safeVersion),
      }

  return ethAdapter.getMultiSendCallOnlyContract(config)
}

export const getReadOnlyMultiSendCallOnlyContract = async (chainId: string, safeVersion: SafeInfo['version']) => {
  const ethAdapter = createReadOnlyEthersAdapter()
  const multiSendVersion = _getMinimumMultiSendCallOnlyVersion(safeVersion)
  const deployment = getMultiSendCallOnlyContractDeployment(chainId, multiSendVersion)

  const config: any = deployment?.defaultAddress
    ? {
        customContractAddress: deployment.defaultAddress,
        ..._getValidatedGetContractProps(safeVersion),
      }
    : {
        singletonDeployment: deployment,
        ..._getValidatedGetContractProps(safeVersion),
      }

  return ethAdapter.getMultiSendCallOnlyContract(config)
}

// GnosisSafeProxyFactory

export const getReadOnlyProxyFactoryContract = (chainId: string, safeVersion: SafeInfo['version']) => {
  const ethAdapter = createReadOnlyEthersAdapter()
  const deployment = getProxyFactoryContractDeployment(chainId, safeVersion)

  const config: any = deployment?.defaultAddress
    ? {
        customContractAddress: deployment.defaultAddress,
        ..._getValidatedGetContractProps(safeVersion),
      }
    : {
        singletonDeployment: deployment,
        ..._getValidatedGetContractProps(safeVersion),
      }

  return ethAdapter.getSafeProxyFactoryContract(config)
}

// Fallback handler

export const getReadOnlyFallbackHandlerContract = async (
  chainId: string,
  safeVersion: SafeInfo['version'],
): Promise<CompatibilityFallbackHandlerEthersContract> => {
  const ethAdapter = createReadOnlyEthersAdapter()
  const deployment = getFallbackHandlerContractDeployment(chainId, safeVersion)

  // If we have a custom deployment with an address, only pass customContractAddress
  // Otherwise pass singletonDeployment for package defaults
  const config: any = deployment?.defaultAddress
    ? {
        customContractAddress: deployment.defaultAddress,
        ..._getValidatedGetContractProps(safeVersion),
      }
    : {
        singletonDeployment: deployment,
        ..._getValidatedGetContractProps(safeVersion),
      }

  return ethAdapter.getCompatibilityFallbackHandlerContract(config)
}

// Sign messages deployment

export const getReadOnlySignMessageLibContract = async (
  chainId: string,
  safeVersion: SafeInfo['version'],
): Promise<SignMessageLibEthersContract> => {
  const ethAdapter = createReadOnlyEthersAdapter()
  const deployment = getSignMessageLibContractDeployment(chainId, safeVersion)

  const config: any = deployment?.defaultAddress
    ? {
        customContractAddress: deployment.defaultAddress,
        ..._getValidatedGetContractProps(safeVersion),
      }
    : {
        singletonDeployment: deployment,
        ..._getValidatedGetContractProps(safeVersion),
      }

  return ethAdapter.getSignMessageLibContract(config)
}

const _getDefaultAddr = (
  getDeployment: (filter: { version: string }) => { defaultAddress?: string } | undefined,
  version: string,
) => getDeployment({ version })?.defaultAddress

export const getContractNetworks = (chainId: string, safeVersion: string) => {
  const v = safeVersion
  const getAddr = (name: string, getDefault: () => string | undefined) =>
    customDeploymentLoader.getDeployment(chainId, name, v)?.defaultAddress ?? getDefault()

  return {
    [chainId]: {
      safeSingletonAddress: getAddr('SafeL2', () => _getDefaultAddr(getSafeL2SingletonDeployment, v)),
      safeProxyFactoryAddress: getAddr('SafeProxyFactory', () => _getDefaultAddr(getProxyFactoryDeployment, v)),
      multiSendAddress: getAddr('MultiSend', () => _getDefaultAddr(getMultiSendDeployment, v)),
      multiSendCallOnlyAddress: getAddr('MultiSendCallOnly', () => _getDefaultAddr(getMultiSendCallOnlyDeployment, v)),
      fallbackHandlerAddress: getAddr(
        'CompatibilityFallbackHandler',
        () => _getDefaultAddr(getFallbackHandlerDeployment, v),
      ),
      signMessageLibAddress: getAddr('SignMessageLib', () => _getDefaultAddr(getSignMessageLibDeployment, v)),
      createCallAddress: getAddr('CreateCall', () => _getDefaultAddr(getCreateCallDeployment, v)),
      simulateTxAccessorAddress:
        customDeploymentLoader.getDeployment(chainId, 'SimulateTxAccessor', v)?.defaultAddress ??
        '0x0000000000000000000000000000000000000000',
    },
  }
}
