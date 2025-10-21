import { useRouter } from 'next/router'
import type { SafeAppData } from '@safe-global/safe-gateway-typescript-sdk'
import { SafeAppAccessPolicyTypes } from '@safe-global/safe-gateway-typescript-sdk'
import type { UrlObject } from 'url'

import { SafeAppsTag } from '@/config/constants'
import { AppRoutes } from '@/config/routes'
import { useRemoteSafeApps } from '@/hooks/safe-apps/useRemoteSafeApps'
import { useCurrentChain } from '@/hooks/useChains'

// Fallback Transaction Builder configuration for chains not supported by Safe Gateway
const FALLBACK_TX_BUILDER: SafeAppData = {
  id: 999999,
  url: 'https://safe-apps.dev.5afe.dev/tx-builder',
  name: 'Transaction Builder',
  iconUrl: 'https://safe-apps.dev.5afe.dev/tx-builder/tx-builder.png',
  description: 'Compose custom contract interactions and batch them into a single transaction',
  chainIds: [], // Will work for all chains
  provider: undefined,
  accessControl: { type: SafeAppAccessPolicyTypes.NoRestrictions },
  tags: ['transaction-builder'],
  features: [],
  developerWebsite: '',
  socialProfiles: [],
}

export const useTxBuilderApp = (): { app?: SafeAppData; link: UrlObject } | undefined => {
  const [matchingApps] = useRemoteSafeApps(SafeAppsTag.TX_BUILDER)
  const router = useRouter()
  const chain = useCurrentChain()

  // Use remote app if available, otherwise use fallback
  const app = matchingApps?.[0] || (chain ? FALLBACK_TX_BUILDER : undefined)

  if (!app) {
    return undefined
  }

  return {
    app,
    link: {
      pathname: AppRoutes.apps.open,
      query: { safe: router.query.safe, appUrl: app?.url },
    },
  }
}
