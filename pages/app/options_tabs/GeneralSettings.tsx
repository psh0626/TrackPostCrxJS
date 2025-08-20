import { SubdirectoryArrowRight } from "@mui/icons-material";
import { Checkbox, Divider, FormControlLabel, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { DateRangeIcon } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import { ServiceTypes } from "../../../src/background/GetUnreadReplies/GcssReplies";
import { IMICSettings } from "../../../src/lib/OptionElement";
import { CountryInput } from "../../custom/components";
import { WeekPicker } from "../../custom/week_picker";

interface GeneralSettingsProps {
    settings: React.RefObject<IMICSettings>;
}

interface DatePickButtonProps {
    service: "iCare" | "GCSS";
}

const NotificationSettings: React.FC<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    subSettings?: React.ReactNode;
}> = ({ label, checked, onChange, subSettings }) => (
    <div>
        <FormControlLabel
            label={label}
            control={<Checkbox checked={checked} onChange={(e, c) => onChange(c)} color="primary" />}
        />
        {checked && subSettings}
    </div>
);

const AuthorInput: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
}> = ({ label, value, onChange, onBlur }) => (
    <Stack direction="row" alignItems="end" justifyContent="end">
        <Typography textAlign="center" fontWeight={700} sx={{ mr: 2 }} variant="subtitle1">
            {label}
        </Typography>
        <TextField label="author" size="small" variant="standard" value={value} onChange={onChange} onBlur={onBlur} />
    </Stack>
);

