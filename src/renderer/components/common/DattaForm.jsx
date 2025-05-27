import React from 'react';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';

export function DattaTextField({ label, error, helperText, ...props }) {
  return (
    <TextField
      label={label}
      error={!!error}
      helperText={error || helperText}
      variant="outlined"
      size="small"
      inputProps={{ style: { height: 32, padding: '0 8px' } }}
      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 'var(--datta-border-radius)' } }}
      fullWidth
      {...props}
    />
  );
}

export function DattaSelect({ label, options = [], error, helperText, ...props }) {
  return (
    <FormControl fullWidth size="small" error={!!error} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 'var(--datta-border-radius)' } }}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} {...props}>
        {options.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
}

export default { DattaTextField, DattaSelect };
