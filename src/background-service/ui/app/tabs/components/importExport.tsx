import { Button, Divider, Stack, Typography } from "@mui/material";
import { useState } from "react";
import AlertDialog from "./alertDialog";

interface ImportExportProps {
    target: any;
    fileName?: string;
    onExport?: () => void;
    onImport?: (importedData: any) => void;
}
export default function ImportExport({ target, fileName = "MySettings.json", onExport, onImport }: ImportExportProps) {
    const [isAlertOpen, setIsAlertOpen] = useState({ success: false, failure: false });
    const onExportClicked = () => {
        const vblob = new Blob([JSON.stringify(target, null, 2)], { type: "application/json" });
        const vlink = document.createElement("a");
        const vurl = window.URL.createObjectURL(vblob);
        vlink.setAttribute("href", vurl);
        vlink.setAttribute("download", fileName);
        vlink.click();
        vlink.remove();
        onExport?.();
    };

    function onImportClicked() {
        const importInput = document.createElement("input");
        importInput.type = "file";
        importInput.accept = ".json";
        importInput.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (!files) return;
            const reader = new FileReader();
            reader.onload = function _imp() {
                try {
                    const importedData = JSON.parse(this.result as string) as typeof target;
                    console.log("Importing data: ", importedData);
                    onImport?.(importedData);
                    setIsAlertOpen({ success: true, failure: false });
                } catch (e) {
                    console.error(e);
                    setIsAlertOpen({ success: false, failure: true });
                }
            };
            reader.readAsText(files[0]);
        };
        importInput.click();
    }
    return (
        <Stack direction="column" spacing={0.4}>
            <Divider sx={{ userSelect: "none" }}>
                <Typography variant="caption">설정</Typography>
            </Divider>
            <Stack direction="row" spacing={1}>
                <Button variant="outlined" size="small" onClick={onExportClicked}>
                    내보내기
                </Button>
                <Button variant="contained" size="small" onClick={onImportClicked}>
                    불러오기
                </Button>
            </Stack>
            <AlertDialog
                isOpen={isAlertOpen.success || isAlertOpen.failure}
                onClose={() => setIsAlertOpen({ success: false, failure: false })}
                content={isAlertOpen.success ? "설정 불러오기 성공!" : "설정 불러오기 실패, 개발자와 확인하세요."}
            />
        </Stack>
    );
}
