import React from "react";
import { AppBar, colors, Stack, Typography, Toolbar, Button } from "@mui/material";
import { ReactNode } from "react";
import { Settings, TravelExplore } from "@mui/icons-material";
interface nested_component {
  children?: ReactNode;
}
export default function PopupHeader({ children }: nested_component) {
  return (
    <Stack color={colors.deepOrange} marginTop={5} marginBottom={5}>
      <AppBar position="fixed" color="primary">
        <Toolbar>
          <TravelExplore sx={{ mr: 1 }} />
          <Typography variant="h6" textAlign="center" fontWeight={700}>
            국제우편 행방조사
          </Typography>
          <Button
            variant="text"
            color="inherit"
            sx={{ position: "absolute", right: 5 }}
            onClick={() => {
              chrome.runtime.openOptionsPage();
            }}>
            <Settings />
          </Button>
        </Toolbar>
      </AppBar>
      {children}
    </Stack>
  );
}
