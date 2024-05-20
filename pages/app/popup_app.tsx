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
import { IMICSettings } from "../../src/lib/OptionElement";
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
  const [workflow_items, set_workflow_items] = useState<WorkflowItem[]>([]);
  const [icare_req_items, set_icare_req] = useState<WorkflowItem[]>([]);
  const [chk_req, set_chkreq] = useState(false);
  const textfield_ref = useRef<HTMLInputElement>(null);
  const settings = useRef(new IMICSettings());
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
    chrome.windows.getCurrent(async (w) => {
      await tracker.SetItemId(item_id_field);
      chrome.sidePanel.open({ windowId: w.id! });
    });
    console.log("Popup sidepanel opened state:", tracker);
    window.close();
  };

  useEffect(() => {
    if (textfield_ref.current) {
      textfield_ref.current.focus();
    }

    (async () => {
      await settings.current.LoadOptions();
      set_chkreq(settings.current.IcareUnreadRequests);

      const dict = await chrome.storage.local.get("ICARE_UNREAD_REPLIES");
      if (dict.ICARE_UNREAD_REPLIES.length > 0) {
        set_workflow_items(dict.ICARE_UNREAD_REPLIES as WorkflowItem[]);
        console.log("workflows loaded from storage local: ", dict.ICARE_UNREAD_REPLIES);
      } else {
        console.log("workflows count is 0 or below");
      }

      if (settings.current.IcareUnreadRequests) {
        const req_dict = await chrome.storage.local.get("ICARE_UNREAD_REQUESTS");
        set_icare_req(req_dict.ICARE_UNREAD_REQUESTS);
      }

      chrome.storage.local.onChanged.addListener((dict) => {
        set_workflow_items(dict.ICARE_UNREAD_REPLIES.newValue as WorkflowItem[]);
      });
    })();
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
      {chk_req ? icare_req_items.length > 0 && MyList(icare_req_items, "REQ") : ""}
      {workflow_items.length > 0 ? (
        MyList(workflow_items)
      ) : (
        <Stack alignItems="center">
          <Typography variant="subtitle2" color="initial">
            ICare 발송 회신: 모두 읽음 ✔️
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}

export default PopUpApp;
