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
import { GcssItem, WorkflowItem } from "../../src/background/GetUnreadReplies/DataWrapper";
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
  const [gcss_items, set_gcss_items] = useState<GcssItem[]>([]);

  const [chk_req, set_chkreq] = useState(false);
  const [chk_gcss_rep, set_chk_gcssrep] = useState(false);

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
      window.close();
    });
    console.log("Popup sidepanel opened state:", tracker);
  };

  useEffect(() => {
    if (textfield_ref.current) {
      textfield_ref.current.focus();
    }

    (async () => {
      await settings.current.LoadOptions();
      set_chkreq(settings.current.IcareUnreadRequests);
      set_chk_gcssrep(settings.current.GcssUnreadReplies);

      const dict = (await chrome.storage.session.get("ICARE_UNREAD_REPLIES"))
        .ICARE_UNREAD_REPLIES as WorkflowItem[];

      if (typeof dict !== "undefined" && dict.length > 0) {
        set_workflow_items(dict);
        console.log("workflows loaded from storage local: ", dict);
      } else {
        console.log("workflows count is 0 or below");
      }

      if (settings.current.IcareUnreadRequests) {
        const dict = (await chrome.storage.session.get("ICARE_UNREAD_REQUESTS"))
          .ICARE_UNREAD_REQUESTS as WorkflowItem[];
        if (typeof dict !== "undefined" && dict.length > 0) set_icare_req(dict);
      }

      if (settings.current.GcssUnreadReplies) {
        const dict = (await chrome.storage.session.get("GCSS_UNREAD_REPLIES"))
          .GCSS_UNREAD_REPLIES as GcssItem[];
        if (typeof dict !== "undefined" && dict.length > 0) set_gcss_items(dict);
      }

      chrome.storage.session.onChanged.addListener((dict) => {
        set_workflow_items(dict.ICARE_UNREAD_REPLIES.newValue as WorkflowItem[]);
        set_gcss_items(dict.GCSS_UNREAD_REPLIES.newValue as GcssItem[]);
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
      {chk_gcss_rep ? (
        gcss_items.length > 0 ? (
          MyList(gcss_items, "replies", "GCSS")
        ) : (
          <Stack alignItems="start" sx={{ ml: 2 }}>
            <Typography variant="subtitle2" color="initial">
              GCSS 발송 회신: 모두 읽음 ✔️
            </Typography>
          </Stack>
        )
      ) : (
        ""
      )}
      {chk_req ? (
        icare_req_items.length > 0 ? (
          MyList(icare_req_items, "requests")
        ) : (
          <Stack alignItems="start" sx={{ ml: 2 }}>
            <Typography variant="subtitle2" color="initial">
              ICare 도착 문의: 모두 읽음 ✔️
            </Typography>
          </Stack>
        )
      ) : (
        ""
      )}
      {workflow_items.length > 0 ? (
        MyList(workflow_items)
      ) : (
        <Stack alignItems="start" sx={{ ml: 2 }}>
          <Typography variant="subtitle2" color="initial">
            iCare 발송 회신: 모두 읽음 ✔️
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}

export default PopUpApp;
