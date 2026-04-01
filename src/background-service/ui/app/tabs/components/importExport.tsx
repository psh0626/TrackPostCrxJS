import { Button, Divider, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import AlertDialog from "./alertDialog";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasFiles(dataTransfer: DataTransfer | null) {
    if (!dataTransfer) return false;
    return Array.from(dataTransfer.types).includes("Files");
}

function hasUniformObjectValues(obj: Record<string, unknown>) {
    const values = Object.values(obj).filter((value) => value !== null && value !== undefined);
    if (values.length === 0) return false;
    return values.every((value) => isPlainObject(value));
}

function validateShape(
    importedData: unknown,
    targetData: unknown,
    path = "root",
): { valid: boolean; message?: string } {
    if (targetData === null || targetData === undefined) {
        return { valid: true };
    }

    if (Array.isArray(targetData)) {
        if (!Array.isArray(importedData)) {
            return { valid: false, message: `파일 형식이 일치하지 않습니다. (${path}가 배열이 아닙니다.)` };
        }

        if (targetData.length === 0 || importedData.length === 0) {
            return { valid: true };
        }

        const templateItem = targetData[0];
        for (let idx = 0; idx < importedData.length; idx += 1) {
            const result = validateShape(importedData[idx], templateItem, `${path}[${idx}]`);
            if (!result.valid) return result;
        }
        return { valid: true };
    }

    if (isPlainObject(targetData)) {
        if (!isPlainObject(importedData)) {
            return { valid: false, message: `파일 형식이 일치하지 않습니다. (${path}가 객체가 아닙니다.)` };
        }

        // For map-like objects (e.g. currency -> item), validate value shape only.
        if (hasUniformObjectValues(targetData)) {
            const templateValue = Object.values(targetData).find((value) => value !== null && value !== undefined);
            if (!templateValue) return { valid: true };

            for (const [key, value] of Object.entries(importedData)) {
                const result = validateShape(value, templateValue, `${path}.${key}`);
                if (!result.valid) return result;
            }
            return { valid: true };
        }

        const allowedKeys = new Set(Object.keys(targetData));
        for (const [key, value] of Object.entries(importedData)) {
            if (!allowedKeys.has(key)) {
                return {
                    valid: false,
                    message: `파일 형식이 일치하지 않습니다. (${path}.${key} 항목은 지원되지 않습니다.)`,
                };
            }

            const result = validateShape(value, (targetData as Record<string, unknown>)[key], `${path}.${key}`);
            if (!result.valid) return result;
        }

        return { valid: true };
    }

    if (typeof importedData !== typeof targetData) {
        return {
            valid: false,
            message: `파일 형식이 일치하지 않습니다. (${path} 타입이 일치하지 않습니다. (${typeof targetData} expected, ${typeof importedData} received))`,
        };
    }

    return { valid: true };
}

interface ImportExportProps {
    target: any;
    fileName?: string;
    onExport?: () => void;
    onImport?: (importedData: any) => void;
}
export default function ImportExport({ target, fileName = "MySettings.json", onExport, onImport }: ImportExportProps) {
    const [isAlertOpen, setIsAlertOpen] = useState({ success: false, failure: false });
    const [failureMessage, setFailureMessage] = useState("설정 불러오기 실패!");
    const [isDragging, setIsDragging] = useState(false);
    const dragDepthRef = useRef(0);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        console.log("IS ALERT OPEN", isAlertOpen);
    }, [isAlertOpen]);
    function isVisibleOnScreen() {
        if (!rootRef.current) return false;
        return rootRef.current.offsetParent !== null;
    }

    function importFromFile(file: File) {
        const reader = new FileReader();
        reader.onload = function _imp() {
            try {
                const importedData = JSON.parse(this.result as string) as typeof target;
                const validation = validateShape(importedData, target);
                if (!validation.valid) {
                    setFailureMessage(validation.message || "설정 항목 구조가 현재 탭과 일치하지 않습니다.");
                    setIsAlertOpen({ success: false, failure: true });
                    return;
                }

                console.log("Importing data: ", importedData);
                onImport?.(importedData);
                setFailureMessage("설정 불러오기 실패!");
                setIsAlertOpen({ success: true, failure: false });
            } catch (e) {
                console.error(e);
                setFailureMessage("JSON 형식이 올바르지 않거나 읽을 수 없는 파일입니다.");
                setIsAlertOpen({ success: false, failure: true });
            }
        };
        reader.readAsText(file);
    }

    const onExportClicked = () => {
        const vblob = new Blob([JSON.stringify(target, null, 2)], { type: "application/json" });
        const vlink = document.createElement("a");
        const vurl = window.URL.createObjectURL(vblob);
        vlink.setAttribute("href", vurl);
        const [name, ext] = fileName.split(".");
        const timestamp = dayjs().format("YYYYMMDD");
        const finalFileName = `${name}-${timestamp}.${ext}`;
        vlink.setAttribute("download", finalFileName);
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
            importFromFile(files[0]);
        };
        importInput.click();
    }

    function onDropImport(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (!file) return;
        importFromFile(file);
    }

    useEffect(() => {
        const onWindowDragEnter = (event: DragEvent) => {
            if (!isVisibleOnScreen()) return;
            if (!hasFiles(event.dataTransfer)) return;
            event.preventDefault();
            dragDepthRef.current += 1;
            setIsDragging(true);
        };

        const onWindowDragOver = (event: DragEvent) => {
            if (!isVisibleOnScreen()) return;
            if (!hasFiles(event.dataTransfer)) return;
            event.preventDefault();
            if (!isDragging) setIsDragging(true);
        };

        const onWindowDragLeave = (event: DragEvent) => {
            if (!isVisibleOnScreen()) return;
            if (!hasFiles(event.dataTransfer)) return;
            event.preventDefault();
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) {
                setIsDragging(false);
            }
        };

        const onWindowDrop = (event: DragEvent) => {
            if (!isVisibleOnScreen()) return;
            if (!hasFiles(event.dataTransfer)) return;
            event.preventDefault();
            dragDepthRef.current = 0;
            setIsDragging(false);
            const file = event.dataTransfer?.files?.[0];
            if (!file) return;
            importFromFile(file);
        };

        window.addEventListener("dragenter", onWindowDragEnter);
        window.addEventListener("dragover", onWindowDragOver);
        window.addEventListener("dragleave", onWindowDragLeave);
        window.addEventListener("drop", onWindowDrop);

        return () => {
            window.removeEventListener("dragenter", onWindowDragEnter);
            window.removeEventListener("dragover", onWindowDragOver);
            window.removeEventListener("dragleave", onWindowDragLeave);
            window.removeEventListener("drop", onWindowDrop);
        };
    }, [isDragging]);

    return (
        <Stack ref={rootRef} direction="column" spacing={0.4} >
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
            <Typography
                variant="caption"
                color="textSecondary"
                textAlign="center"
                sx={{ position: "absolute", top: "74px", left: "174px", width: "300px" }}
            >
                JSON 파일을 드래그해서 설정을 불러올 수 있습니다.
            </Typography>
            {isDragging && (
                <Stack
                    direction="column"
                    justifyContent="center"
                    alignItems="center"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={onDropImport}
                    onDragLeave={() => {
                        dragDepthRef.current = 0;
                        setIsDragging(false);
                    }}
                    sx={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        bgcolor: "rgba(12, 25, 45, 0.45)",
                        backdropFilter: "blur(2px)",
                    }}
                >
                    <Stack
                        direction="column"
                        justifyContent="center"
                        alignItems="center"
                        spacing={1}
                        sx={{
                            width: "min(680px, calc(100vw - 48px))",
                            height: "min(320px, calc(100vh - 48px))",
                            border: "3px dashed",
                            borderColor: "primary.main",
                            borderRadius: 2,
                            bgcolor: "background.paper",
                            opacity: 0.9,
                            boxShadow: 6,
                            px: 3,
                            textAlign: "center",
                        }}
                    >
                        <Typography variant="h6" color="primary">
                            파일을 여기에 놓으면 불러옵니다
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            JSON 파일을 드롭해 설정을 불러오세요.
                        </Typography>
                    </Stack>
                </Stack>
            )}
            <AlertDialog
                isOpen={isAlertOpen.success || isAlertOpen.failure}
                onClose={() => {
                    setIsAlertOpen({ success: false, failure: false });
                }}
                okOnly={true}
                content={isAlertOpen.success ? "설정 불러오기 성공!" : isAlertOpen.failure ? failureMessage : ""}
            />
        </Stack>
    );
}
