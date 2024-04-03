import React from "react";
import { AppBar, colors, Stack, Typography, Toolbar } from "@mui/material";
import { ReactNode } from "react";
import { TravelExplore } from "@mui/icons-material";
interface nested_component {
  children?: ReactNode;
}
export default function PopupHeader({ children }: nested_component) {
  return (
    <Stack color={colors.deepOrange} marginTop={5} marginBottom={5}>
      <AppBar position="fixed" color="primary">
        <Toolbar>
          <TravelExplore sx={{ mr: 1 }} />
          <Typography variant="h6" textAlign="center" fontWeight={300}>
            국제우편 행방조사
          </Typography>
        </Toolbar>
      </AppBar>
      {children}
    </Stack>
  );
}
