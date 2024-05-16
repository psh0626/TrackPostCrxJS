import React, { ChangeEvent } from "react";

import { Add, ArrowDownward, ArrowUpward, Height, TravelExplore } from "@mui/icons-material";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  Divider,
  Fab,
  Paper,
  Stack,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Icon,
  Grid,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { IMICSettings, PersonalRemark } from "../../src/lib/OptionElement";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}>
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}
export default function OptionsApp() {
  const settings = useRef(new IMICSettings());
  const initialized = useRef(false);

  const [tab_value, set_tab_value] = useState(0);

  const [dl_opened, set_dl_opened] = useState(false);
  const [dl_title, set_dl_title] = useState("");
  const [dl_content, set_dl_content] = useState("");
  const [dl_editing, set_dl_editing] = useState(false);
  const [dl_current_id, set_dl_current_id] = useState(0);

  const [sl_selected, set_sl_selected] = useState("REQ");

  const [pr_list, set_pr_list] = useState<PersonalRemark[]>([]);
  const [chk_icare_req, set_icare_req] = useState(false);

  function onDlClosed() {
    set_dl_title("");
    set_dl_content("");
    set_dl_editing(false);
    set_dl_opened(false);
  }
  function onDlCancelled() {
    onDlClosed();
  }
  async function onDlSaved() {
    if (dl_title.trim() === "" || dl_content.trim() === "") {
      alert("빈 칸은 저장할 수 없습니다.");
      return;
    }
    set_pr_list((prev) =>
      prev.concat(new PersonalRemark(dl_title, dl_content, pr_list.length + 1, sl_selected))
    );
    onDlClosed();
  }

  function onCardClicked(remark: PersonalRemark) {
    set_dl_title(remark.Title);
    set_dl_content(remark.Content);
    set_dl_current_id(remark.Id);
    set_dl_editing(true);
    set_dl_opened(true);
  }

  async function onDlRemoved() {
    set_pr_list((prev) =>
      prev.filter((entry) => entry.Section === sl_selected && entry.Id !== dl_current_id)
    );
    RenumberPrList();
    await SaveSettings();
    onDlCancelled();
  }

  async function onDlEdited() {
    set_pr_list((prev) =>
      prev.filter((entry) => entry.Section === sl_selected && entry.Id !== dl_current_id)
    );
    set_pr_list((prev) =>
      prev.concat(new PersonalRemark(dl_title, dl_content, dl_current_id, sl_selected))
    );
    SortPRList();
    await SaveSettings();
    onDlCancelled();
  }
  function RenumberPrList() {
    set_pr_list((prev) =>
      prev.map(
        (item, index) => new PersonalRemark(item.Title, item.Content, index + 1, item.Section)
      )
    );
  }
  function SortPRList() {
    set_pr_list((prev) => prev.sort((a, b) => a.Id - b.Id));
  }

  function MoveUp(index: number) {
    if (index === 1) return; // Already at the top
    set_pr_list((prev) => {
      const newList = [...prev];
      [newList[index - 2], newList[index - 1]] = [newList[index - 1], newList[index - 2]];
      return newList.map((item, idx) => ({ ...item, Id: idx + 1 }));
    });
  }

  function MoveDown(index: number) {
    if (index === pr_list.length) return; // Already at the bottom
    set_pr_list((prev) => {
      const newList = [...prev];
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      return newList.map((item, idx) => ({ ...item, Id: idx + 1 }));
    });
  }

  async function SaveSettings() {
    settings.current.IcareUnreadRequests = chk_icare_req;
    settings.current.PersonalRemarks = pr_list;
    console.log("settings - ", settings.current);
    await settings.current.SaveOptions();
  }

  function onSelectChanged(event: SelectChangeEvent) {
    set_sl_selected(event.target.value);
  }

  async function onCheckboxChanged(event: ChangeEvent, checked: boolean) {
    set_icare_req(checked);
  }

  useEffect(() => {
    (async () => {
      await settings.current.LoadOptions();
      set_pr_list(settings.current.PersonalRemarks);
      set_icare_req(settings.current.IcareUnreadRequests);
      setTimeout(() => {
        initialized.current = true;
      }, 1000);
    })();
  }, []);

  useEffect(() => {
    if (initialized.current) SaveSettings();
  }, [pr_list, chk_icare_req]);

  return (
    <Paper>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <TravelExplore sx={{ mr: 1 }} />
          <Typography variant="h6">IMIC TrackPost Extension Settings</Typography>
        </Toolbar>
      </AppBar>

      <Dialog open={dl_opened} onClose={onDlClosed}>
        <DialogTitle>
          <Typography variant="h5" fontWeight="600">
            Personal Remark
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack direction="column" width="45em" spacing={1.5}>
            <TextField
              autoFocus
              label="제목"
              variant="filled"
              color="primary"
              margin="none"
              size="small"
              value={dl_title}
              onChange={(e) => set_dl_title(e.target.value)}
            />
            <TextField
              multiline
              rows="6"
              label="내용"
              variant="outlined"
              color="primary"
              margin="none"
              size="small"
              value={dl_content}
              onChange={(e) => set_dl_content(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          {dl_editing ? (
            <div>
              <Button onClick={onDlRemoved} color="error" variant="contained" sx={{ mr: 45 }}>
                삭제
              </Button>
              <Button onClick={onDlEdited} color="primary" variant="contained">
                수정
              </Button>
            </div>
          ) : (
            <Button onClick={onDlSaved} color="primary" variant="contained">
              저장
            </Button>
          )}
          <Button onClick={onDlCancelled} color="primary" variant="contained">
            취소
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: "flex", flexGrow: 1, overflow: "auto", height: "88vh" }}>
        <Tabs
          variant="fullWidth"
          value={tab_value}
          onChange={(_e, n) => set_tab_value(n)}
          orientation="vertical"
          sx={{ borderRight: 1, borderColor: "divider" }}>
          <Tab label="General" />
          <Tab label="Personal Remarks" />
          <Tab label="Info" />
        </Tabs>
        <TabPanel value={tab_value} index={0}>
          <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
            <Typography variant="h4" fontWeight={500} color="initial" sx={{ width: 500 }}>
              기본 설정
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} variant="fullWidth" />
          <Grid container width={"100%"}>
            <Grid item xs>
              <FormControlLabel
                label="ICare 도착 문의 알림"
                control={
                  <Checkbox checked={chk_icare_req} onChange={onCheckboxChanged} color="primary" />
                }
              />
            </Grid>
            <Grid item xs></Grid>
          </Grid>
        </TabPanel>
        <TabPanel value={tab_value} index={1}>
          <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
            <Typography variant="h4" fontWeight={500} color="initial" sx={{ width: 500 }}>
              ICare Personal Remarks
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} variant="fullWidth" />
          <Stack direction="row-reverse" alignItems="end" spacing={3} marginBottom={3}>
            <Fab
              color="primary"
              variant="extended"
              size="small"
              sx={{ mb: 3 }}
              onClick={() => {
                set_dl_opened(true);
              }}>
              <Add />
            </Fab>
            <FormControl variant="outlined" fullWidth size="small">
              <InputLabel>Select Section</InputLabel>
              <Select
                defaultValue="REQ"
                label="Select Selection"
                value={sl_selected}
                onChange={onSelectChanged}>
                <MenuItem value="REQ">Request Remarks</MenuItem>
                <MenuItem value="REP">Reply Remarks</MenuItem>
                <MenuItem value="SUM">Update Remarks</MenuItem>
                <MenuItem value="NOQ">Notification Request Remarks</MenuItem>
                <MenuItem value="NOP">Notification Reply Remarks</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="column">
            {pr_list.length > 0 &&
              pr_list.map((pr) => {
                return (
                  pr.Section === sl_selected && (
                    <Card key={pr.Id} sx={{ mb: 2 }}>
                      <Stack direction="row">
                        <CardActionArea onClick={() => onCardClicked(pr)}>
                          <CardContent sx={{ minHeight: 120, width: 430 }}>
                            <Typography gutterBottom variant="h6" component="div">
                              {pr.Title}
                            </Typography>
                            <Divider sx={{ mt: 1, mb: 1 }} />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                              height={100}
                              overflow="auto">
                              {pr.Content}
                            </Typography>
                          </CardContent>
                        </CardActionArea>

                        <Stack direction="column">
                          <Button
                            variant="text"
                            size="small"
                            color="inherit"
                            sx={{ height: "100%", minWidth: 0, padding: "12px" }}
                            onClick={() => MoveUp(pr.Id)}>
                            <ArrowUpward />
                          </Button>
                          <Button
                            variant="text"
                            size="small"
                            color="inherit"
                            sx={{ height: "100%", minWidth: 0, padding: "12px" }}
                            onClick={() => MoveDown(pr.Id)}>
                            <ArrowDownward />
                          </Button>
                        </Stack>
                      </Stack>
                    </Card>
                  )
                );
              })}
          </Stack>
        </TabPanel>
        <TabPanel value={tab_value} index={2}></TabPanel>
      </Box>
    </Paper>
  );
}
