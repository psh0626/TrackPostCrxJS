import React, { useEffect, useRef } from "react";
import { useState } from "react";

import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { StyledTextField } from "./custom/components";
import PopupTrack from "./lib/PopupTrack";
import { COMMANDS, Msg } from "./lib/Message";

function PopUpApp() {
  // Tracking number state (you might want to bind this as well)
  const [item_id_field, set_item_id_field] = useState("");
  const [is_valid, set_is_valid] = useState(true);
  const textfield_ref = useRef<HTMLInputElement>(null);
  const tracker = new PopupTrack();

  const CheckValue = (target: HTMLInputElement | HTMLTextAreaElement) => {
    const pretty_value = target.value.trim().toUpperCase();
    set_item_id_field(pretty_value); // Update
    if (pretty_value === "") {
      set_is_valid(true);
    } else {
      set_is_valid(target.validity.valid);
    }
  };

  const OpenSidePanel = () => {
    chrome.windows.getCurrent((w) => {
      tracker.SetItemId(item_id_field);
      chrome.sidePanel.open({ windowId: w.id! });
    }
    );
    console.log("Popup sidepanel opened state:", tracker);
  };

  useEffect(() => {
    if (textfield_ref.current) {
      textfield_ref.current.focus();
    }
  }, []);

  return (
    <Stack spacing={0} margin={5} width="300px">
      <Typography variant="h4" textAlign="center" mb="1.5rem" fontWeight="700">
        국제우편 행방조사
      </Typography>
      <StyledTextField
        inputRef={textfield_ref}
        variant="outlined"
        label="Tracking Number"
        error={!is_valid}
        onFocus={(e) => e.target.select()}
        inputProps={{
          style: { textTransform: "uppercase", textAlign: "center" },
          maxLength: 13,
          pattern: String.raw`[a-zA-Z]{2}\d{9}[a-zA-Z]{2}`,
        }}
        InputLabelProps={{
          style: { textAlign: "center" },
        }}
        FormHelperTextProps={{
          style: { textAlign: "center" },
        }}
        helperText={is_valid ? " " : "Invalid Tracking Number"}
        onChange={(e) => CheckValue(e.target)}
        onKeyUp={(e) => {
          if (e.key === "Enter" && is_valid) {
            OpenSidePanel();
          }
          return true;
        }}
      />

      <Divider style={{ margin: "15px 0" }} />
      <Button variant="contained" onClick={() => OpenSidePanel()}>
        사이드 패널 열기
      </Button>
    </Stack>
  );
}

export default PopUpApp;
