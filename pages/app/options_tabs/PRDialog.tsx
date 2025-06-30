import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import React from "react";

interface RemarkDialogProps {
    open: boolean;
    title: string;
    content: string;
    editing: boolean;
    onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onContentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
    onEdit: () => void;
    onRemove: () => void;
    onClose: () => void;
    onCancel: () => void;
}

export const RemarkDialog: React.FC<RemarkDialogProps> = ({
    open,
    title,
    content,
    editing,
    onTitleChange,
    onContentChange,
    onSave,
    onEdit,
    onRemove,
    onClose,
    onCancel,
}) => {
    return (
        <Dialog open={open} onClose={onClose} disableEnforceFocus disableAutoFocus>
            <DialogTitle>
                <Typography variant="h5" fontWeight="600" component="span">
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
                        value={title}
                        onChange={onTitleChange}
                    />
                    <TextField
                        multiline
                        rows="6"
                        label="내용"
                        variant="outlined"
                        color="primary"
                        margin="none"
                        size="small"
                        value={content}
                        onChange={onContentChange}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                {editing ? (
                    <div>
                        <Button onClick={onRemove} color="error" variant="contained" sx={{ mr: 45 }}>
                            삭제
                        </Button>
                        <Button onClick={onEdit} color="primary" variant="contained">
                            수정
                        </Button>
                    </div>
                ) : (
                    <Button onClick={onSave} color="primary" variant="contained">
                        저장
                    </Button>
                )}
                <Button onClick={onCancel} color="primary" variant="contained">
                    취소
                </Button>
            </DialogActions>
        </Dialog>
    );
};
