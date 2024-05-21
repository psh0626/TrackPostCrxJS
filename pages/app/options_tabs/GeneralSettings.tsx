import React, { useEffect, useRef, useState } from "react";
import {
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Typography,
  TextField,
} from "@mui/material";
import { TabPanel } from "./TabPanel";
import { IMICSettings } from "../../../src/lib/OptionElement";

interface GeneralSettingsProps {
  settings: React.MutableRefObject<IMICSettings>
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings }) => {
  const [chkIcareReq, setChkIcareReq] = useState(false);
  const [chkGcssReq, setChkGcssReq] = useState(false);
  const [chkGcssRep, setChkGcssRep] = useState(false);
  const [gcssAuthor, setGcssAuthor] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      console.log("GENERAL SETTINGS INITIALIZING: ", initialized);
      setChkIcareReq(settings.current.IcareUnreadRequests);
      setChkGcssRep(settings.current.GcssUnreadReplies);
      setChkGcssReq(settings.current.GcssUnreadRequests);
      setGcssAuthor(settings.current.GcssAuthor);
    }
  }, []);

  useEffect(() => {
    console.log("CHECK ICARE REQ", chkIcareReq);
    if (initialized.current) {
      SaveSettings();
      console.log("GENERALSETTINGS SAVE SETTINGS: ", initialized.current);
    } else initialized.current = true;
  }, [chkIcareReq, chkGcssRep, chkIcareReq, gcssAuthor]);

  async function SaveSettings() {
    settings.current.IcareUnreadRequests = chkIcareReq;
    settings.current.GcssUnreadRequests = chkGcssReq;
    settings.current.GcssUnreadReplies = chkGcssRep;
    settings.current.GcssAuthor = gcssAuthor;
    await settings.current.SaveOptions();
  }

  function onCheckboxChanged(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
    setChkIcareReq(checked);
  }

  return (
    <div>
      <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={100} color="initial">
          기본 설정
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} variant="fullWidth" />
      <Stack spacing={4} sx={{ width: 500 }}>
        <Paper sx={{ p: 3 }}>
          <Grid container width="100%" rowSpacing={1}>
            <Grid item xs={12}>
              <Typography variant="h5" fontWeight={100}>
                iCare
              </Typography>
              <Divider sx={{ mt: 1, mb: 2 }} />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                label="iCare 도착 문의 알림"
                control={
                  <Checkbox checked={chkIcareReq} onChange={onCheckboxChanged} color="primary" />
                }
              />
            </Grid>
            <Grid item xs={6}></Grid>
          </Grid>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Grid container width="100%" rowSpacing={1}>
            <Grid item xs={12}>
              <Typography variant="h5" fontWeight={100}>
                GCSS
              </Typography>
              <Divider sx={{ mt: 1, mb: 2 }} />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                label="GCSS 도착 문의 알림"
                control={
                  <Checkbox
                    checked={chkGcssReq}
                    onChange={(e, c) => setChkGcssReq(c)}
                    color="primary"
                  />
                }
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                label="GCSS 발송 회신 알림"
                control={
                  <Checkbox
                    checked={chkGcssRep}
                    onChange={(e, c) => setChkGcssRep(c)}
                    color="primary"
                  />
                }
              />
            </Grid>
            {chkGcssRep ? (
              <Grid item xs={12}>
                <Divider sx={{ marginY: 2 }} />
                <Stack direction="row" alignItems="end" justifyContent="end">
                  <Typography
                    textAlign="center"
                    fontWeight={700}
                    sx={{ mr: 2 }}
                    variant="subtitle1">
                    검색할 작성자:
                  </Typography>
                  <TextField
                    label="author"
                    size="small"
                    variant="standard"
                    value={gcssAuthor}
                    onChange={(e) => setGcssAuthor(e.target.value)}
                  />
                </Stack>
                <Typography textAlign="end" fontWeight={100} sx={{ mt: 2 }} variant="subtitle2">
                  * 대소문자 구분 없음 <br />* 일부만 입력 가능 (예: Sunghoon Park -{">"} sung){" "}
                  <br />
                  * 여러명 입력 가능 (예: sung, mi, kim) <br />
                </Typography>
              </Grid>
            ) : (
              ""
            )}
          </Grid>
        </Paper>
      </Stack>
    </div>
  );
};
