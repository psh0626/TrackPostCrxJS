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
import { WorkflowItem } from "../background/GetUnreadReplies/DataWrapper";

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
export const InfoTextField: React.FC<InfoFieldType> = ({ label_text, binding_value, binding_shrink, multiline }) => {
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

export function MyList(items: WorkflowItem[]) {
  const OpenNewTab = async (urlLink: string) => {
    const current_tab = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return await chrome.tabs.create({ index: current_tab[0].index + 1, url: urlLink, active: false });
  };

  const OpenAll = async () => {
    const tabPromises = items.map(async (wf) => {
      const tab = await OpenNewTab(wf.link);
      if (tab && tab.id) {
        console.log("tab id push to tabids: ", tab.id);
        return tab.id; // Return the tab ID to be collected
      }
      return null; // Return null for any tab that couldn't be opened
    });

    const tab_ids = (await Promise.all(tabPromises)).filter((id) => id !== null); // Filter out any nulls
    console.log("tab ids: ", tab_ids);

    if (tab_ids.length > 0) {
      const newGroup = await chrome.tabs.group({ tabIds: tab_ids });
      await chrome.tabGroups.update(newGroup, { title: "Icare Replies", color: "orange", collapsed: true });
    }
  };

  return (
    <List>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body1" fontWeight="300" textAlign="center">
            Unread Replies
          </Typography>
        </AccordionSummary>
        <Stack alignItems="end">
          <Button variant="outlined" size="small" onClick={async () => await OpenAll()} sx={{ mr: 2 }}>
            Open All
          </Button>
        </Stack>
        <AccordionDetails>
          {items.map((item: WorkflowItem, id) => {
            const primary_string = `L${item.current_level} ${item.workflow_status} (${item.requesting_op.substring(0, 2)} 🡢 ${item.replying_op.substring(0, 2)})`;

            return (
              <Card style={{ margin: "0 0 1px" }}>
                <ListItem dense={true} disablePadding={true} key={id}>
                  <ListItemButton onClick={async () => await OpenNewTab(item.link)}>
                    <ListItemIcon>
                      <OpenInBrowser />
                    </ListItemIcon>
                    <ListItemText primary={primary_string} secondary={`${item.tracking_id}`} />
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
