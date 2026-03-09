import { useEffect, useState } from 'react'
import { getChainsConfig, type ChainInfo, FEATURES } from '@safe-global/safe-gateway-typescript-sdk'
import useAsync, { type AsyncResult } from '../useAsync'
import { logError, Errors } from '@/services/exceptions'
import { customDeploymentsReady } from '@/services/contracts/deployments'

const getConfigs = async (): Promise<ChainInfo[]> => {
  const data = await getChainsConfig()
  const chains = data.results || []

  // Add missing features for self-hosted chains
  return chains.map((chain) => {
    // For chain 957, ensure SAFE_APPS feature is enabled
    if (chain.chainId === '957') {
      const features = chain.features || []
      if (!features.includes(FEATURES.SAFE_APPS)) {
        return {
          ...chain,
          features: [...features, FEATURES.SAFE_APPS],
        }
      }
    }
    return chain
  })
}

export const useLoadChains = (): AsyncResult<ChainInfo[]> => {
  const [deploymentsReady, setDeploymentsReady] = useState(false)

  useEffect(() => {
    customDeploymentsReady.then(() => setDeploymentsReady(true))
  }, [])

  // Pass undefined until the gateway URL is set by the custom-chains loader
  const [data, error, loading] = useAsync<ChainInfo[]>(() => (deploymentsReady ? getConfigs() : undefined), [deploymentsReady])

  // Log errors
  useEffect(() => {
    if (error) {
      logError(Errors._620, error.message)
    }
  }, [error])

  return [data, error, loading]
}

export default useLoadChains
