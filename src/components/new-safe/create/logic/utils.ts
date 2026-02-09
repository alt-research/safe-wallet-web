import { computeNewSafeAddress } from '@/components/new-safe/create/logic/index'
import { isSmartContract } from '@/hooks/wallets/web3'
import type { DeploySafeProps } from '@safe-global/protocol-kit'
import type { ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
import type { BrowserProvider } from 'ethers'

export const getAvailableSaltNonce = async (
  provider: BrowserProvider,
  props: DeploySafeProps,
  chain: ChainInfo,
): Promise<string> => {
  const safeAddress = await computeNewSafeAddress(provider, props, chain)
  const isContractDeployed = await isSmartContract(provider, safeAddress)

  // Safe is already deployed so we try the next saltNonce
  if (isContractDeployed) {
    return getAvailableSaltNonce(provider, { ...props, saltNonce: (Number(props.saltNonce) + 1).toString() }, chain)
  }

  // We know that there will be a saltNonce but the type has it as optional
  return props.saltNonce!
}
