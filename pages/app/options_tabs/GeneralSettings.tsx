import React, { useEffect, useRef, useState } from "react";
import { Checkbox, Divider, FormControlLabel, Grid, Stack, Typography } from "@mui/material";
import { TabPanel } from "./TabPanel";
import { IMICSettings } from "../../../src/lib/OptionElement";

interface GeneralSettingsProps {
  settings: React.MutableRefObject<IMICSettings>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings }) => {
  const [chkIcareReq, setChkIcareReq] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      setChkIcareReq(settings.current.IcareUnreadRequests);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) SaveSettings();
    else initialized.current = true;
  }, [chkIcareReq]);

  async function SaveSettings() {
    settings.current.IcareUnreadRequests = chkIcareReq;
    await settings.current.SaveOptions();
  }

  function onCheckboxChanged(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
    setChkIcareReq(checked);
  }

  return (
    <div>
      <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={100} color="initial" sx={{ width: 500 }}>
          기본 설정
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} variant="fullWidth" />
      <Grid container width={"100%"}>
        <Grid item xs>
          <FormControlLabel
            label="ICare 도착 문의 알림"
            control={
              <Checkbox checked={chkIcareReq} onChange={onCheckboxChanged} color="primary" />
            }
          />
        </Grid>
        <Grid item xs></Grid>
      </Grid>
    </div>
  );
};
