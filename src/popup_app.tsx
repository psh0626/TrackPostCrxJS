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
import { WorkflowItem } from "./background/GetUnreadReplies/DataWrapper";
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
      set_workflow_items(dict.WORKFLOWS);
      console.log("workflows loaded from storage local: ", workflow_items);
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
      {workflow_items && (
        <List>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="body1" fontWeight="300" textAlign="center">
                Unread Replies
              </Typography>
            </AccordionSummary>
            {workflow_items.map((item) => {
              const wf = item as WorkflowItem;
              return (
                <Card style={{ margin: "0 0 1px" }}>
                  <ListItem
                    dense={true}
                    disablePadding={true}
                    key={wf.tracking_id}
                    secondaryAction={
                      <IconButton edge="end">
                        {" "}
                        <OpenInBrowser />{" "}
                      </IconButton>
                    }>
                    <ListItemButton>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          //checked={checked.indexOf(value) !== -1}
                          tabIndex={-1}
                          disableRipple
                          inputProps={{ "aria-labelledby": wf.tracking_id }}
                        />
                      </ListItemIcon>
                      <ListItemText primary={`L${wf.current_level} ${wf.workflow_status}`} secondary={`${wf.tracking_id}`} />
                    </ListItemButton>
                  </ListItem>
                </Card>
              );
            })}
          </Accordion>
        </List>
      )}
      <Button variant="contained" onClick={() => OpenSidePanel()}>
        사이드 패널 열기
      </Button>
    </Stack>
  );
}

export default PopUpApp;
