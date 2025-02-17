import React, { type ReactElement, useCallback } from 'react'
import { useRouter } from 'next/router'
import ListItem from '@mui/material/ListItem'
import { ImplementationVersionState } from '@safe-global/safe-gateway-typescript-sdk'

import {
  SidebarList,
  SidebarListItemButton,
  SidebarListItemIcon,
  SidebarListItemText,
} from '@/components/sidebar/SidebarList'
import { navItems } from './config'
import useSafeInfo from '@/hooks/useSafeInfo'
import { AppRoutes } from '@/config/routes'
import useTxQueue from '@/hooks/useTxQueue'
import { useRecoveryQueue } from '@/hooks/useRecoveryQueue'

const getSubdirectory = (pathname: string): string => {
  return pathname.split('/')[1]
}

const Navigation = (): ReactElement => {
  const router = useRouter()
  const { safe } = useSafeInfo()
  const currentSubdirectory = getSubdirectory(router.pathname)
  const hasQueuedTxs = Boolean(useTxQueue().page?.results.length)
  const hasRecoveryTxs = Boolean(useRecoveryQueue().length)

  // Indicate whether the current Safe needs an upgrade
  const setupItem = navItems.find((item) => item.href === AppRoutes.settings.setup)
  if (setupItem) {
    setupItem.badge = safe.implementationVersionState === ImplementationVersionState.OUTDATED
  }

  // Route Transactions to Queue if there are queued txs, otherwise to History
  const getRoute = useCallback(
    (href: string) => {
      if (href === AppRoutes.transactions.history && (hasQueuedTxs || hasRecoveryTxs)) {
        return AppRoutes.transactions.queue
      }
      return href
    },
    [hasQueuedTxs, hasRecoveryTxs],
  )

  return (
    <SidebarList>
      {navItems.map((item) => {
        const isSelected = currentSubdirectory === getSubdirectory(item.href)

        return (
          <ListItem key={item.href} disablePadding selected={isSelected}>
            <SidebarListItemButton
              selected={isSelected}
              href={{ pathname: getRoute(item.href), query: { safe: router.query.safe } }}
            >
              {item.icon && <SidebarListItemIcon badge={item.badge}>{item.icon}</SidebarListItemIcon>}
              <SidebarListItemText bold>{item.label}</SidebarListItemText>
            </SidebarListItemButton>
          </ListItem>
        )
      })}
    </SidebarList>
  )
}

export default React.memo(Navigation)
