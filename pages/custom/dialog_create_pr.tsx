import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import { FormEvent, useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
export default function CreatePersonalRemarks(open_state: boolean) {
  const [open, set_open] = useState(false);

  useEffect(() => {
    set_open(open_state);
  }, []);

  const on_close = () => {
    set_open(false);
  };

  const on_save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formJson = Object.fromEntries((formData as any).entries());
    console.log(formJson);
    const title = formJson.title;
    console.log(title);
    on_close();
  };

  return (
    <Dialog
      open={open}
      onClose={on_close}
      PaperProps={{
        component: "form",
        onSubmit: on_save,
      }}>
      <DialogTitle>Add Personal Remark</DialogTitle>
      <DialogContent>
        <DialogContentText>제목과 내용을 입력하신 뒤 저장을 누르세요.</DialogContentText>
        <TextField label="제목" name="title" />
        <TextField multiline></TextField>
      </DialogContent>
      <DialogActions>
        <Button type="submit" color="success">
          저장
        </Button>
        <Button onClick={on_close} color="primary">
          취소
        </Button>
      </DialogActions>
    </Dialog>
  );
}
