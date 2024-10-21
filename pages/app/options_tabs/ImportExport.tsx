import React, { ChangeEvent, FC, useEffect, useRef } from "react";
import { Box, Button, ButtonProps, Divider, Stack, Typography } from "@mui/material";
import { Download, Upload } from "@mui/icons-material";
import { TabPanel } from "./TabPanel";
import { IMICSettings } from "../../../src/lib/OptionElement";

interface ImportExportProps {
  settings: React.MutableRefObject<IMICSettings>;
}
interface MyButtonProps extends ButtonProps {
  children?: React.ReactNode;
}
const MyButton: React.FC<MyButtonProps> = ({ children, ...other }) => {
  return (
    <Button variant="outlined" color="primary" size="large" {...other}>
      {children}
    </Button>
  );
};

export const ImportExport: React.FC<ImportExportProps> = ({ settings }) => {
  const import_input = useRef<HTMLInputElement>(null);
  function onExportClicked() {
    const strSettings = JSON.stringify(settings.current, null, 2);
    const vlink = document.createElement("a");
    const vblob = new Blob([strSettings], { type: "octet/stream" });
    const fileName = "IMICSettings.json";
    const vurl = window.URL.createObjectURL(vblob);
    vlink.setAttribute("href", vurl);
    vlink.setAttribute("download", fileName);
    vlink.click();
    vlink.remove();
  }

  function ImportSettings(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const reader = new FileReader();
    reader.onload = _imp;
    reader.readAsText(files[0]);
  }
  function _imp() {
    try {
      const _myImportedData = JSON.parse(this.result) as IMICSettings;
      console.log("Importing data: ", _myImportedData);
      Object.assign(settings.current, _myImportedData);
      settings.current.SaveOptions();
      alert("설정 불러오기 성공!");
    }
    catch (e){
      console.error(e);
      alert("설정 불러오기 실패, 개발자와 확인하세요.");
    }
    finally {
      import_input.current!.value = ""; //make sure to clear input value after every import
    }
  }
  return (
    <div>
      <input
        type="file"
        accept=".json"
        ref={import_input}
        style={{ display: "none" }}
        onChange={ImportSettings}
      />
      <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={100} color="initial" sx={{ width: 500 }}>
          불러오기
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} variant="fullWidth" />
      <MyButton startIcon={<Upload />} onClick={() => import_input.current!.click()}>
        설정 불러오기
      </MyButton>
      <Box marginY={10} />
      <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={100} color="initial" sx={{ width: 500 }}>
          내보내기
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} variant="fullWidth" />
      <MyButton startIcon={<Download />} onClick={onExportClicked}>
        설정 내보내기
      </MyButton>
    </div>
  );
};
