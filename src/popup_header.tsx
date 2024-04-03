import { AppBar, colors, Stack, Typography } from "@mui/material";

export default function PopupHeader() {
  return (
    <Stack color={colors.deepOrange} marginTop={5} marginBottom={5}>
      <AppBar>
        <Typography variant="h4" textAlign="center" fontWeight="300">
          국제우편 행방조사
        </Typography>
      </AppBar>
    </Stack>
  );
}
