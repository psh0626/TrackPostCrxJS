import React, { useEffect, useRef } from "react";
import { useState } from "react";
import { PostElement, PostAPI } from "../../src/lib/PostUtil";
import PopupTrack from "../../src/lib/PopupTrack";
import { COMMANDS, Msg, SendRequest } from "../../src/lib/Message";

import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Button from "@mui/material/Button";
import { InfoTextField, StyledTextField } from "../custom/components";

function SidePanelApp() {
  // State for PostElement
  const [post_element, set_post_element] = useState(new PostElement());
  const [item_id_field, set_item_id_field] = useState("");
  const [is_valid, set_is_valid] = useState(true);
  const textfield_ref = useRef<HTMLInputElement>(null);

  const FetchPostItem = async (id: string) => {
    set_post_element(new PostElement({ ItemID: id }));
    if (id) set_post_element(await PostAPI.FetchPostElement(id)); // Update the state with the fetched PostElement
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
  const track_from_popup = async (popup: PopupTrack) => {
    console.log("tracking attempt:", item_id_field, popup, post_element);

    if (popup && popup.IsTracked) {
      set_item_id_field(popup.ItemId);
      console.log("item id set", popup);
      FetchPostItem(popup.ItemId);
      console.log("item fetched");
    }
  };

  const check_popup = async () => {
    const popup = await SendRequest<PopupTrack>(new Msg(COMMANDS.SIDEPANEL_TRACK_REQUEST));
    console.log("response received: ", popup);
    return popup;
  };

  useEffect(() => {
    check_popup().then((p) => track_from_popup(p));
    if (textfield_ref.current) {
      textfield_ref.current.focus();
    }
  }, []);

  return (
    <Stack spacing={0} margin={5}>
      <StyledTextField
        inputRef={textfield_ref}
        variant="outlined"
        label="Tracking Number"
        value={item_id_field}
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
            FetchPostItem(item_id_field);
          }
          return true;
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
          <Accordion
            disableGutters
            expanded={post_element.ItemTracked}
            style={{ margin: "10px 0 0 0" }}>
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              <Typography variant="h6">Sender</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <InfoTextField
                  label_text="Name"
                  binding_value={post_element.SenderName}
                  binding_shrink={post_element.ItemTracked}
                />
                <InfoTextField
                  label_text="Phone"
                  binding_value={post_element.SenderPhone}
                  binding_shrink={post_element.ItemTracked}
                />
                <InfoTextField
                  label_text="Address"
                  binding_value={post_element.SenderAddress}
                  binding_shrink={post_element.ItemTracked}
                  multiline={true}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters expanded={post_element.ItemTracked}>
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              <Typography variant="h6">Addressee</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <InfoTextField
                  label_text="Name"
                  binding_value={post_element.AddresseeName}
                  binding_shrink={post_element.ItemTracked}
                />
                <InfoTextField
                  label_text="Phone"
                  binding_value={post_element.AddresseePhone}
                  binding_shrink={post_element.ItemTracked}
                />
                <InfoTextField
                  label_text="Address"
                  binding_value={post_element.AddresseeAddress}
                  binding_shrink={post_element.ItemTracked}
                  multiline={true}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
          {post_element.ItemTracked && (
            <Typography variant="body2" textAlign="center" margin="12px 0">
              접 수 일: {post_element.ApplicationDate} <br />
              {/* 배달완료종적: {post_element.DeliveryResult ? "있음" : "없음"} <br /> */}
              조사청구여부: {post_element.InquiryRequested ? "청구함" : "미청구"} <br />
            </Typography>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

export default SidePanelApp;
