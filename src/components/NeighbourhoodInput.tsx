'use client';

import { Autocomplete, TextField, type TextFieldProps } from '@mui/material';
import {
  filterNeighbourhoods,
  matchNeighbourhood,
  type Neighbourhood,
} from '@/lib/tr-neighbourhoods';

interface Props {
  options: Neighbourhood[];
  value: string;
  /** `zip` comes with a neighbourhood picked from the list (or typed exactly as listed). */
  onChange: (neighbourhood: string, zip: string | null) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Label, placeholder, size and styling of the page the field sits in. */
  textFieldProps?: TextFieldProps;
}

/**
 * Neighbourhood (mahalle) of a Turkish address: pick from the district's PTT
 * list or type it — free text is accepted (freeSolo), so a neighbourhood the
 * list lacks never blocks the address. Copy comes from the caller.
 */
export default function NeighbourhoodInput({
  options,
  value,
  onChange,
  disabled,
  loading,
  textFieldProps,
}: Props) {
  return (
    <Autocomplete<Neighbourhood, false, false, true>
      freeSolo
      options={options}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
      filterOptions={(opts, state) => filterNeighbourhoods(opts, state.inputValue)}
      inputValue={value}
      onInputChange={(_, text, reason) => {
        // 'reset' echoes a picked option — handled by onChange with its zip.
        if (reason === 'input' || reason === 'clear') onChange(text, null);
      }}
      onChange={(_, picked) => {
        if (picked && typeof picked !== 'string') onChange(picked.name, picked.zip);
      }}
      onBlur={() => {
        // Typed as listed but spelled differently ("muallimkoy mah.") → the listed
        // spelling and its zip. An exact spelling is left alone, so a zip the
        // buyer corrected by hand is not reset on every blur.
        const listed = matchNeighbourhood(options, value);
        if (listed && listed.name !== value) onChange(listed.name, listed.zip);
      }}
      disabled={disabled}
      loading={loading}
      renderInput={(params) => (
        // The caller's input props are merged in: Autocomplete's own (ref,
        // handlers, value) must survive them.
        <TextField
          {...params}
          {...textFieldProps}
          inputProps={{ ...params.inputProps, ...textFieldProps?.inputProps }}
          InputProps={{ ...params.InputProps, ...textFieldProps?.InputProps }}
        />
      )}
    />
  );
}
