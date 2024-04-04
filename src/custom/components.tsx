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
  
  const OpenAll = async () => {
    let tabids: number[] = [];
    items.forEach(async (wf) => {
      const tab = await chrome.tabs.create({ url: wf.link });
      tabids.push(tab.id!);
    });
    const new_group = await chrome.tabs.group({ tabIds: tabids });
    await chrome.tabGroups.update(new_group, { title: "Icare Unread Replies" });
  };
  
  return (
    <List>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body1" fontWeight="300" textAlign="center">
            Unread Replies
          </Typography>
        </AccordionSummary>
        {items.map((item: WorkflowItem) => {
          const primary_string = `L${item.current_level} ${item.workflow_status} (${item.requesting_op.substring(0, 2)} 🡢 ${item.replying_op.substring(0, 2)})`;
          const ItemClicked = async () => {
            const current_tab = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            await chrome.tabs.create({ index: current_tab[0].index + 1, url: item.link });
          };
          return (
            <Stack>
              <AccordionDetails>
                <Card style={{ margin: "0 0 1px" }}>
                  <ListItem dense={true} disablePadding={true} key={item.tracking_id}>
                    <ListItemButton onClick={ItemClicked}>
                      <ListItemIcon>
                        <OpenInBrowser />
                      </ListItemIcon>
                      <ListItemText primary={primary_string} secondary={`${item.tracking_id}`} />
                    </ListItemButton>
                  </ListItem>
                </Card>
              </AccordionDetails>
            </Stack>
          );
        })}
        <Stack alignItems="center">
          <Button variant="outlined" onClick={OpenAll}>
            Open All in New Tabs
          </Button>
        </Stack>
      </Accordion>
    </List>
  );
}
