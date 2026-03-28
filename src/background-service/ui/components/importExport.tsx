import { Download, Upload } from "@mui/icons-material";
import { Box, Button, ButtonProps, Divider, Stack, Typography } from "@mui/material";
import React, { ChangeEvent, useRef } from "react";
import { IMICSettings } from "@/common/IMICSettings";


interface ImportExportProps {
    settings: React.RefObject<IMICSettings>;
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
    const importInput = useRef<HTMLInputElement>(null);
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

    function importSettings(e: ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files) return;
        const reader = new FileReader();
        reader.onload = async function _imp() {
            try {
                const _myImportedData = JSON.parse(this.result as string) as IMICSettings;
                console.log("Importing data: ", _myImportedData);
                Object.assign(settings.current, _myImportedData);
                await settings.current.saveOptions();
                alert("설정 불러오기 성공!");
                location.reload();
            } catch (e) {
                console.error(e);
                alert("설정 불러오기 실패, 개발자와 확인하세요.");
            } finally {
                importInput.current!.value = ""; //make sure to clear input value after every import
            }
        };
        reader.readAsText(files[0]);
    }
    return (
        <div>
            <input
                type="file"
                accept=".json"
                ref={importInput}
                style={{ display: "none" }}
                onChange={importSettings}
            />
            <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
                <Typography variant="h4" fontWeight={100} color="initial" sx={{ width: 500 }}>
                    불러오기
                </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} variant="fullWidth" />
            <MyButton startIcon={<Upload />} onClick={() => importInput.current!.click()}>
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
