import { Add, ArrowDownward, ArrowUpward } from "@mui/icons-material";
import {
    Button,
    Card,
    CardActionArea,
    CardContent,
    Divider,
    Fab,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Stack,
    Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";

import { IMICSettings, PersonalRemark } from "@/common/IMICSettings";
import Header from "../components/header";
import ImportExport from "../components/importExport";
import { RemarkDialog } from "./remarkDialog";

interface PersonalRemarksProps {
    settings: React.RefObject<IMICSettings>;
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
        if (!initialized.current) {
            setPrList(settings.current?.PersonalRemarks || []);
            console.log("settings loaded as", settings.current);
            console.log("personal remarks loaded as", settings.current?.PersonalRemarks);
        }
    }, []);

    useEffect(() => {
        if (initialized.current) void SaveSettings();
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
        setPrList((prev) => prev.concat(new PersonalRemark(dlTitle, dlContent, prList.length + 1, slSelected)));
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
        setPrList((prev) => prev.filter((entry) => entry.Id !== dlCurrentId));
        RenumberPrList();
        // await SaveSettings();
        onDlCancelled();
    }

    async function onDlEdited() {
        setPrList((prev) => prev.filter((entry) => entry.Id !== dlCurrentId));
        setPrList((prev) => prev.concat(new PersonalRemark(dlTitle, dlContent, dlCurrentId, slSelected)));
        SortPrList();
        // await SaveSettings();
        onDlCancelled();
    }

    function RenumberPrList() {
        setPrList((prev) =>
            prev.map((item, index) => new PersonalRemark(item.Title, item.Content, index + 1, item.Section)),
        );
    }

    function SortPrList() {
        setPrList((prev) => prev.sort((a, b) => a.Id - b.Id));
    }

    function MoveUp(index: number) {
        if (index === 1) return; // Already at the top
        setPrList((prev) => {
            const newList = [...prev];
            const thisOne = newList.findIndex((el) => el.Id === index);
            const filteredList = newList
                .filter((e) => e.Section === newList[thisOne].Section)
                .sort((a, b) => a.Id - b.Id);
            const beforeElement = filteredList[filteredList.findIndex((el) => el.Id === index) - 1];

            if (!beforeElement) return prev;

            const theOneBefore = newList.findIndex((el) => el.Id === beforeElement.Id);

            if (!newList[theOneBefore]) return prev;

            [newList[theOneBefore], newList[thisOne]] = [newList[thisOne], newList[theOneBefore]];
            return newList.map((item, idx) => ({ ...item, Id: idx + 1 }));
        });
    }

    function MoveDown(index: number) {
        if (index === prList.length) return; // Already at the bottom
        setPrList((prev) => {
            const newList = [...prev];
            const thisOne = newList.findIndex((el) => el.Id === index);
            const filteredList = newList
                .filter((e) => e.Section === newList[thisOne].Section)
                .sort((a, b) => a.Id - b.Id);
            const nextElement = filteredList[filteredList.findIndex((el) => el.Id === index) + 1];

            if (!nextElement) return prev;

            const theOneAfter = newList.findIndex((el) => el.Id === nextElement.Id);

            if (!newList[theOneAfter]) return prev;

            [newList[thisOne], newList[theOneAfter]] = [newList[theOneAfter], newList[thisOne]];
            return newList.map((item, idx) => ({ ...item, Id: idx + 1 }));
        });
    }

    async function SaveSettings() {
        console.log("current state: ", prList);
        settings.current.PersonalRemarks = prList;
        await settings.current.saveOptions(true);
        console.log("settings saved as", settings.current);
    }

    function onSelectChanged(event: SelectChangeEvent) {
        setSlSelected(event.target.value as string);
    }

    function onItemImported(importedPrList: PersonalRemark[]) {
        settings.current.PersonalRemarks = importedPrList;
        setPrList(importedPrList);
    }

    return (
        <div>
            <Header title="iCare Personal Remarks">
                <ImportExport fileName="MyPersonalRemarks.json" target={prList} onImport={onItemImported} />
            </Header>
            <Stack direction="row-reverse" alignItems="end" spacing={3} marginBottom={3} pl={2} >
                <Fab
                    color="primary"
                    variant="extended"
                    size="small"
                    sx={{ mb: 3 }}
                    onClick={() => {
                        setDlOpened(true);
                    }}
                >
                    <Add />
                </Fab>
                <FormControl variant="outlined" fullWidth size="small">
                    <InputLabel>Select Section</InputLabel>
                    <Select defaultValue="REQ" label="Select Selection" value={slSelected} onChange={onSelectChanged}>
                        <MenuItem value="REQ">Request Remarks</MenuItem>
                        <MenuItem value="REP">Reply Remarks</MenuItem>
                        <MenuItem value="SUM">Update Remarks</MenuItem>
                        <MenuItem value="NOQ">Notification Request Remarks</MenuItem>
                        <MenuItem value="NOP">Notification Reply Remarks</MenuItem>
                    </Select>
                </FormControl>
            </Stack>
            <Stack direction="column" pl={2}>
                {prList.length > 0 &&
                    prList.map((pr, idx) => {
                        return (
                            pr.Section === slSelected && (
                                <Card key={idx} sx={{ mb: 2 }}>
                                    <Stack direction="row">
                                        <CardActionArea onClick={() => onCardClicked(pr)}>
                                            <CardContent sx={{ minHeight: 120 }}>
                                                <Typography gutterBottom variant="h6" component="div">
                                                    {pr.Title}
                                                </Typography>
                                                <Divider sx={{ mt: 1, mb: 1 }} />
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        whiteSpace: "pre-wrap",
                                                        wordBreak: "break-word",
                                                    }}
                                                    height={100}
                                                    overflow="auto"
                                                >
                                                    {pr.Content}
                                                </Typography>
                                            </CardContent>
                                        </CardActionArea>

                                        <Stack direction="column">
                                            <Button
                                                variant="text"
                                                size="small"
                                                color="inherit"
                                                sx={{
                                                    height: "100%",
                                                    minWidth: 0,
                                                    padding: "12px",
                                                }}
                                                onClick={() => MoveUp(pr.Id)}
                                            >
                                                <ArrowUpward />
                                            </Button>
                                            <Button
                                                variant="text"
                                                size="small"
                                                color="inherit"
                                                sx={{
                                                    height: "100%",
                                                    minWidth: 0,
                                                    padding: "12px",
                                                }}
                                                onClick={() => MoveDown(pr.Id)}
                                            >
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
