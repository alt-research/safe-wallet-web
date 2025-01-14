import { type ReactElement, useState, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { SvgIcon, Typography } from '@mui/material'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import useAddressBook from '@/hooks/useAddressBook'
import AddressInput, { type AddressInputProps } from '../AddressInput'
import EthHashInfo from '../EthHashInfo'
import InfoIcon from '@/public/images/notifications/info.svg'
import EntryDialog from '@/components/address-book/EntryDialog'
import css from './styles.module.css'
import inputCss from '@/styles/inputs.module.css'

const abFilterOptions = createFilterOptions({
  stringify: (option: { label: string; name: string }) => option.name + ' ' + option.label,
})

/**
 *  Temporary component until revamped safe components are done
 */
const AddressBookInput = ({ name, canAdd, ...props }: AddressInputProps & { canAdd?: boolean }): ReactElement => {
  const addressBook = useAddressBook()
  const { setValue, control } = useFormContext()
  const addressValue = useWatch({ name, control })
  const [open, setOpen] = useState(false)
  const [openAddressBook, setOpenAddressBook] = useState<boolean>(false)

  const addressBookEntries = Object.entries(addressBook).map(([address, name]) => ({
    label: address,
    name,
  }))

  const hasVisibleOptions = useMemo(
    () => !!addressBookEntries.filter((entry) => entry.label.includes(addressValue)).length,
    [addressBookEntries, addressValue],
  )

  const handleOpenAutocomplete = () => {
    setOpen((value) => !value)
  }

  const onAddressBookClick = canAdd
    ? () => {
        setOpenAddressBook(true)
      }
    : undefined

  return (
    <>
      <Autocomplete
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        className={inputCss.input}
        disableClearable
        value={addressValue || ''}
        disabled={props.disabled}
        readOnly={props.InputProps?.readOnly}
        freeSolo
        options={addressBookEntries}
        onInputChange={(_, value) => setValue(name, value)}
        filterOptions={abFilterOptions}
        componentsProps={{
          paper: {
            elevation: 2,
          },
        }}
        renderOption={(props, option) => (
          <Typography component="li" variant="body2" {...props}>
            <EthHashInfo address={option.label} name={option.name} shortAddress={false} copyAddress={false} />
          </Typography>
        )}
        renderInput={(params) => (
          <AddressInput
            {...params}
            {...props}
            name={name}
            onOpenListClick={hasVisibleOptions ? handleOpenAutocomplete : undefined}
            isAutocompleteOpen={open}
            onAddressBookClick={onAddressBookClick}
          />
        )}
      />
      {canAdd ? (
        <Typography variant="body2" className={css.unknownAddress}>
          <SvgIcon component={InfoIcon} fontSize="small" />
          <span>
            This is an unknown address. You can{' '}
            <a role="button" onClick={onAddressBookClick}>
              add it to your address book
            </a>
            .
          </span>
        </Typography>
      ) : null}

      {openAddressBook && (
        <EntryDialog
          handleClose={() => setOpenAddressBook(false)}
          defaultValues={{ name: '', address: addressValue }}
        />
      )}
    </>
  )
}

export default AddressBookInput
