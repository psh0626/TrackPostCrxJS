import { useState } from "react";
import { PostElement, PostAPI } from "./lib/PostUtil";

import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

function App() {
  // State for PostElement
  const [post_element, set_post_element] = useState(new PostElement());

  // Tracking number state (you might want to bind this as well)
  const [item_id_field, set_item_id_field] = useState("");

  const [is_valid, set_is_valid] = useState(false);

  const FetchPostItem = async () => {
    set_post_element(await PostAPI.FetchPostElement(item_id_field)); // Update the state with the fetched PostElement
  };

  const CheckValue = (target: any) => {
    const pretty_value = target.value.trim().toUpperCase();
    set_item_id_field(pretty_value); // Update
    set_is_valid(target.validity.valid);
  };

  return (
    <Stack spacing={2} margin={5}>
      <TextField
        variant="outlined"
        label="Tracking Number"
        value={item_id_field}
        error={!is_valid}
        inputProps={{
          style: { textTransform: "uppercase" },
          maxLength: 13,
          pattern: String.raw`[a-zA-Z]{2}\d{9}[a-zA-Z]{2}`,
        }}
        helperText="Invalid Tracking Number"
        onChange={(e) => CheckValue(e.target)}
        onKeyUp={(e) => {
          if (e.key === "Enter" && is_valid) {
            FetchPostItem();
          }
        }}
      />
      <Divider />
      <Card>
        <Stack spacing={0.5}>
          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              <Typography variant="h6">Sender</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <TextField
                  variant="outlined"
                  label="Sender Name"
                  value={post_element.SenderName}
                />
                <TextField
                  variant="outlined"
                  label="Sender Phone"
                  value={post_element.SenderPhone}
                />
                <TextField
                  variant="outlined"
                  label="Sender Address"
                  value={post_element.SenderAddress}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              <Typography variant="h6">Addressee</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <TextField
                  variant="outlined"
                  label="Addressee Name"
                  value={post_element.AddresseeName}
                />
                <TextField
                  variant="outlined"
                  label="Addressee Phone"
                  value={post_element.AddresseePhone}
                />
                <TextField
                  variant="outlined"
                  label="Addressee Address"
                  value={post_element.AddresseeAddress}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </Card>
    </Stack>
  );
}

export default App;
