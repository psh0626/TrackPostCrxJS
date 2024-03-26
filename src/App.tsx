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
import InputLabel from "@mui/material/InputLabel";

function App() {
  // State for PostElement
  const [post_element, set_post_element] = useState(new PostElement());

  // Tracking number state (you might want to bind this as well)
  const [item_id_field, set_item_id_field] = useState("");

  const [is_valid, set_is_valid] = useState(true);

  const FetchPostItem = async () => {
    const blankElm = new PostElement({ItemID: item_id_field});
    set_post_element(blankElm);
    set_post_element(await PostAPI.FetchPostElement(item_id_field)); // Update the state with the fetched PostElement
  };

  const CheckValue = (target: any) => {
    const pretty_value = target.value.trim().toUpperCase();
    set_item_id_field(pretty_value); // Update
    set_is_valid(target.validity.valid);
  };
  interface InfoFieldType{
    label_text: string;
    binding: string;
  }
  const InfoTextField: React.FC<InfoFieldType> = ({label_text, binding}) => {
    return (
      <TextField 
        variant="outlined"
        size="small"
        label={label_text}
        value={binding}
        InputLabelProps={ {shrink: post_element.ItemTracked} } ></TextField>
    );
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
        helperText={is_valid ? " " : "Invalid Tracking Number"}
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
          <Accordion disableGutters expanded={post_element.ItemTracked}>
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              <Typography variant="h6">Sender</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <InfoTextField label_text="Name" binding={post_element.SenderName} />
                <InfoTextField label_text="Phone" binding={post_element.SenderPhone} />
                <InfoTextField label_text="Address" binding={post_element.SenderAddress} />
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters expanded={post_element.ItemTracked}>
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              <Typography variant="h6">Addressee</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <InfoTextField label_text="Name" binding={post_element.AddresseeName} />
                <InfoTextField label_text="Phone" binding={post_element.AddresseePhone} />
                <InfoTextField label_text="Address" binding={post_element.AddresseeAddress} />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </Card>
    </Stack>
  );
}

export default App;