const CountrySettings: React.FC<{
    countries: string[];
    excludedCountries: string[];
    onCountriesChange: (countries: string[]) => void;
    onExcludedCountriesChange: (countries: string[]) => void;
}> = ({ countries, excludedCountries, onCountriesChange, onExcludedCountriesChange }) => (
    <Stack direction={"row"}>
        <CountryInput
            text="다음 국가만 알림"
            state={countries}
            onChange={(countries) => onCountriesChange(countries)}
        />
        <CountryInput
            text="다음 국가만 제외"
            state={excludedCountries}
            onChange={(countries) => onExcludedCountriesChange(countries)}
        />
    </Stack>
);

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings }) => {
    const [settingsState, setSettingsState] = useState<IMICSettings>(new IMICSettings());
    const [icareAuthorRaw, setIcareAuthorRaw] = useState("");
    const [gcssAuthorRaw, setGcssAuthorRaw] = useState("");
    const [weekpickerForIcare, setWeekpickerForIcare] = useState(true);
    const [weekpickerEnabled, setWeekpickerEnabled] = useState(false);
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            const curSet = settings.current;
            const newSettings = new IMICSettings();
            Object.assign(newSettings, curSet);
            setSettingsState(newSettings);
            if (curSet.IcareAuthor instanceof Array) setIcareAuthorRaw(curSet.IcareAuthor.join(", ") ?? "");
            if (curSet.GcssAuthor instanceof Array) setGcssAuthorRaw(curSet.GcssAuthor.join(", ") ?? "");
            setTimeout(() => {
                initialized.current = true;
            }, 200);
        }
    }, []);

    async function SaveSettings(immediately = true, mySettings: IMICSettings | null = null, from = "") {
        if (mySettings) {
            console.log("saving from specific settings for", from, mySettings);
            Object.assign(settings.current, mySettings);
        } else {
            console.trace("saving from settingsState", settingsState);
            Object.assign(settings.current, settingsState);
        }
        await settings.current.SaveOptions(immediately);
    }

    function updateSetting<K extends keyof IMICSettings>(key: K, value: IMICSettings[K]) {
        setSettingsState((prev) => {
            const updated = new IMICSettings();
            Object.assign(updated, prev);
            updated[key] = value;
            console.log("Updated setting:", key, "to", value, "is initialized:", initialized.current);
            if (initialized.current) {
                switch (key) {
                    case "IcareOutboundNotificationDate":
                    case "GcssOutboundNotificationDate":
                        break;
                    case "IcareAuthor":
                    case "GcssAuthor":
                    case "IcareOutboundNotificationCountries":
                    case "GcssOutboundNotificationCountries":
                    case "IcareOutboundNotificationExcludedCountries":
                    case "GcssOutboundNotificationExcludedCountries":
                        void SaveSettings(false, updated);
                        break;
                    default:
                        void SaveSettings(true, updated);
                        break;
                }
            } else initialized.current = true;

            return updated;
        });
    }

    function updateAuthorRaw(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, isGcss = false) {
        const input = e.target.value;
        if (isGcss) setGcssAuthorRaw(input);
        else setIcareAuthorRaw(input);
        if (!input.endsWith(",")) {
            const authors = input
                .split(",")
                .map((name) => name.trim())
                .filter((name) => name !== "");
            if (isGcss) updateSetting("GcssAuthor", authors);
            else updateSetting("IcareAuthor", authors);
        }
    }

    function ToggleCheckService(type: ServiceTypes, checked: boolean) {
        const current = settingsState.GcssServiceTypes || [];
        if (checked) {
            if (current.includes(type)) return;
            updateSetting("GcssServiceTypes", current.concat(type));
        } else {
            if (!current.includes(type)) return;
            if (current.length === 1) updateSetting("GcssUnreadReplies", false);
            updateSetting(
                "GcssServiceTypes",
                current.filter((el) => el !== type)
            );
        }
    }

    function ShowWeekpicker(service: "iCare" | "GCSS") {
        if (
            (service === "iCare" && settingsState.IcareUnreadNotificationOutbound) ||
            (service === "GCSS" && settingsState.GcssUnreadNotificationOutbound)
        ) {
            setWeekpickerForIcare(service === "iCare" ? true : false);
            setWeekpickerEnabled(true);
        }
    }
    async function ResetWeekpicker(forIcare = true, closePicker = true) {
        if (closePicker) setWeekpickerEnabled(false);
        if (forIcare) updateSetting("IcareOutboundNotificationDate", null);
        else updateSetting("GcssOutboundNotificationDate", null);
        await SaveSettings();
    }
    async function SaveWeekpicker() {
        if (!weekpickerEnabled) return;
        setWeekpickerEnabled(false);
        await SaveSettings();
    }

    const MyWeekPicker = () => {
        if (!weekpickerEnabled) return null;
        if (!settingsState.IcareUnreadNotificationOutbound && !settingsState.GcssUnreadNotificationOutbound)
            return null;
        return (
            <WeekPicker
                targetState={
                    weekpickerForIcare
                        ? settingsState.IcareOutboundNotificationDate
                            ? dayjs(settingsState.IcareOutboundNotificationDate)
                            : null
                        : settingsState.GcssOutboundNotificationDate
                          ? dayjs(settingsState.GcssOutboundNotificationDate)
                          : null
                }
                saveTo={
                    weekpickerForIcare
                        ? (d) => updateSetting("IcareOutboundNotificationDate", d ? d.toString() : null)
                        : (d) => updateSetting("GcssOutboundNotificationDate", d ? d.toString() : null)
                }
                onSave={SaveWeekpicker}
                onCancel={() => setWeekpickerEnabled(false)}
                onReset={() => ResetWeekpicker(weekpickerForIcare, false)}
            />
        );
    };

    const DatePickButton: React.FC<DatePickButtonProps> = ({ service }) => {
        if (
            (service === "iCare" && settingsState.IcareUnreadNotificationOutbound) ||
            (service === "GCSS" && settingsState.GcssUnreadNotificationOutbound)
        ) {
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
                    }}
                >
                    <DateRangeIcon />
                </IconButton>
            );
        } else return null;
    };

    // function handleCountryInput<K extends keyof IMICSettings>(key: K) {
    //     return (v: IMICSettings[K]) => updateSetting(key, v)
    // }

    return (
        <div>
            <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
                <Typography variant="h4" fontWeight={100} color="initial">
                    기본 설정
                </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} variant="fullWidth" />

            <Paper sx={{ position: "absolute", top: "30vh", left: "750px" }}>
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
                            <NotificationSettings
                                label="iCare 도착 문의 알림"
                                checked={settingsState.IcareUnreadRequests}
                                onChange={(c) => updateSetting("IcareUnreadRequests", c)}
                                subSettings={
                                    <FormControlLabel
                                        sx={{ transform: "scale(0.9)", ml: "10px" }}
                                        label="도착 통지 알림"
                                        control={
                                            <Stack direction="row" alignItems="center">
                                                <SubdirectoryArrowRight sx={{ paddingBottom: 1 }} />
                                                <Checkbox
                                                    checked={settingsState.IcareUnreadNotificationInbound}
                                                    onChange={(e, c) =>
                                                        updateSetting("IcareUnreadNotificationInbound", c)
                                                    }
                                                    color="error"
                                                />
                                            </Stack>
                                        }
                                    />
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <NotificationSettings
                                label="iCare 발송 회신 알림"
                                checked={settingsState.IcareUnreadReplies}
                                onChange={(c) => updateSetting("IcareUnreadReplies", c)}
                                subSettings={
                                    <Stack>
                                        <Stack direction="row">
                                            <FormControlLabel
                                                sx={{ transform: "scale(0.9)" }}
                                                label="발송 통지 알림"
                                                control={
                                                    <Stack direction="row" alignItems="center">
                                                        <SubdirectoryArrowRight
                                                            sx={{
                                                                marginLeft: 0.5,
                                                                paddingBottom: 1,
                                                            }}
                                                        />
                                                        <Checkbox
                                                            checked={settingsState.IcareUnreadNotificationOutbound}
                                                            onChange={(e, c) => {
                                                                if (!c) {
                                                                    ResetWeekpicker();
                                                                }
                                                                updateSetting("IcareUnreadNotificationOutbound", c);
                                                            }}
                                                            color="error"
                                                        />
                                                    </Stack>
                                                }
                                            />
                                            <DatePickButton service="iCare" />
                                        </Stack>
                                        {settingsState.IcareUnreadNotificationOutbound && (
                                            <CountrySettings
                                                countries={settingsState.IcareOutboundNotificationCountries}
                                                excludedCountries={
                                                    settingsState.IcareOutboundNotificationExcludedCountries
                                                }
                                                onCountriesChange={(value) =>
                                                    updateSetting("IcareOutboundNotificationCountries", value)
                                                }
                                                onExcludedCountriesChange={(value) =>
                                                    updateSetting("IcareOutboundNotificationExcludedCountries", value)
                                                }
                                            />
                                        )}
                                    </Stack>
                                }
                            />
                        </Grid>
                        {settingsState.IcareUnreadReplies && (
                            <Grid size={{ xs: 12 }}>
                                <Divider sx={{ marginTop: 1, marginBottom: 2 }} />
                                <AuthorInput
                                    label="검색할 작성자:"
                                    value={icareAuthorRaw}
                                    onChange={(e) => updateAuthorRaw(e, false)}
                                    onBlur={() => setIcareAuthorRaw(settingsState.IcareAuthor.join(", "))}
                                />
                                <Typography textAlign="end" fontWeight={100} sx={{ mt: 2 }} variant="subtitle2">
                                    * 대소문자 구분 없음 <br />* 일부만 입력 가능 (예: Sunghoon Park -{">"} sung) <br />
                                    * 여러명 입력 가능 (예: sung, mi, kim) <br />
                                </Typography>
                            </Grid>
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
                            <NotificationSettings
                                label="GCSS 도착 문의 알림"
                                checked={settingsState.GcssUnreadRequests}
                                onChange={(c) => updateSetting("GcssUnreadRequests", c)}
                                subSettings={
                                    <FormControlLabel
                                        sx={{ transform: "scale(0.9)", ml: "10px" }}
                                        label="도착 통지 알림"
                                        control={
                                            <Stack direction="row" alignItems="center">
                                                <SubdirectoryArrowRight sx={{ paddingBottom: 1 }} />
                                                <Checkbox
                                                    checked={settingsState.GcssUnreadNotificationInbound}
                                                    onChange={(e, c) =>
                                                        updateSetting("GcssUnreadNotificationInbound", c)
                                                    }
                                                    color="error"
                                                />
                                            </Stack>
                                        }
                                    />
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <NotificationSettings
                                label="GCSS 발송 회신 알림"
                                checked={settingsState.GcssUnreadReplies}
                                onChange={(c) => {
                                    updateSetting("GcssUnreadReplies", c);
                                    if ((settingsState.GcssServiceTypes || []).length < 1)
                                        updateSetting("GcssServiceTypes", [ServiceTypes.EMS]);
                                }}
                                subSettings={
                                    <Stack>
                                        <Stack direction="row">
                                            <FormControlLabel
                                                sx={{ transform: "scale(0.9)" }}
                                                label="발송 통지 알림"
                                                control={
                                                    <Stack direction="row" alignItems="center">
                                                        <SubdirectoryArrowRight
                                                            sx={{
                                                                marginLeft: 0.5,
                                                                paddingBottom: 1,
                                                            }}
                                                        />
                                                        <Checkbox
                                                            checked={settingsState.GcssUnreadNotificationOutbound}
                                                            onChange={(e, c) => {
                                                                if (!c) {
                                                                    ResetWeekpicker(false);
                                                                }
                                                                updateSetting("GcssUnreadNotificationOutbound", c);
                                                            }}
                                                            color="error"
                                                        />
                                                    </Stack>
                                                }
                                            />
                                            <DatePickButton service="GCSS" />
                                        </Stack>
                                        {settingsState.GcssUnreadNotificationOutbound && (
                                            <CountrySettings
                                                countries={settingsState.GcssOutboundNotificationCountries}
                                                excludedCountries={
                                                    settingsState.GcssOutboundNotificationExcludedCountries
                                                }
                                                onCountriesChange={(value) =>
                                                    updateSetting("GcssOutboundNotificationCountries", value)
                                                }
                                                onExcludedCountriesChange={(value) =>
                                                    updateSetting("GcssOutboundNotificationExcludedCountries", value)
                                                }
                                            />
                                        )}
                                    </Stack>
                                }
                            />
                        </Grid>
                        {settingsState.GcssUnreadReplies && (
                            <Grid size={{ xs: 12 }}>
                                <Divider sx={{ marginTop: 1 }} />
                                <Stack direction="row" alignItems="end" justifyContent="space-evenly">
                                    <FormControlLabel
                                        label="EMS"
                                        control={
                                            <Checkbox
                                                checked={(settingsState.GcssServiceTypes || []).includes(
                                                    ServiceTypes.EMS
                                                )}
                                                onChange={(e, c) => ToggleCheckService(ServiceTypes.EMS, c)}
                                                color="error"
                                            />
                                        }
                                    />

                                    <FormControlLabel
                                        label="Exprès/Tracked"
                                        control={
                                            <Checkbox
                                                checked={(settingsState.GcssServiceTypes || []).includes(
                                                    ServiceTypes.KPacket
                                                )}
                                                onChange={(e, c) => ToggleCheckService(ServiceTypes.KPacket, c)}
                                                color="error"
                                            />
                                        }
                                    />

                                    <FormControlLabel
                                        label="REG"
                                        control={
                                            <Checkbox
                                                checked={(settingsState.GcssServiceTypes || []).includes(
                                                    ServiceTypes.Registered
                                                )}
                                                onChange={(e, c) => ToggleCheckService(ServiceTypes.Registered, c)}
                                                color="error"
                                            />
                                        }
                                    />

                                    <FormControlLabel
                                        label="Parcels"
                                        control={
                                            <Checkbox
                                                checked={(settingsState.GcssServiceTypes || []).includes(
                                                    ServiceTypes.Parcel
                                                )}
                                                onChange={(e, c) => ToggleCheckService(ServiceTypes.Parcel, c)}
                                                color="error"
                                            />
                                        }
                                    />
                                </Stack>
                                <Divider sx={{ marginTop: 0, marginBottom: 2 }} />
                                <AuthorInput
                                    label="검색할 작성자:"
                                    value={gcssAuthorRaw}
                                    onChange={(e) => updateAuthorRaw(e, true)}
                                    onBlur={() => setGcssAuthorRaw(settingsState.GcssAuthor.join(", "))}
                                />
                                <Typography textAlign="end" fontWeight={100} sx={{ mt: 2 }} variant="subtitle2">
                                    * 대소문자 구분 없음 <br />* 일부만 입력 가능 (예: Sunghoon Park -{">"} sung) <br />
                                    * 여러명 입력 가능 (예: sung, mi, kim) <br />
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                </Paper>
            </Stack>
        </div>
    );
};
