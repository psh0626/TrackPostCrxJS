import { ExpandMore, OpenInBrowser } from "@mui/icons-material";
import {
  Accordion,
  AccordionSummary,
  Button,
  Card,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  AccordionDetails,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import { GcssItem, WorkflowItem } from "../../src/background/GetUnreadReplies/DataWrapper";
import React from "react";

export const StyledTextField = styled(TextField)({
  "& .MuiInputLabel-root": {
    right: 0,
    textAlign: "center",
  },
  "& .MuiInputLabel-shrink": {
    margin: "0 auto",
    position: "absolute",
    right: "0",
    left: "0",
    top: "-3px",
    width: "150px", // Need to give it a width so the positioning will work
    background: "white", // Add a white bg
    // display: "none" //if you want to hide it completly
  },
  "& .MuiOutlinedInput-root.Mui-focused": {
    "& legend ": {
      display: "none", // If you want it then you need to position it similar with above
    },
  },
});

interface InfoFieldType {
  label_text: string;
  binding_value: string;
  binding_shrink: boolean;
  multiline?: boolean;
}
export const InfoTextField: React.FC<InfoFieldType> = ({
  label_text,
  binding_value,
  binding_shrink,
  multiline,
}) => {
  const TextFieldFocused = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    navigator.clipboard.writeText(e.target.value);
  };
  return (
    <TextField
      variant="outlined"
      size="small"
      value={binding_value}
      label={label_text}
      onFocus={TextFieldFocused}
      InputLabelProps={{ shrink: binding_shrink }}
      inputProps={{ style: { fontSize: "14px" } }}
      multiline={multiline}
    />
  );
};
export function MyList(
  items: WorkflowItem[] | GcssItem[],
  type: "replies" | "requests" = "replies",
  service: "GCSS" | "iCare" = "iCare"
) {
  const list_title = type === "replies" ? service + " - 발송 회신" : " - 도착 문의";

  const OpenNewTab = async (urlLink: string) => {
    const current_tab = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return await chrome.tabs.create({
      index: current_tab[0].index + 1,
      url: urlLink,
      active: false,
    });
  };

  const OpenAll = async () => {
    const tabPromises = items.map(async (wf) => {
      let tab: chrome.tabs.Tab;
      if (service === "GCSS") tab = await OpenNewTab((wf as GcssItem).WorkflowLink);
      else tab = await OpenNewTab(wf.link);

      if (tab && tab.id) {
        console.log("tab id push to tabids: ", tab.id);
        return tab.id; // Return the tab ID to be collected
      }
      return -1; // Return -1 for any tab that couldn't be opened
    });

    const tab_ids = (await Promise.all(tabPromises)).filter((id) => id !== -1); // Filter out any -1
    console.log("tab ids: ", tab_ids);

    if (tab_ids.length > 0) {
      const newGroup = await chrome.tabs.group({ tabIds: tab_ids });
      await chrome.tabGroups.update(newGroup, {
        title: list_title,
        color: "orange",
        collapsed: true,
      });
    }
  };

  return (
    <List>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body1" fontWeight="600" textAlign="center">
            {list_title + `: ${items.length}건`}
          </Typography>
        </AccordionSummary>
        <Stack alignItems="end">
          <Button
            variant="outlined"
            size="small"
            onClick={async () => await OpenAll()}
            sx={{ mr: 2 }}>
            Open All
          </Button>
        </Stack>
        <AccordionDetails>
          {items.map((item, id) => {
            let primary_string: string;
            if (service === "iCare") {
              primary_string = `L${item.current_level} ${item.workflow_status === "Replied" ? "발송" : "도착"} ${item.tracking_id.slice(-2) === "KR" ? "(" + item.replying_op.substring(0, 2) + ")" : ""}`;
            } else {
              const i = item as GcssItem;
              primary_string = `${i.WorkflowLevel} ${i.OriginCountry === "KR" ? "발송 " + `${i.DestinationCountry}` : "도착"}`;
            }

            return (
              <Card style={{ margin: "0 0 1px" }}>
                <ListItem dense={true} disablePadding={true} key={id}>
                  <ListItemButton
                    onClick={async () =>
                      service === "iCare"
                        ? await OpenNewTab(item.link)
                        : await OpenNewTab(item.WorkflowLink)
                    }>
                    <ListItemIcon>
                      <OpenInBrowser />
                    </ListItemIcon>
                    <ListItemText
                      primary={primary_string}
                      secondary={service === "iCare" ? `${item.tracking_id}` : `${item.ItemId}`}
                    />
                  </ListItemButton>
                </ListItem>
              </Card>
            );
          })}
        </AccordionDetails>
      </Accordion>
    </List>
  );
}
