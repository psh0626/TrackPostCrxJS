import React, { useState, useEffect, useRef } from "react";
import { Add, ArrowDownward, ArrowUpward } from "@mui/icons-material";
import {
  Card,
  CardActionArea,
  CardContent,
  Divider,
  Fab,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Button,
  SelectChangeEvent,
} from "@mui/material";

import { TabPanel } from "./TabPanel";
import { RemarkDialog } from "./PRDialog";
import { IMICSettings, PersonalRemark } from "../../../src/lib/OptionElement";

interface PersonalRemarksProps {
  settings: React.MutableRefObject<IMICSettings>;
}

export const PersonalRemarks: React.FC<PersonalRemarksProps> = ({ settings }) => {
  const [dlOpened, setDlOpened] = useState(false);
  const [dlTitle, setDlTitle] = useState("");
  const [dlContent, setDlContent] = useState("");
  const [dlEditing, setDlEditing] = useState(false);
  const [dlCurrentId, setDlCurrentId] = useState(0);
  const [slSelected, setSlSelected] = useState("REQ");
  const [prList, setPrList] = useState<PersonalRemark[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) setPrList(settings.current.PersonalRemarks);
  }, []);

  useEffect(() => {
    if (initialized.current) SaveSettings();
    else initialized.current = true;
  }, [prList]);

  function onDlClosed() {
    setDlTitle("");
    setDlContent("");
    setDlEditing(false);
    setDlOpened(false);
  }

  function onDlCancelled() {
    onDlClosed();
  }

  async function onDlSaved() {
    if (dlTitle.trim() === "" || dlContent.trim() === "") {
      alert("빈 칸은 저장할 수 없습니다.");
      return;
    }
    setPrList((prev) =>
      prev.concat(new PersonalRemark(dlTitle, dlContent, prList.length + 1, slSelected))
    );
    onDlClosed();
  }

  function onCardClicked(remark: PersonalRemark) {
    setDlTitle(remark.Title);
    setDlContent(remark.Content);
    setDlCurrentId(remark.Id);
    setDlEditing(true);
    setDlOpened(true);
  }

  async function onDlRemoved() {
    setPrList((prev) =>
      prev.filter((entry) => entry.Section === slSelected && entry.Id !== dlCurrentId)
    );
    RenumberPrList();
    await SaveSettings();
    onDlCancelled();
  }

  async function onDlEdited() {
    setPrList((prev) =>
      prev.filter((entry) => entry.Section === slSelected && entry.Id !== dlCurrentId)
    );
    setPrList((prev) =>
      prev.concat(new PersonalRemark(dlTitle, dlContent, dlCurrentId, slSelected))
    );
    SortPrList();
    await SaveSettings();
    onDlCancelled();
  }

  function RenumberPrList() {
    setPrList((prev) =>
      prev.map(
        (item, index) => new PersonalRemark(item.Title, item.Content, index + 1, item.Section)
      )
    );
  }

  function SortPrList() {
    setPrList((prev) => prev.sort((a, b) => a.Id - b.Id));
  }

  function MoveUp(index: number) {
    if (index === 1) return; // Already at the top
    setPrList((prev) => {
      const newList = [...prev];
      [newList[index - 2], newList[index - 1]] = [newList[index - 1], newList[index - 2]];
      return newList.map((item, idx) => ({ ...item, Id: idx + 1 }));
    });
  }

  function MoveDown(index: number) {
    if (index === prList.length) return; // Already at the bottom
    setPrList((prev) => {
      const newList = [...prev];
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      return newList.map((item, idx) => ({ ...item, Id: idx + 1 }));
    });
  }

  async function SaveSettings() {
    settings.current.PersonalRemarks = prList;
    await settings.current.SaveOptions();
  }

  function onSelectChanged(event: SelectChangeEvent) {
    setSlSelected(event.target.value as string);
  }

  return (
    <div>
      <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={100} color="initial" sx={{ width: 500 }}>
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
            setDlOpened(true);
          }}>
          <Add />
        </Fab>
        <FormControl variant="outlined" fullWidth size="small">
          <InputLabel>Select Section</InputLabel>
          <Select
            defaultValue="REQ"
            label="Select Selection"
            value={slSelected}
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
        {prList.length > 0 &&
          prList.map((pr) => {
            return (
              pr.Section === slSelected && (
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

      <RemarkDialog
        open={dlOpened}
        title={dlTitle}
        content={dlContent}
        editing={dlEditing}
        onTitleChange={(e) => setDlTitle(e.target.value)}
        onContentChange={(e) => setDlContent(e.target.value)}
        onSave={onDlSaved}
        onEdit={onDlEdited}
        onRemove={onDlRemoved}
        onClose={onDlClosed}
        onCancel={onDlCancelled}
      />
    </div>
  );
};
