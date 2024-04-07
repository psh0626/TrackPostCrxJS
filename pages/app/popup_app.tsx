import React, { useEffect, useRef } from "react";
import { useState } from "react";

import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { MyList, StyledTextField } from "../custom/components";
import PopupTrack from "../../src/lib/PopupTrack";
import { WorkflowItem } from "../../src/background/GetUnreadReplies/DataWrapper";
import {
  Accordion,
  AccordionSummary,
  Checkbox,
  Icon,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { ExpandMore, OpenInBrowser } from "@mui/icons-material";

function PopUpApp() {
  // Tracking number state (you might want to bind this as well)
  const [item_id_field, set_item_id_field] = useState("");
  const [is_valid, set_is_valid] = useState(true);
  const [workflow_items, set_workflow_items] = useState([]);
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
    });
    console.log("Popup sidepanel opened state:", tracker);
    window.close();
  };

  useEffect(() => {
    if (textfield_ref.current) {
      textfield_ref.current.focus();
    }
    chrome.storage.local.get("WORKFLOWS").then((dict) => {
      if (dict.WORKFLOWS.length > 0) {
        set_workflow_items(dict.WORKFLOWS);
        console.log("workflows loaded from storage local: ", workflow_items);
      } else {
        console.log("workflows count is 0 or below");
      }
    });
    chrome.storage.local.onChanged.addListener((dict) => {
      set_workflow_items(dict.WORKFLOWS.newValue);
    });
  }, []);

  return (
    <Stack spacing={0} margin={6} marginTop={0} width="300px">
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
      {workflow_items.length > 0 && MyList(workflow_items)}
      {workflow_items.length === 0 && (
        <Stack alignItems="center">
          <Typography variant="subtitle2" color="initial">
            ICare Replies: 모두 읽음 ✔️
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}

export default PopUpApp;
