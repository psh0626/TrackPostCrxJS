import React, { useEffect, useRef, useState } from "react";
import {
    Checkbox,
    Divider,
    FormControlLabel,
    Paper,
    Stack,
    Typography,
    TextField,
    Button,
    IconButton,
    styled,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { IMICSettings } from "../../../src/lib/OptionElement";
import { ServiceTypes } from "../../../src/background/GetUnreadReplies/GcssReplies";
import { SubdirectoryArrowRight } from "@mui/icons-material";
import { DateRangeIcon } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { WeekPicker } from "../../custom/week_picker";

interface GeneralSettingsProps {
    settings: React.MutableRefObject<IMICSettings>;
}

interface DatePickButtonProps {
    service: "iCare" | "GCSS";
}
export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings }) => {
    const [chkIcareReq, setChkIcareReq] = useState(false);
    const [chkIcareRep, setChkIcareRep] = useState(false);
    const [chkIcareNotiIn, setChkIcareNotiIn] = useState(false);
    const [chkIcareNotiOut, setChkIcareNotiOut] = useState(false);
    const [icareNotiDateRange, setIcareNotiDateRange] = useState<Dayjs | null>(null);
    const [icareAuthorRaw, setIcareAuthorRaw] = useState("");
    const [icareAuthor, setIcareAuthor] = useState<string[]>([]);
    const [chkGcssReq, setChkGcssReq] = useState(false);
    const [chkGcssRep, setChkGcssRep] = useState(false);
    const [chkGcssNotiIn, setChkGcssNotiIn] = useState(false);
    const [chkGcssNotiOut, setChkGcssNotiOut] = useState(false);
    const [gcssNotiDateRange, setGcssNotiDateRange] = useState<Dayjs | null>(null);
    const [gcssAuthorRaw, setGcssAuthorRaw] = useState("");
    const [gcssAuthor, setGcssAuthor] = useState<string[]>([]);
    const [gcssServiceTypes, setGcssServiceTypes] = useState<ServiceTypes[]>([ServiceTypes.EMS]);
    const initialized = useRef(false);
    const [weekpickerForIcare, setWeekpickerForIcare] = useState(true);
    const [weekpickerEnabled, setWeekpickerEnabled] = useState(false);

    useEffect(() => {
        if (!initialized.current) {
            console.log("GENERAL SETTINGS INITIALIZING: ", initialized);
            const curSet = settings.current;
            setChkIcareRep(curSet.IcareUnreadReplies);
            setChkIcareReq(curSet.IcareUnreadRequests);
            setChkIcareNotiIn(curSet.IcareUnreadNotificationInbound);
            setChkIcareNotiOut(curSet.IcareUnreadNotificationOutbound);
            setIcareAuthor(curSet.IcareAuthor);
            setIcareAuthorRaw(curSet.IcareAuthor.join(", "));
            setChkGcssRep(curSet.GcssUnreadReplies);
            setChkGcssReq(curSet.GcssUnreadRequests);
            setChkGcssNotiIn(curSet.GcssUnreadNotificationInbound);
            setChkGcssNotiOut(curSet.GcssUnreadNotificationOutbound);
            if (!Array.isArray(curSet.GcssAuthor)) curSet.GcssAuthor = [curSet.GcssAuthor];
            setGcssAuthor(curSet.GcssAuthor);
            setGcssAuthorRaw(curSet.GcssAuthor.join(","));
            setGcssServiceTypes(curSet.GcssServiceTypes);

            if (
                curSet.IcareOutboundNotificatioDate &&
                dayjs(curSet.IcareOutboundNotificatioDate).isValid()
            )
                setIcareNotiDateRange(dayjs(curSet.IcareOutboundNotificatioDate));

            if (
                curSet.GcssOutboundNotificatioDate &&
                dayjs(curSet.GcssOutboundNotificatioDate).isValid()
            )
                setGcssNotiDateRange(dayjs(curSet.GcssOutboundNotificatioDate));
            initialized.current = true;
        }
    }, []);

    useEffect(() => {
        console.log("CHECK ICARE REQ", chkIcareReq);
        if (initialized.current) {
            void SaveSettings();
            console.log("GENERALSETTINGS SAVE SETTINGS: ", initialized.current);
        } else initialized.current = true;
    }, [
        chkIcareRep,
        chkIcareReq,
        icareAuthor,
        chkGcssRep,
        chkGcssReq,
        gcssAuthor,
        gcssServiceTypes,
        chkIcareNotiIn,
        chkIcareNotiOut,
        chkGcssNotiIn,
        chkGcssNotiOut,
    ]);

    async function SaveSettings() {
        const curSet = settings.current;
        curSet.IcareUnreadReplies = chkIcareRep;
        curSet.IcareUnreadRequests = chkIcareReq;
        curSet.IcareUnreadNotificationInbound = chkIcareReq ? chkIcareNotiIn : false;
        curSet.IcareUnreadNotificationOutbound = chkIcareRep ? chkIcareNotiOut : false;
        curSet.IcareAuthor = icareAuthor;
        curSet.GcssUnreadRequests = chkGcssReq;
        curSet.GcssUnreadReplies = chkGcssRep;
        curSet.GcssUnreadNotificationInbound = chkGcssReq ? chkGcssNotiIn : false;
        curSet.GcssUnreadNotificationOutbound = chkGcssRep ? chkGcssNotiOut : false;
        curSet.GcssAuthor = gcssAuthor;
        curSet.GcssServiceTypes = gcssServiceTypes.sort((a, b) => {
            const serviceOrder = [
                ServiceTypes.EMS,
                ServiceTypes.Parcel,
                ServiceTypes.Registered,
                ServiceTypes.KPacket,
            ];
            return serviceOrder.indexOf(a) - serviceOrder.indexOf(b);
        });
        if (icareNotiDateRange && dayjs(icareNotiDateRange).isValid())
            curSet.IcareOutboundNotificatioDate = icareNotiDateRange.toISOString();
        else curSet.IcareOutboundNotificatioDate = null;
        if (gcssNotiDateRange && dayjs(gcssNotiDateRange).isValid())
            curSet.GcssOutboundNotificatioDate = gcssNotiDateRange.toISOString();
        else curSet.GcssOutboundNotificatioDate = null;
        await curSet.SaveOptions();
    }

    function TrimArray(str_arr: string[]) {
        const result = str_arr.map((item) => item.trim());
        return result;
    }

    function ToggleCheckService(type: ServiceTypes, checked: boolean) {
        if (checked) {
            if (gcssServiceTypes.includes(type)) return;
            setGcssServiceTypes((prev) => prev.concat(type));
        } else {
            if (!gcssServiceTypes.includes(type)) return;
            if (gcssServiceTypes.length === 1) setChkGcssRep(false);
            setGcssServiceTypes((prev) => prev.filter((el) => el !== type));
        }
    }

    function HandleAuthor(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        targetRaw: React.Dispatch<React.SetStateAction<string>>,
        targetState: React.Dispatch<React.SetStateAction<string[]>>
    ) {
        const input = e.target.value;
        targetRaw(input);

        // Only process the input when there's no trailing comma
        if (!input.endsWith(",")) {
            const authors = input
                .split(",")
                .map((name) => name.trim())
                .filter((name) => name !== "");
            targetState(authors);
        }
    }
    function ShowWeekpicker(service: "iCare" | "GCSS") {
        if ((service === "iCare" && chkIcareNotiOut) || (service === "GCSS" && chkGcssNotiOut)) {
            setWeekpickerForIcare(service === "iCare" ? true : false);
            setWeekpickerEnabled(true);
        }
    }
    async function ResetWeekpicker(forIcare = true, closePicker = true) {
        if (closePicker) setWeekpickerEnabled(false);
        if (forIcare) setIcareNotiDateRange(null);
        else setGcssNotiDateRange(null);
        await SaveSettings();
    }
    async function SaveWeekpicker() {
        if (!weekpickerEnabled) return;
        setWeekpickerEnabled(false);
        await SaveSettings();
    }

    const MyWeekPicker = () => {
        if (!weekpickerEnabled) return null;
        if (!chkIcareNotiOut && !chkGcssNotiOut) return null;
        return (
            <WeekPicker
                targetState={weekpickerForIcare ? icareNotiDateRange : gcssNotiDateRange}
                saveTo={weekpickerForIcare ? setIcareNotiDateRange : setGcssNotiDateRange}
                onSave={SaveWeekpicker}
                onCancel={() => setWeekpickerEnabled(false)}
                onReset={() => ResetWeekpicker(weekpickerForIcare, false)}
            />
        );
    };

    const DatePickButton: React.FC<DatePickButtonProps> = ({ service }) => {
        if ((service === "iCare" && chkIcareNotiOut) || (service === "GCSS" && chkGcssNotiOut)) {
            return (
                <IconButton
                    aria-label=""
                    sx={{ transform: "scale(0.9)" }}
                    onClick={() => {
                        if (weekpickerEnabled) {
                            if (
                                (service === "iCare" && weekpickerForIcare) ||
                                (service === "GCSS" && !weekpickerForIcare)
                            )
                                setWeekpickerEnabled(false);
                            else ShowWeekpicker(service);
                        } else ShowWeekpicker(service);
                    }}>
                    <DateRangeIcon />
                </IconButton>
            );
        } else return null;
    };
    return (
        <div>
            <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
                <Typography variant="h4" fontWeight={100} color="initial">
                    기본 설정
                </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} variant="fullWidth" />

            <Paper
                sx={{
                    position: "absolute",
                    top: "30vh",
                    left: "750px",
                }}>
                <MyWeekPicker />
            </Paper>
            <Stack spacing={4} sx={{ width: 500 }}>
                <Paper sx={{ p: 3 }}>
                    <Grid container width="100%" rowSpacing={1}>
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h5" fontWeight={100}>
                                iCare
                            </Typography>
                            <Divider sx={{ mt: 1, mb: 2 }} />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControlLabel
                                label="iCare 도착 문의 알림"
                                control={
                                    <Checkbox
                                        checked={chkIcareReq}
                                        onChange={(e, c) => setChkIcareReq(c)}
                                        color="primary"
                                    />
                                }
                            />
                            {chkIcareReq ? (
                                <FormControlLabel
                                    sx={{ transform: "scale(0.9)", ml: "10px" }}
                                    label="도착 통지 알림"
                                    control={
                                        <Stack direction="row" alignItems="center">
                                            <SubdirectoryArrowRight sx={{ paddingBottom: 1 }} />
                                            <Checkbox
                                                checked={chkIcareNotiIn}
                                                onChange={(e, c) => setChkIcareNotiIn(c)}
                                                color="error"
                                            />
                                        </Stack>
                                    }
                                />
                            ) : null}
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControlLabel
                                label="iCare 발송 회신 알림"
                                control={
                                    <Checkbox
                                        checked={chkIcareRep}
                                        onChange={(e, c) => setChkIcareRep(c)}
                                        color="primary"
                                    />
                                }
                            />

                            {chkIcareRep ? (
                                <Stack direction="row">
                                    <FormControlLabel
                                        sx={{ transform: "scale(0.9)" }}
                                        label="발송 통지 알림"
                                        control={
                                            <Stack direction="row" alignItems="center">
                                                <SubdirectoryArrowRight
                                                    sx={{ marginLeft: 0.5, paddingBottom: 1 }}
                                                />
                                                <Checkbox
                                                    checked={chkIcareNotiOut}
                                                    onChange={(e, c) => {
                                                        setChkIcareNotiOut(c);
                                                        if (!c) {
                                                            ResetWeekpicker();
                                                        }
                                                    }}
                                                    color="error"
                                                />
                                            </Stack>
                                        }
                                    />
                                    <DatePickButton service="iCare" />
                                </Stack>
                            ) : null}
                        </Grid>
                        {chkIcareRep ? (
                            <Grid size={{ xs: 12 }}>
                                <Divider sx={{ marginTop: 1, marginBottom: 2 }} />
                                <Stack direction="row" alignItems="end" justifyContent="end">
                                    <Typography
                                        textAlign="center"
                                        fontWeight={700}
                                        sx={{ mr: 2 }}
                                        variant="subtitle1">
                                        검색할 작성자:
                                    </Typography>
                                    <TextField
                                        label="author"
                                        size="small"
                                        variant="standard"
                                        value={icareAuthorRaw}
                                        onChange={(e) =>
                                            HandleAuthor(e, setIcareAuthorRaw, setIcareAuthor)
                                        }
                                        onBlur={() => setIcareAuthorRaw(icareAuthor.join(", "))}
                                    />
                                </Stack>
                                <Typography
                                    textAlign="end"
                                    fontWeight={100}
                                    sx={{ mt: 2 }}
                                    variant="subtitle2">
                                    * 대소문자 구분 없음 <br />* 일부만 입력 가능 (예: Sunghoon Park
                                    -{">"} sung) <br />
                                    * 여러명 입력 가능 (예: sung, mi, kim) <br />
                                </Typography>
                            </Grid>
                        ) : (
                            ""
                        )}
                    </Grid>
                </Paper>
                <Paper sx={{ p: 3 }}>
                    <Grid container width="100%" rowSpacing={1}>
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h5" fontWeight={100}>
                                GCSS
                            </Typography>
                            <Divider sx={{ mt: 1, mb: 2 }} />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControlLabel
                                label="GCSS 도착 문의 알림"
                                control={
                                    <Checkbox
                                        checked={chkGcssReq}
                                        onChange={(e, c) => setChkGcssReq(c)}
                                        color="primary"
                                    />
                                }
                            />

                            {chkGcssReq ? (
                                <FormControlLabel
                                    sx={{ transform: "scale(0.9)", ml: "10px" }}
                                    label="도착 통지 알림"
                                    control={
                                        <Stack direction="row" alignItems="center">
                                            <SubdirectoryArrowRight sx={{ paddingBottom: 1 }} />
                                            <Checkbox
                                                checked={chkGcssNotiIn}
                                                onChange={(e, c) => setChkGcssNotiIn(c)}
                                                color="error"
                                            />
                                        </Stack>
                                    }
                                />
                            ) : null}
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControlLabel
                                label="GCSS 발송 회신 알림"
                                control={
                                    <Checkbox
                                        checked={chkGcssRep}
                                        onChange={(e, c) => {
                                            setChkGcssRep(c);
                                            if (gcssServiceTypes.length < 1)
                                                setGcssServiceTypes([ServiceTypes.EMS]);
                                        }}
                                        color="primary"
                                    />
                                }
                            />

                            {chkGcssRep ? (
                                <Stack direction="row">
                                    <FormControlLabel
                                        sx={{ transform: "scale(0.9)" }}
                                        label="발송 통지 알림"
                                        control={
                                            <Stack direction="row" alignItems="center">
                                                <SubdirectoryArrowRight
                                                    sx={{ marginLeft: 0.5, paddingBottom: 1 }}
                                                />
                                                <Checkbox
                                                    checked={chkGcssNotiOut}
                                                    onChange={(e, c) => {
                                                        setChkGcssNotiOut(c);
                                                        if (!c) {
                                                            ResetWeekpicker(false);
                                                        }
                                                    }}
                                                    color="error"
                                                />
                                            </Stack>
                                        }
                                    />
                                    <DatePickButton service="GCSS" />
                                </Stack>
                            ) : null}
                        </Grid>
                        {chkGcssRep ? (
                            <Grid size={{ xs: 12 }}>
                                <Divider sx={{ marginTop: 1 }} />
                                <Stack
                                    direction="row"
                                    alignItems="end"
                                    justifyContent="space-evenly">
                                    <FormControlLabel
                                        label="EMS"
                                        control={
                                            <Checkbox
                                                checked={gcssServiceTypes.includes(
                                                    ServiceTypes.EMS
                                                )}
                                                onChange={(e, c) =>
                                                    ToggleCheckService(ServiceTypes.EMS, c)
                                                }
                                                color="error"
                                            />
                                        }
                                    />

                                    <FormControlLabel
                                        label="Exprès/Tracked"
                                        control={
                                            <Checkbox
                                                checked={gcssServiceTypes.includes(
                                                    ServiceTypes.KPacket
                                                )}
                                                onChange={(e, c) =>
                                                    ToggleCheckService(ServiceTypes.KPacket, c)
                                                }
                                                color="error"
                                            />
                                        }
                                    />

                                    <FormControlLabel
                                        label="REG"
                                        control={
                                            <Checkbox
                                                checked={gcssServiceTypes.includes(
                                                    ServiceTypes.Registered
                                                )}
                                                onChange={(e, c) =>
                                                    ToggleCheckService(ServiceTypes.Registered, c)
                                                }
                                                color="error"
                                            />
                                        }
                                    />

                                    <FormControlLabel
                                        label="Parcels"
                                        control={
                                            <Checkbox
                                                checked={gcssServiceTypes.includes(
                                                    ServiceTypes.Parcel
                                                )}
                                                onChange={(e, c) =>
                                                    ToggleCheckService(ServiceTypes.Parcel, c)
                                                }
                                                color="error"
                                            />
                                        }
                                    />
                                </Stack>
                                <Divider sx={{ marginTop: 0, marginBottom: 2 }} />
                                <Stack direction="row" alignItems="end" justifyContent="end">
                                    <Typography
                                        textAlign="center"
                                        fontWeight={700}
                                        sx={{ mr: 2 }}
                                        variant="subtitle1">
                                        검색할 작성자:
                                    </Typography>
                                    <TextField
                                        label="author"
                                        size="small"
                                        variant="standard"
                                        value={gcssAuthorRaw}
                                        onChange={(e) =>
                                            HandleAuthor(e, setGcssAuthorRaw, setGcssAuthor)
                                        }
                                        onBlur={() => setGcssAuthorRaw(gcssAuthor.join(", "))}
                                    />
                                </Stack>
                                <Typography
                                    textAlign="end"
                                    fontWeight={100}
                                    sx={{ mt: 2 }}
                                    variant="subtitle2">
                                    * 대소문자 구분 없음 <br />* 일부만 입력 가능 (예: Sunghoon Park
                                    -{">"} sung) <br />
                                    * 여러명 입력 가능 (예: sung, mi, kim) <br />
                                </Typography>
                            </Grid>
                        ) : (
                            ""
                        )}
                    </Grid>
                </Paper>
            </Stack>
        </div>
    );
};
