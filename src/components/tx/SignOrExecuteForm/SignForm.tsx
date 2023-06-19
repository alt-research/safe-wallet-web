import { type ReactElement, type SyntheticEvent, useContext, useState } from 'react'
import { Button, CardActions } from '@mui/material'

import ErrorMessage from '@/components/tx/ErrorMessage'
import { logError, Errors } from '@/services/exceptions'
import useIsSafeOwner from '@/hooks/useIsSafeOwner'
import CheckWallet from '@/components/common/CheckWallet'
import { useTxActions } from './hooks'
import type { SignOrExecuteProps } from '.'
import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { TxModalContext } from '@/components/tx-flow'

const SignForm = ({
  safeTx,
  txId,
  onSubmit,
  disableSubmit = false,
  origin,
}: SignOrExecuteProps & {
  safeTx?: SafeTransaction
}): ReactElement => {
  // Form state
  const [isSubmittable, setIsSubmittable] = useState<boolean>(true)
  const [submitError, setSubmitError] = useState<Error | undefined>()

  // Hooks
  const isOwner = useIsSafeOwner()
  const { signTx } = useTxActions()
  const { setTxFlow } = useContext(TxModalContext)

  // On modal submit
  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    setIsSubmittable(false)
    setSubmitError(undefined)

    try {
      await signTx(safeTx, txId, origin)
      setTxFlow(undefined)
    } catch (err) {
      logError(Errors._804, (err as Error).message)
      setIsSubmittable(true)
      setSubmitError(err as Error)
      return
    }

    onSubmit()
  }

  const cannotPropose = !isOwner
  const submitDisabled = !safeTx || !isSubmittable || disableSubmit || cannotPropose

  return (
    <form onSubmit={handleSubmit}>
      {/* Error messages */}
      {isSubmittable && cannotPropose ? (
        <ErrorMessage>
          You are currently not an owner of this Safe Account and won&apos;t be able to submit this transaction.
        </ErrorMessage>
      ) : (
        submitError && (
          <ErrorMessage error={submitError}>Error submitting the transaction. Please try again.</ErrorMessage>
        )
      )}

      <CardActions>
        {/* Submit button */}
        <CheckWallet>
          {(isOk) => (
            <Button variant="contained" type="submit" disabled={!isOk || submitDisabled}>
              Submit
            </Button>
          )}
        </CheckWallet>
      </CardActions>
    </form>
  )
}

export default SignForm