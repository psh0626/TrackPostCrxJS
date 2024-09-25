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
import { ServiceTypes } from "../../../src/background/GetUnreadReplies/GcssReplies";

interface GeneralSettingsProps {
  settings: React.MutableRefObject<IMICSettings>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings }) => {
  const [chkIcareReq, setChkIcareReq] = useState(false);
  const [chkIcareRep, SetChkIcareRep] = useState(false);
  const [icareAuthor, setIcareAuthor] = useState<string[]>([]);
  const [chkGcssReq, setChkGcssReq] = useState(false);
  const [chkGcssRep, setChkGcssRep] = useState(false);
  const [gcssAuthor, setGcssAuthor] = useState<string[]>([]);
  const [gcssServiceTypes, setGcssServiceTypes] = useState<ServiceTypes[]>([ServiceTypes.EMS]);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      console.log("GENERAL SETTINGS INITIALIZING: ", initialized);
      SetChkIcareRep(settings.current.IcareUnreadReplies);
      setChkIcareReq(settings.current.IcareUnreadRequests);
      setIcareAuthor(settings.current.IcareAuthor);
      setChkGcssRep(settings.current.GcssUnreadReplies);
      setChkGcssReq(settings.current.GcssUnreadRequests);
      setGcssAuthor(settings.current.GcssAuthor);
      setGcssServiceTypes(settings.current.GcssServiceTypes);
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    console.log("CHECK ICARE REQ", chkIcareReq);
    if (initialized.current) {
      SaveSettings();
      console.log("GENERALSETTINGS SAVE SETTINGS: ", initialized.current);
    } else initialized.current = true;
  }, [chkIcareRep, chkIcareReq, icareAuthor, chkGcssRep, chkGcssReq, gcssAuthor, gcssServiceTypes]);

  async function SaveSettings() {
    settings.current.IcareUnreadReplies = chkIcareRep;
    settings.current.IcareUnreadRequests = chkIcareReq;
    settings.current.IcareAuthor = icareAuthor;
    settings.current.GcssUnreadRequests = chkGcssReq;
    settings.current.GcssUnreadReplies = chkGcssRep;
    settings.current.GcssAuthor = gcssAuthor;
    settings.current.GcssServiceTypes = gcssServiceTypes;
    await settings.current.SaveOptions();
  }

  function onCheckboxChanged(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
    setChkIcareReq(checked);
  }

  function TrimArray(str_arr: string[]) {
    const result = str_arr.map((item) => item.trim());
    return result;
  }

  function ToggleCheckService(type: ServiceTypes, checked: boolean) {
    if (checked) {
      if (gcssServiceTypes.includes(type)) return;
      setGcssServiceTypes((prev) => prev.concat(type));
    } else {
      if (!gcssServiceTypes.includes(type)) return;
      if (gcssServiceTypes.length === 1) setChkGcssRep(false);
      setGcssServiceTypes((prev) => prev.filter((el) => el !== type));
    }
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
            <Grid item xs={6}>
              <FormControlLabel
                label="iCare 발송 회신 알림"
                control={
                  <Checkbox
                    checked={chkIcareRep}
                    onChange={(e, c) => SetChkIcareRep(c)}
                    color="primary"
                  />
                }
              />
            </Grid>
            {chkIcareRep ? (
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
                    value={icareAuthor.join(", ")}
                    onChange={(e) => setIcareAuthor(TrimArray(e.target.value.split(",")))}
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
                    onChange={(e, c) => {
                      setChkGcssRep(c);
                      if (gcssServiceTypes.length < 1) setGcssServiceTypes([ServiceTypes.EMS]);
                    }}
                    color="primary"
                  />
                }
              />
            </Grid>
            {chkGcssRep ? (
              <Grid item xs={12}>
                <Divider sx={{ marginTop: 2 }} />
                <Stack direction="row" alignItems="end" justifyContent="space-evenly">
                  <FormControlLabel
                    label="EMS"
                    control={
                      <Checkbox
                        checked={gcssServiceTypes.includes(ServiceTypes.EMS)}
                        onChange={(e, c) => ToggleCheckService(ServiceTypes.EMS, c)}
                        color="error"
                      />
                    }
                  />

                  <FormControlLabel
                    label="Exprès/Tracked"
                    control={
                      <Checkbox
                        checked={gcssServiceTypes.includes(ServiceTypes.KPacket)}
                        onChange={(e, c) => ToggleCheckService(ServiceTypes.KPacket, c)}
                        color="error"
                      />
                    }
                  />

                  <FormControlLabel
                    label="REG"
                    control={
                      <Checkbox
                        checked={gcssServiceTypes.includes(ServiceTypes.Registered)}
                        onChange={(e, c) => ToggleCheckService(ServiceTypes.Registered, c)}
                        color="error"
                      />
                    }
                  />

                  <FormControlLabel
                    label="Parcels"
                    control={
                      <Checkbox
                        checked={gcssServiceTypes.includes(ServiceTypes.Parcel)}
                        onChange={(e, c) => ToggleCheckService(ServiceTypes.Parcel, c)}
                        color="error"
                      />
                    }
                  />
                </Stack>
                <Divider sx={{ marginTop: 0 }} />
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
                    value={gcssAuthor.join(", ")}
                    onChange={(e) => setGcssAuthor(TrimArray(e.target.value.split(",")))}
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
