import { IMICSettings } from "@/common/IMICSettings";
import { ServiceTypes } from "@/content-scripts/pending-replies/gcssReplies";
import { SubdirectoryArrowRight } from "@mui/icons-material";
import { Checkbox, Divider, FormControlLabel, Paper, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import Header from "../components/header";
import ImportExport from "../components/importExport";
import { CountryInput } from "./countryInput";
import { DatePickButtonProps, DatePickToggleButton, WeekPicker, WeekPickerOverlayProps } from "./weekPicker";

interface GeneralSettingsProps {
    settings: React.RefObject<IMICSettings>;
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
            control={<Checkbox checked={checked} onChange={(_, c) => onChange(c)} color="primary" />}
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

const AuthorHelpText: React.FC = () => (
    <Typography textAlign="end" fontWeight={200} sx={{ mt: 2 }} variant="subtitle2">
        * 대소문자 구분 없음 <br />* 일부만 입력 가능 (예: Sunghoon Park -{">"} sung) <br />* 여러명 입력 가능 (예:
        sung, mi, kim) <br />
    </Typography>
);

interface InboundNotifSettingProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const InboundNotifSetting: React.FC<InboundNotifSettingProps> = ({ label, checked, onChange }) => (
    <FormControlLabel
        sx={{ transform: "scale(0.9)", ml: "10px" }}
        label={label}
        control={
            <Stack direction="row" alignItems="center">
                <SubdirectoryArrowRight sx={{ paddingBottom: 1 }} />
                <Checkbox checked={checked} onChange={(_, c) => onChange(c)} color="error" />
            </Stack>
        }
    />
);

interface OutboundNotifSettingProps {
    label: string;
    checked: boolean;
    service: "iCare" | "GCSS";
    onChange: (checked: boolean) => void;
    DatePickButton: React.FC<DatePickButtonProps>;
    children?: React.ReactNode;
}

const OutboundNotifSetting: React.FC<OutboundNotifSettingProps> = ({
    label,
    checked,
    service,
    onChange,
    DatePickButton,
    children,
}) => (
    <Stack>
        <Stack direction="row">
            <FormControlLabel
                sx={{ transform: "scale(0.9)", letterSpacing: "-1px" }}
                label={label}
                control={
                    <Stack direction="row" alignItems="center">
                        <SubdirectoryArrowRight
                            sx={{
                                marginLeft: 0.5,
                                paddingBottom: 1,
                            }}
                        />
                        <Checkbox checked={checked} onChange={(_, c) => onChange(c)} color="error" />
                    </Stack>
                }
            />
            <DatePickButton service={service} />
        </Stack>
        {checked && children}
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

type UpdateSettingFn = <K extends keyof IMICSettings>(key: K, value: IMICSettings[K]) => void;
type UpdateAuthorRawFn = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, isGcss?: boolean) => void;

interface IcareSectionProps {
    settingsState: IMICSettings;
    icareAuthorRaw: string;
    updateSetting: UpdateSettingFn;
    updateAuthorRaw: UpdateAuthorRawFn;
    setIcareAuthorRaw: React.Dispatch<React.SetStateAction<string>>;
    resetWeekpicker: (forIcare?: boolean, closePicker?: boolean) => Promise<void>;
    DatePickButton: React.FC<DatePickButtonProps>;
}
const SectionCard: React.FC<{
    children?: React.ReactNode;
    sx?: React.CSSProperties | object;
}> = ({ children, sx }) => <Paper sx={{ p: 3, pl: 4, pt: 4, width: "510px", ...sx }}>{children}</Paper>;
const IcareSection: React.FC<IcareSectionProps> = ({
    settingsState,
    icareAuthorRaw,
    updateSetting,
    updateAuthorRaw,
    setIcareAuthorRaw,
    resetWeekpicker,
    DatePickButton,
}) => (
    <SectionCard>
        <Grid container width="100%" rowSpacing={1}>
            <Grid size={{ xs: 12 }}>
                <Typography variant="h5" fontWeight={800}>
                    iCare
                </Typography>
                <Divider sx={{ mt: 1, mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
                <NotificationSettings
                    label="iCare 도착 문의 알림"
                    checked={settingsState.IcareUnreadRequests}
                    onChange={(c) => {
                        updateSetting("IcareUnreadRequests", c);
                        if (!c) updateSetting("IcareUnreadNotificationInbound", false);
                    }}
                    subSettings={
                        <InboundNotifSetting
                            label="도착 통지 알림"
                            checked={settingsState.IcareUnreadNotificationInbound}
                            onChange={(c) => updateSetting("IcareUnreadNotificationInbound", c)}
                        />
                    }
                />
            </Grid>
            <Grid size={{ xs: 6 }}>
                <NotificationSettings
                    label="iCare 발송 회신 알림"
                    checked={settingsState.IcareUnreadReplies}
                    onChange={(c) => {
                        updateSetting("IcareUnreadReplies", c);
                        if (!c) updateSetting("IcareUnreadNotificationOutbound", false);
                    }}
                    subSettings={
                        <OutboundNotifSetting
                            label="발송 통지 알림"
                            checked={settingsState.IcareUnreadNotificationOutbound}
                            service="iCare"
                            DatePickButton={DatePickButton}
                            onChange={(c) => {
                                if (!c) {
                                    void resetWeekpicker();
                                }
                                updateSetting("IcareUnreadNotificationOutbound", c);
                            }}
                        >
                            <CountrySettings
                                countries={settingsState.IcareOutboundNotificationCountries}
                                excludedCountries={settingsState.IcareOutboundNotificationExcludedCountries}
                                onCountriesChange={(value) =>
                                    updateSetting("IcareOutboundNotificationCountries", value)
                                }
                                onExcludedCountriesChange={(value) =>
                                    updateSetting("IcareOutboundNotificationExcludedCountries", value)
                                }
                            />
                        </OutboundNotifSetting>
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
                    <AuthorHelpText />
                </Grid>
            )}
        </Grid>
    </SectionCard>
);

interface GcssSectionProps {
    settingsState: IMICSettings;
    gcssAuthorRaw: string;
    updateSetting: UpdateSettingFn;
    updateAuthorRaw: UpdateAuthorRawFn;
    setGcssAuthorRaw: React.Dispatch<React.SetStateAction<string>>;
    resetWeekpicker: (forIcare?: boolean, closePicker?: boolean) => Promise<void>;
    toggleCheckService: (type: ServiceTypes, checked: boolean) => void;
    toggleCheckRequestService: (type: ServiceTypes, checked: boolean) => void;
    DatePickButton: React.FC<DatePickButtonProps>;
}

const GcssSection: React.FC<GcssSectionProps> = ({
    settingsState,
    gcssAuthorRaw,
    updateSetting,
    updateAuthorRaw,
    setGcssAuthorRaw,
    resetWeekpicker,
    toggleCheckService,
    toggleCheckRequestService,
    DatePickButton,
}) => (
    <SectionCard>
        <Grid container width="100%" rowSpacing={1}>
            <Grid size={{ xs: 12 }}>
                <Typography variant="h5" fontWeight={800}>
                    GCSS
                </Typography>
                <Divider sx={{ mt: 1, mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
                <NotificationSettings
                    label="GCSS 도착 문의 알림"
                    checked={settingsState.GcssUnreadRequests}
                    onChange={(c) => {
                        updateSetting("GcssUnreadRequests", c);
                        if ((settingsState.GcssRequestServiceTypes || []).length < 1)
                            updateSetting("GcssRequestServiceTypes", [ServiceTypes.EMS]);
                        if (!c) updateSetting("GcssUnreadNotificationInbound", false);
                    }}
                    subSettings={
                        <InboundNotifSetting
                            label="EMS 도착 통지 알림"
                            checked={settingsState.GcssUnreadNotificationInbound}
                            onChange={(c) => updateSetting("GcssUnreadNotificationInbound", c)}
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
                        if (!c) updateSetting("GcssUnreadNotificationOutbound", false);
                        if ((settingsState.GcssServiceTypes || []).length < 1)
                            updateSetting("GcssServiceTypes", [ServiceTypes.EMS]);
                    }}
                    subSettings={
                        <OutboundNotifSetting
                            label="EMS 발송 통지 알림"
                            checked={settingsState.GcssUnreadNotificationOutbound}
                            service="GCSS"
                            DatePickButton={DatePickButton}
                            onChange={(c) => {
                                if (!c) {
                                    void resetWeekpicker(false);
                                }
                                updateSetting("GcssUnreadNotificationOutbound", c);
                            }}
                        >
                            <CountrySettings
                                countries={settingsState.GcssOutboundNotificationCountries}
                                excludedCountries={settingsState.GcssOutboundNotificationExcludedCountries}
                                onCountriesChange={(value) => updateSetting("GcssOutboundNotificationCountries", value)}
                                onExcludedCountriesChange={(value) =>
                                    updateSetting("GcssOutboundNotificationExcludedCountries", value)
                                }
                            />
                        </OutboundNotifSetting>
                    }
                />
            </Grid>
            {settingsState.GcssUnreadRequests && (
                <Grid size={{ xs: 12 }}>
                    <Divider sx={{ marginTop: 1 }}>도착문의</Divider>
                    <Stack direction="row" alignItems="end" justifyContent="space-evenly">
                        <FormControlLabel
                            label="EMS"
                            control={
                                <Checkbox
                                    checked={(settingsState.GcssRequestServiceTypes || []).includes(ServiceTypes.EMS)}
                                    onChange={(_, c) => toggleCheckRequestService(ServiceTypes.EMS, c)}
                                    color="error"
                                />
                            }
                        />
                        <FormControlLabel
                            label="REG"
                            control={
                                <Checkbox
                                    checked={(settingsState.GcssRequestServiceTypes || []).some(
                                        (rs: ServiceTypes) =>
                                            rs === ServiceTypes.Registered ||
                                            rs === ServiceTypes.KPacket ||
                                            rs === ServiceTypes.Insured,
                                    )}
                                    onChange={(_, c) => {
                                        toggleCheckRequestService(ServiceTypes.Registered, c);
                                    }}
                                    color="error"
                                />
                            }
                        />
                        <FormControlLabel
                            label="Parcels"
                            control={
                                <Checkbox
                                    checked={(settingsState.GcssRequestServiceTypes || []).includes(
                                        ServiceTypes.Parcel,
                                    )}
                                    onChange={(_, c) => toggleCheckRequestService(ServiceTypes.Parcel, c)}
                                    color="error"
                                />
                            }
                        />
                    </Stack>
                    <Divider sx={{ marginTop: 1 }}></Divider>
                </Grid>
            )}
            {settingsState.GcssUnreadReplies && (
                <Grid size={{ xs: 12 }}>
                    <Divider sx={{ marginTop: 2 }}>발송회신</Divider>
                    <Stack direction="row" alignItems="end" justifyContent="space-evenly">
                        <FormControlLabel
                            label="EMS"
                            control={
                                <Checkbox
                                    checked={(settingsState.GcssServiceTypes || []).includes(ServiceTypes.EMS)}
                                    onChange={(_, c) => toggleCheckService(ServiceTypes.EMS, c)}
                                    color="error"
                                />
                            }
                        />
                        <FormControlLabel
                            label="Exprès/Tracked"
                            control={
                                <Checkbox
                                    checked={(settingsState.GcssServiceTypes || []).includes(ServiceTypes.KPacket)}
                                    onChange={(_, c) => toggleCheckService(ServiceTypes.KPacket, c)}
                                    color="error"
                                />
                            }
                        />
                        <FormControlLabel
                            label="REG"
                            control={
                                <Checkbox
                                    checked={(settingsState.GcssServiceTypes || []).includes(ServiceTypes.Registered)}
                                    onChange={(_, c) => toggleCheckService(ServiceTypes.Registered, c)}
                                    color="error"
                                />
                            }
                        />
                        <FormControlLabel
                            label="Parcels"
                            control={
                                <Checkbox
                                    checked={(settingsState.GcssServiceTypes || []).includes(ServiceTypes.Parcel)}
                                    onChange={(_, c) => toggleCheckService(ServiceTypes.Parcel, c)}
                                    color="error"
                                />
                            }
                        />
                    </Stack>
                    <Divider sx={{ marginTop: 1, marginBottom: 2 }} />
                    <AuthorInput
                        label="검색할 작성자:"
                        value={gcssAuthorRaw}
                        onChange={(e) => updateAuthorRaw(e, true)}
                        onBlur={() => setGcssAuthorRaw(settingsState.GcssAuthor.join(", "))}
                    />
                    <AuthorHelpText />
                </Grid>
            )}
        </Grid>
    </SectionCard>
);

const WeekPickerOverlay: React.FC<WeekPickerOverlayProps> = ({
    weekpickerEnabled,
    weekpickerForIcare,
    icareOutboundEnabled,
    gcssOutboundEnabled,
    icareOutboundDate,
    gcssOutboundDate,
    onIcareDateChange,
    onGcssDateChange,
    onSave,
    onCancel,
    onReset,
}) => {
    if (!weekpickerEnabled) return null;
    if (!icareOutboundEnabled && !gcssOutboundEnabled) return null;

    return (
        <Paper sx={{ position: "absolute", top: weekpickerForIcare ? "730px" : "250px", left: "785px" }}>
            <WeekPicker
                targetState={
                    weekpickerForIcare
                        ? icareOutboundDate
                            ? dayjs(icareOutboundDate)
                            : null
                        : gcssOutboundDate
                          ? dayjs(gcssOutboundDate)
                          : null
                }
                saveTo={
                    weekpickerForIcare
                        ? (d) => onIcareDateChange(d ? d.toString() : null)
                        : (d) => onGcssDateChange(d ? d.toString() : null)
                }
                onSave={onSave}
                onCancel={onCancel}
                onReset={() => onReset(weekpickerForIcare)}
            />
        </Paper>
    );
};

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings }) => {
    const [settingsState, setSettingsState] = useState<IMICSettings>(new IMICSettings());
    const [icareAuthorRaw, setIcareAuthorRaw] = useState("");
    const [gcssAuthorRaw, setGcssAuthorRaw] = useState("");
    const [weekpickerForIcare, setWeekpickerForIcare] = useState(true);
    const [weekpickerEnabled, setWeekpickerEnabled] = useState(false);
    const initialized = useRef(false);
    // TODO: 환율 설정 기능 추가하기
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
        await settings.current.saveOptions(immediately);
    }

    function updateSetting<K extends keyof IMICSettings>(key: K, value: IMICSettings[K]) {
        setSettingsState((prev: IMICSettings) => {
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

    function toggleCheckService(type: ServiceTypes, checked: boolean) {
        const current = settingsState.GcssServiceTypes || [];
        if (checked) {
            if (current.includes(type)) return;
            updateSetting("GcssServiceTypes", current.concat(type));
        } else {
            if (!current.includes(type)) return;
            if (current.length === 1) updateSetting("GcssUnreadReplies", false);
            updateSetting(
                "GcssServiceTypes",
                current.filter((el: ServiceTypes) => el !== type),
            );
        }
    }

    function toggleCheckRequestService(type: ServiceTypes, checked: boolean) {
        const current = settingsState.GcssRequestServiceTypes || [];
        const relatedTypes = [ServiceTypes.Registered, ServiceTypes.KPacket, ServiceTypes.Insured];
        const typesToToggle = relatedTypes.includes(type) ? relatedTypes : [type];

        let newTypes: ServiceTypes[];
        if (checked) {
            newTypes = Array.from(new Set([...current, ...typesToToggle]));
        } else {
            newTypes = current.filter((el: ServiceTypes) => !typesToToggle.includes(el));
            if (newTypes.length === 0) updateSetting("GcssUnreadRequests", false);
        }

        updateSetting("GcssRequestServiceTypes", newTypes);
    }
    function showWeekpicker(service: "iCare" | "GCSS") {
        if (
            (service === "iCare" && settingsState.IcareUnreadNotificationOutbound) ||
            (service === "GCSS" && settingsState.GcssUnreadNotificationOutbound)
        ) {
            setWeekpickerForIcare(service === "iCare" ? true : false);
            setWeekpickerEnabled(true);
        }
    }
    async function resetWeekpicker(forIcare = true, closePicker = true) {
        if (closePicker) setWeekpickerEnabled(false);
        if (forIcare) updateSetting("IcareOutboundNotificationDate", null);
        else updateSetting("GcssOutboundNotificationDate", null);
        await SaveSettings();
    }
    async function saveWeekpicker() {
        if (!weekpickerEnabled) return;
        setWeekpickerEnabled(false);
        await SaveSettings();
    }

    const DatePickButton: React.FC<DatePickButtonProps> = ({ service }) => {
        return (
            <DatePickToggleButton
                service={service}
                weekpickerEnabled={weekpickerEnabled}
                weekpickerForIcare={weekpickerForIcare}
                icareOutboundEnabled={settingsState.IcareUnreadNotificationOutbound}
                gcssOutboundEnabled={settingsState.GcssUnreadNotificationOutbound}
                setWeekpickerEnabled={setWeekpickerEnabled}
                showWeekpicker={showWeekpicker}
            />
        );
    };

    return (
        <div>
            <Header title="일반 설정">
                <ImportExport
                    target={settingsState}
                    fileName="MyGeneralSettings.json"
                    onImport={(imported: IMICSettings) => {
                        setSettingsState(() => {
                            const updated = { ...imported } as IMICSettings;
                            if (!Array.isArray(updated.PersonalRemarks) || updated.PersonalRemarks.length === 0) {
                                updated.PersonalRemarks = settings.current.PersonalRemarks;
                            }
                            settings.current = updated;
                            SaveSettings(false, updated, "IMPORT");
                            return updated;
                        });
                    }}
                />
            </Header>
            <WeekPickerOverlay
                weekpickerEnabled={weekpickerEnabled}
                weekpickerForIcare={weekpickerForIcare}
                icareOutboundEnabled={settingsState.IcareUnreadNotificationOutbound}
                gcssOutboundEnabled={settingsState.GcssUnreadNotificationOutbound}
                icareOutboundDate={settingsState.IcareOutboundNotificationDate}
                gcssOutboundDate={settingsState.GcssOutboundNotificationDate}
                onIcareDateChange={(date) => updateSetting("IcareOutboundNotificationDate", date)}
                onGcssDateChange={(date) => updateSetting("GcssOutboundNotificationDate", date)}
                onSave={saveWeekpicker}
                onCancel={() => setWeekpickerEnabled(false)}
                onReset={(forIcare) => {
                    void resetWeekpicker(forIcare, false);
                }}
            />
            <Stack spacing={5} sx={{ pl: 2 }}>
                <GcssSection
                    settingsState={settingsState}
                    gcssAuthorRaw={gcssAuthorRaw}
                    updateSetting={updateSetting}
                    updateAuthorRaw={updateAuthorRaw}
                    setGcssAuthorRaw={setGcssAuthorRaw}
                    resetWeekpicker={resetWeekpicker}
                    toggleCheckService={toggleCheckService}
                    toggleCheckRequestService={toggleCheckRequestService}
                    DatePickButton={DatePickButton}
                />
                <IcareSection
                    settingsState={settingsState}
                    icareAuthorRaw={icareAuthorRaw}
                    updateSetting={updateSetting}
                    updateAuthorRaw={updateAuthorRaw}
                    setIcareAuthorRaw={setIcareAuthorRaw}
                    resetWeekpicker={resetWeekpicker}
                    DatePickButton={DatePickButton}
                />
            </Stack>
        </div>
    );
};
