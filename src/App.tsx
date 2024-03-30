import React from "react";
import { useState } from "react";
import { PostElement, PostAPI } from "./lib/PostUtil";

import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";

function App() {
  // State for PostElement
  const [post_element, set_post_element] = useState(new PostElement());

  // Tracking number state (you might want to bind this as well)
  const [item_id_field, set_item_id_field] = useState("");

  const [is_valid, set_is_valid] = useState(true);

  const FetchPostItem = async () => {
    set_post_element(new PostElement({ ItemID: item_id_field }));
    if (item_id_field) set_post_element(await PostAPI.FetchPostElement(item_id_field)); // Update the state with the fetched PostElement
  };

  const CheckValue = (target: HTMLInputElement | HTMLTextAreaElement) => {
    const pretty_value = target.value.trim().toUpperCase();
    set_item_id_field(pretty_value); // Update
    if (pretty_value === "") {
      set_is_valid(true);
    } else {
      set_is_valid(target.validity.valid);
    }
  };

  interface InfoFieldType {
    label_text: string;
    binding: string;
    multiline?: boolean;
  }
  const InfoTextField: React.FC<InfoFieldType> = ({ label_text, binding, multiline }) => {
    const TextFieldFocused = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
      navigator.clipboard.writeText(e.target.value);
    };

    return (
      <TextField
        variant="outlined"
        size="small"
        value={binding}
        label={label_text}
        onFocus={TextFieldFocused}
        InputLabelProps={{ shrink: post_element.ItemTracked }}
        inputProps={{ style: { fontSize: "14px" } }}
        multiline={multiline}></TextField>
    );
  };
  const StyledTextField = styled(TextField)({
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
  return (
    <Stack spacing={0} margin={5}>
      <StyledTextField
        variant="outlined"
        label="Tracking Number"
        value={item_id_field}
        error={!is_valid}
        onFocus={(e) => e.target.select()}
        inputProps={{
          style: { textTransform: "uppercase", textAlign: "center"},
          maxLength: 13,
          pattern: String.raw`[a-zA-Z]{2}\d{9}[a-zA-Z]{2}`,
        }}
        InputLabelProps={{
          style: {textAlign: "center"}
        }}
        FormHelperTextProps={
          {
            style: {textAlign: "center"}
          }
        }
        helperText={is_valid ? " " : "Invalid Tracking Number"}
        onChange={(e) => CheckValue(e.target)}
        onKeyUp={(e) => {
          if (e.key === "Enter" && is_valid) {
            FetchPostItem();
          }
        }}
      />
      <Divider style={{ margin: "15px 0" }} />

      <Card>
        <Stack spacing={0}>
          {post_element.ItemTracked && (
            <Stack spacing={0.5} margin="6px 0">
              <Button
                variant="outlined"
                onClick={(e) => {
                  navigator.clipboard.writeText(post_element.AddresseeZipcode);
                }}>
                {`${post_element.Destination} (${post_element.AddresseeZipcode})`}
              </Button>

              <Button
                variant="outlined"
                onClick={(e) => {
                  navigator.clipboard.writeText(post_element.Contents);
                }}>
                {`Contents: ${post_element.Contents}`}
              </Button>
            </Stack>
          )}
          <Accordion disableGutters expanded={post_element.ItemTracked} style={{ margin: "10px 0 0 0" }}>
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              <Typography variant="h6">Sender</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <InfoTextField label_text="Name" binding={post_element.SenderName} />
                <InfoTextField label_text="Phone" binding={post_element.SenderPhone} />
                <InfoTextField label_text="Address" binding={post_element.SenderAddress} multiline={true} />
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
                <InfoTextField label_text="Address" binding={post_element.AddresseeAddress} multiline={true} />
              </Stack>
            </AccordionDetails>
          </Accordion>
          {post_element.ItemTracked && (
            <Typography variant="body2" textAlign="center" margin="12px 0">
              접 수 일: {post_element.ApplicationDate} <br />
              배달완료종적: {post_element.DeliveryResult ? "있음" : "없음"} <br />
              조사청구여부: {post_element.InquiryRequested ? "청구함" : "미청구"} <br />
            </Typography>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

export default App;
