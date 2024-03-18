import { useState } from 'react'
import logo from './logo.svg'
import './App.css'
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

function App() {
  const [count, setCount] = useState(0)

  return (
    <Stack spacing={2} margin={20}>
      <TextField variant="outlined"  />
      
    </Stack>
  )
}

export default App
