import { type JsonRpcProvider, type TransactionReceipt } from 'ethers'

/**
 * Singleton class for watching pending txs.
 *
 * Offers two methods:
 * - {@linkplain watchTxHash} to watch a new pending tx
 * - {@linkplain stopWatchingTxHash} to stop an active watcher for a pending tx
 */
export class SimpleTxWatcher {
  private static INSTANCE: SimpleTxWatcher | undefined
  private readonly unsubFunctions: Record<string, () => void>
  private static readonly REPLACED_BLOCK_THRESHOLD = 2

  private constructor() {
    this.unsubFunctions = {}
  }

  static getInstance() {
    if (!SimpleTxWatcher.INSTANCE) {
      SimpleTxWatcher.INSTANCE = new SimpleTxWatcher()
    }
    return SimpleTxWatcher.INSTANCE
  }

  /**
   * Watches a transaction and returns the {@linkplain TransactionReceipt} if the transaction executes.
   * If the transaction gets replaced, sped up or cancelled in the connected wallet the watcher rejects with an error.
   * @param txHash hash of the pending tx
   * @param walletAddress from address of the pending tx (executing wallet)
   * @param walletNonce used nonce of the connected wallet for the pending tx
   * @param provider RPC provider
   * @returns
   */
  watchTxHash(txHash: string, walletAddress: string, walletNonce: number, provider: JsonRpcProvider) {
    return new Promise<TransactionReceipt>((resolve, reject) => {
      let intervalId: ReturnType<typeof setInterval> | undefined

      const unsubscribe = () => {
        provider.off('block', checkTx)
        if (intervalId !== undefined) {
          clearInterval(intervalId)
          intervalId = undefined
        }
      }

      let replacedBlockCount = 0

      const checkTx = async () => {
        // try to retrieve the receipt
        const testReceipt = await provider.getTransactionReceipt(txHash)
        if (testReceipt !== null) {
          unsubscribe()
          resolve(testReceipt)
        } else {
          // Check if tx was replaced
          const currentNonce = await provider.getTransactionCount(walletAddress)
          if (currentNonce > walletNonce) {
            if (replacedBlockCount >= SimpleTxWatcher.REPLACED_BLOCK_THRESHOLD) {
              unsubscribe()
              reject(`Transaction not found. It might have been replaced or cancelled in the connected wallet.`)
            }
            replacedBlockCount++
          }
        }
      }

      // Subscribe to block events (fires when new blocks are produced)
      provider.on('block', checkTx)
      // Also poll on an interval for chains that only produce blocks on-demand
      intervalId = setInterval(checkTx, 4_000)
      this.unsubFunctions[txHash] = unsubscribe
    })
  }

  /**
   * Stops an active watcher for the given txHash
   */
  stopWatchingTxHash = async (txHash: string) => {
    this.unsubFunctions[txHash]?.()
    delete this.unsubFunctions[txHash]
  }
}
