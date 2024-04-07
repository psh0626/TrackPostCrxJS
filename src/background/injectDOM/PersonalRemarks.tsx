import React, { useEffect } from "react";
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import FormHelperText from '@mui/material/FormHelperText'
import { MenuItem, Select } from "@mui/material";

export default function PersonalRemarksSelect() {

  useEffect(() => {
    
  }, [])

  return (
    <FormControl fullWidth size="small">
      <Select>
        <MenuItem disabled value="">
          <em>Placeholder</em>
        </MenuItem>
      </Select>
    </FormControl>
  );
}