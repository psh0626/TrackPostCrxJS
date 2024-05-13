import React from "react";

import { Add, Height, TravelExplore } from "@mui/icons-material";
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

  const [pr_list, set_pr_list] = useState<PersonalRemark[]>([]);

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
      prev.concat(new PersonalRemark(dl_title, dl_content, pr_list.length + 1))
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
    set_pr_list((prev) => prev.filter((entry) => entry.Id !== dl_current_id));
    RenumberPrList();
    await SaveSettings();
    onDlCancelled();
  }

  async function onDlEdited() {
    set_pr_list((prev) => prev.filter((entry) => entry.Id !== dl_current_id));
    set_pr_list((prev) => prev.concat(new PersonalRemark(dl_title, dl_content, dl_current_id)));
    SortPRList();
    await SaveSettings();
    onDlCancelled();
  }
  function RenumberPrList() {
    set_pr_list((prev) =>
      prev.map((item, index) => new PersonalRemark(item.Title, item.Content, index + 1))
    );
  }
  function SortPRList() {
    set_pr_list((prev) => prev.sort((a, b) => a.Id - b.Id));
  }

  async function SaveSettings() {
    settings.current.PersonalRemarks = pr_list;
    console.log("settings - ", settings.current, "pr list - ", pr_list);
    await settings.current.SaveOptions();
  }

  useEffect(() => {
    (async () => {
      await settings.current.LoadOptions();
      set_pr_list(settings.current.PersonalRemarks);
      initialized.current = true;
    })();
  }, []);

  useEffect(() => {
    if (initialized.current) SaveSettings();
  }, [pr_list]);

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
          <Tab label="Personal Remarks" />
          <Tab label="Info" />
        </Tabs>
        <TabPanel value={tab_value} index={0}>
          <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
            <Typography variant="h4" fontWeight={700} color="initial" sx={{ width: 500 }}>
              ICare Personal Remarks
            </Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} variant="fullWidth" />
          <Stack alignItems="end">
            <Fab
              color="primary"
              variant="extended"
              size="small"
              sx={{ mb: 3 }}
              onClick={() => {
                set_dl_opened(true);
              }}>
              <Add sx={{ mr: 1 }} />
              <Typography sx={{ mr: 1 }} variant="body2">
                템플릿 추가
              </Typography>
            </Fab>
          </Stack>
          <Stack direction="column">
            {pr_list.length > 0 &&
              pr_list.map((pr) => {
                return (
                  <Card key={pr.Id} sx={{ mb: 1 }}>
                    <CardActionArea onClick={() => onCardClicked(pr)}>
                      <CardContent sx={{ minHeight: 120 }}>
                        <Typography gutterBottom variant="h5" component="div">
                          {pr.Title}
                        </Typography>
                        <Divider sx={{ mt: 2, mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {pr.Content}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
          </Stack>
        </TabPanel>
        <TabPanel value={tab_value} index={1}></TabPanel>
      </Box>
    </Paper>
  );
}
