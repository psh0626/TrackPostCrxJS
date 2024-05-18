import React, { useEffect, useRef, useState } from "react";
import { AppBar, Toolbar, Typography, Paper, Box, Tab, Tabs } from "@mui/material";
import { TravelExplore } from "@mui/icons-material";
import { IMICSettings } from "../../src/lib/OptionElement";
import { GeneralSettings } from "./options_tabs/GeneralSettings";
import { PersonalRemarks } from "./options_tabs/PersonalRemarks";
import { ImportExport } from "./options_tabs/ImportExport";
import { TabPanel } from "./options_tabs/TabPanel";

export default function OptionsApp() {
  const settings = useRef(new IMICSettings());
  const initialized = useRef(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (!initialized.current) {
      (async () => {
        await settings.current.LoadOptions();
        console.log("settings loaded", settings.current);
        setTimeout(() => {
          initialized.current = true;
        }, 1000);
      })();
    }
  }, []);

  return (
    <Paper>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <TravelExplore sx={{ mr: 1 }} />
          <Typography variant="h6">IMIC TrackPost Extension Settings</Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flexGrow: 1, overflow: "auto", height: "88vh" }}>
        <Tabs
          variant="fullWidth"
          value={tabValue}
          onChange={(_e, n) => setTabValue(n)}
          orientation="vertical"
          sx={{ borderRight: 1, borderColor: "divider" }}>
          <Tab label="General" />
          <Tab label="Personal Remarks" />
          <Tab label="Import/Export" />
        </Tabs>
        <TabPanel value={tabValue} index={0}>
          <GeneralSettings settings={settings} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <PersonalRemarks settings={settings} />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <ImportExport settings={settings} />
        </TabPanel>
      </Box>
    </Paper>
  );
}
