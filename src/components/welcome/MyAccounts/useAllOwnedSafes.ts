import type { AllOwnedSafes } from '@safe-global/safe-gateway-typescript-sdk'
import { getOwnedSafes } from '@safe-global/safe-gateway-typescript-sdk'
import type { AsyncResult } from '@/hooks/useAsync'
import useAsync from '@/hooks/useAsync'
import useLocalStorage from '@/services/local-storage/useLocalStorage'
import useChains from '@/hooks/useChains'
import { useEffect } from 'react'

const CACHE_KEY = 'ownedSafesCache_'

type OwnedSafesPerAddress = {
  address: string | undefined
  ownedSafes: AllOwnedSafes
}

const useAllOwnedSafes = (address: string): AsyncResult<AllOwnedSafes> => {
  const [cache, setCache] = useLocalStorage<AllOwnedSafes>(CACHE_KEY + address)
  const { configs } = useChains()

  const [data, error, isLoading] = useAsync<OwnedSafesPerAddress>(async () => {
    if (!address)
      return {
        ownedSafes: {},
        address: undefined,
      }

    // Query each chain individually to avoid the cross-chain endpoint which fails
    // if any single chain's transaction service is unavailable.
    const results = await Promise.allSettled(configs.map((chain) => getOwnedSafes(chain.chainId, address)))

    const ownedSafes: AllOwnedSafes = {}
    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.safes.length > 0) {
        ownedSafes[configs[i].chainId] = result.value.safes
      }
    })

    return { ownedSafes, address }
  }, [address, configs])

  useEffect(() => {
    if (data?.ownedSafes != undefined && data.address === address) {
      setCache(data.ownedSafes)
    }
  }, [address, cache, data, setCache])

  return [cache, error, isLoading]
}

export default useAllOwnedSafes
