import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";

interface AlertDialogProps {
    isOpen: boolean;
    onClose?: (result: boolean) => void;
    okOnly?: boolean;
    content?: React.ReactElement | string;
}
export default function AlertDialog({ isOpen, onClose, okOnly = false, content }: AlertDialogProps) {
    const dialogDiv = useRef<HTMLDivElement | null>(null);
    const isDragging = useRef(false);
    const dragOrigin = useRef({ mouseX: 0, mouseY: 0, elemTop: 0, elemLeft: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !dialogDiv.current) return;
            const deltaX = e.clientX - dragOrigin.current.mouseX;
            const deltaY = e.clientY - dragOrigin.current.mouseY;
            dialogDiv.current.style.top = `${dragOrigin.current.elemTop + deltaY}px`;
            dialogDiv.current.style.left = `${dragOrigin.current.elemLeft + deltaX}px`;
        };
        const handleMouseUp = () => {
            isDragging.current = false;
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dialogDiv.current) return;
        const rect = dialogDiv.current.getBoundingClientRect();
        // transform을 제거하고 실제 픽셀 위치로 고정
        dialogDiv.current.style.transform = "none";
        dialogDiv.current.style.top = `${rect.top}px`;
        dialogDiv.current.style.left = `${rect.left}px`;
        isDragging.current = true;
        dragOrigin.current = { mouseX: e.clientX, mouseY: e.clientY, elemTop: rect.top, elemLeft: rect.left };
    };

    const renderContent = () => {
        if (typeof content === "string") {
            return (
                <Stack>
                    {content.split("\n").map((line, index) => (
                        <Typography key={index} sx={{ userSelect: "none" }}>
                            {line}
                        </Typography>
                    ))}
                </Stack>
            );
        }
        return content;
    };

    const onChange = () => {};
    return (
        <Dialog
            open={isOpen}
            onChange={onChange}
            onClose={() => onClose?.(false)}
            PaperComponent={(props) => {
                return (
                    <div
                        ref={dialogDiv}
                        id="alertDialog"
                        onMouseDown={onMouseDown}
                        style={{
                            position: "fixed",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            cursor: "move",
                        }}
                    >
                        <Paper
                            {...props}
                            sx={{ width: 500, maxWidth: "calc(100vw - 32px)", boxSizing: "border-box" }}
                        />
                    </div>
                );
            }}
        >
            <DialogTitle sx={{ userSelect: "none" }}>확인</DialogTitle>
            <DialogContent>{renderContent()}</DialogContent>
            <DialogActions>
                {!okOnly && <Button onClick={() => onClose?.(false)}>취소</Button>}
                <Button
                    autoFocus
                    variant="contained"
                    color="primary"
                    onClick={() => {
                        onClose?.(true);
                    }}
                >
                    확인
                </Button>
            </DialogActions>
        </Dialog>
    );
}
