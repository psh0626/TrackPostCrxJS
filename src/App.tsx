import { useState } from "react";
import logo from "./logo.svg";
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

class XMLUtil {
  private xmlDocument: Document;

  constructor(xmlDocument: Document) {
    this.xmlDocument = xmlDocument;
  }

  getData(name: string): string {
    return this.xmlDocument.querySelector(name)?.textContent ?? "";
  }
}
function App() {
  const [count, setCount] = useState(0);
  const postURL = "https://ems.epost.go.kr/trace.RegisterEmsClaimAjax.postal";

  var boundText: string = "";
  const FetchPostItem = () =>
    fetch(postURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: `POST_CODE=${boundText}`,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.text();
      })
      .then((data) => {
        console.log(data);
        const parser = new DOMParser();
        const xmlDoc = new XMLUtil(parser.parseFromString(data, "text/xml"));

        console.log(xmlDoc.getData("MAIL_NO"));
      });
  return (
    <Stack spacing={2} margin={5}>
      <TextField
        variant="outlined"
        label="EB123456789KR"
        onChange={(e) => {
          boundText = e.target.value.toUpperCase();
        }}
      />
      <Button
        variant="contained"
        onClick={() => {
          FetchPostItem();
        }}
      >
        SEARCH
      </Button>
      <Divider classes={"ma-10"} />
      <Card>
        <Stack spacing={0.5}>
          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              <Typography variant="h5">Sender</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <TextField variant="outlined" />
                <TextField variant="outlined" />
                <TextField variant="outlined" />
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              <Typography variant="h5">Addressee</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <TextField variant="outlined" />
                <TextField variant="outlined" />
                <TextField variant="outlined" />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </Card>
    </Stack>
  );
}

export default App;
