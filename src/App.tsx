import { useState } from "react";
import { parseStringPromise } from "xml2js";

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

class PostElement {
  ItemID: string = "";
  Contents: string = "";
  Destination: string = "";
  DestinationACR: string = "";
  SenderName: string = "";
  SenderPhone: string = "";
  SenderAddress: string = "";
  AddresseeName: string = "";
  AddresseePhone: string = "";
  AddresseeZipcode: string = "";
  AddresseeAddress: string = "";
  MailTypeCode: string = "";
  ApplicationDate: string = "";
  DeliveryResult: boolean = false; // Y or N
  InquiryRequested: boolean = false; // Y or N
  HEvent: boolean = false; // Y or N
  IEvent: boolean = false; // Y or N
  ItemTracked: boolean = false;

  // Constructor to facilitate instantiating with an object
  constructor(data?: Partial<PostElement>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}

async function xmlToPostElement(xml: string): Promise<PostElement> {
  try {
    const result = await parseStringPromise(xml, {
      explicitArray: false,
      ignoreAttrs: true,
      trim: true,
    });
    const data = result.xsync.LData; // Adjust based on your XML structure

    return new PostElement({
      ItemID: data.MAIL_NO,
      Contents: data.MAILCONT,
      Destination: data.ARRIV_NATION_NM,
      DestinationACR: data.ARRIV_NATION_CD,
      SenderName: data.SENDER_NM,
      SenderPhone: data.SENDER_TELNO,
      SenderAddress: data.SENDER_ADDR,
      AddresseeName: data.RECEIVER_NM,
      AddresseePhone: data.RECEIVER_TELNO,
      AddresseeZipcode: data.RECEIVER_ZIPCD,
      AddresseeAddress: data.RECEIVER_ADDR,
      MailTypeCode: data.FRNMAIL_DIV_CD,
      ApplicationDate: data.RECEVYMD,
      DeliveryResult: data.RESULTYN === "Y" ? true : false,
      InquiryRequested: data.REQYN === "Y" ? true : false,
      HEvent: data.HEVENT === "Y" ? true : false,
      IEvent: data.IEVENT === "Y" ? true : false,
      ItemTracked: true,
    });
  } catch (error) {
    console.error("Error parsing XML to object:", error);
    return new PostElement();
  }
}
function App() {
  // State for PostElement
  const [postElement, setPostElement] = useState(new PostElement());

  // Tracking number state (you might want to bind this as well)
  const [trackingNumber, setTrackingNumber] = useState("");

  const postURL = "https://ems.epost.go.kr/trace.RegisterEmsClaimAjax.postal";

  const fetchPostItem = async () => {
    try {
      const response = await fetch(postURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
        body: `POST_CODE=${trackingNumber}`,
      });

      if (!response.ok) {
        console.error(response.statusText);
        throw new Error(response.statusText);
      }

      const data = await response.text();
      const PostEntity = await xmlToPostElement(data);
      setPostElement(PostEntity); // Update the state with the fetched PostElement
    } catch (error) {
      console.error("Failed to fetch and parse PostEntity:", error);
    }
  };

  return (
    <Stack spacing={2} margin={5}>
      <TextField
        variant="outlined"
        label="Tracking Number"
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value.trim().toUpperCase())}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            fetchPostItem();
          }
        }}
      />
      <Button variant="contained" onClick={fetchPostItem}>
        SEARCH
      </Button>
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
                  value={postElement.SenderName}
                />
                <TextField
                  variant="outlined"
                  label="Sender Phone"
                  value={postElement.SenderPhone}
                />
                <TextField
                  variant="outlined"
                  label="Sender Address"
                  value={postElement.SenderAddress}
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
                  value={postElement.AddresseeName}
                />
                <TextField
                  variant="outlined"
                  label="Addressee Phone"
                  value={postElement.AddresseePhone}
                />
                <TextField
                  variant="outlined"
                  label="Addressee Address"
                  value={postElement.AddresseeAddress}
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
