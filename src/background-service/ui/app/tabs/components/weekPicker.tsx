import { Button, IconButton, Stack, styled } from "@mui/material";
import { DateCalendar, DateRangeIcon, PickersDay, PickersDayProps } from "@mui/x-date-pickers";
import { Dayjs } from "dayjs";
import React, { useState } from "react";

export interface DatePickButtonProps {
    service: "iCare" | "GCSS";
}

interface DatePickToggleButtonProps extends DatePickButtonProps {
    weekpickerEnabled: boolean;
    weekpickerForIcare: boolean;
    icareOutboundEnabled: boolean;
    gcssOutboundEnabled: boolean;
    setWeekpickerEnabled: (enabled: boolean) => void;
    showWeekpicker: (service: "iCare" | "GCSS") => void;
}

export const DatePickToggleButton: React.FC<DatePickToggleButtonProps> = ({
    service,
    weekpickerEnabled,
    weekpickerForIcare,
    icareOutboundEnabled,
    gcssOutboundEnabled,
    setWeekpickerEnabled,
    showWeekpicker,
}) => {
    if ((service === "iCare" && icareOutboundEnabled) || (service === "GCSS" && gcssOutboundEnabled)) {
        return (
            <IconButton
                aria-label=""
                sx={{ transform: "scale(0.9)" }}
                onClick={() => {
                    if (weekpickerEnabled) {
                        if ((service === "iCare" && weekpickerForIcare) || (service === "GCSS" && !weekpickerForIcare))
                            setWeekpickerEnabled(false);
                        else showWeekpicker(service);
                    } else showWeekpicker(service);
                }}
            >
                <DateRangeIcon />
            </IconButton>
        );
    }
    return null;
};

export interface WeekPickerOverlayProps {
    weekpickerEnabled: boolean;
    weekpickerForIcare: boolean;
    icareOutboundEnabled: boolean;
    gcssOutboundEnabled: boolean;
    icareOutboundDate: string | null;
    gcssOutboundDate: string | null;
    onIcareDateChange: (date: string | null) => void;
    onGcssDateChange: (date: string | null) => void;
    onSave: () => void;
    onCancel: () => void;
    onReset: (forIcare: boolean) => void;
}

interface CustomPickerDayProps extends PickersDayProps {
    isselected: boolean;
    ishovered: boolean;
}

const CustomPickersDay = styled(PickersDay)<CustomPickerDayProps>(({ theme, isselected, ishovered, day }) => ({
    borderRadius: 0,
    ...(isselected && {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        "&:hover, &:focus": {
            backgroundColor: theme.palette.primary.main,
        },
    }),
    ...(ishovered && {
        backgroundColor: theme.palette.primary.light,
        "&:hover, &:focus": {
            backgroundColor: theme.palette.primary.light,
        },
        ...(theme.palette.mode === "dark"
            ? {
                  backgroundColor: theme.palette.primary.dark,
                  "&:hover, &:focus": {
                      backgroundColor: theme.palette.primary.dark,
                  },
              }
            : {}),
    }),
    ...(day.day() === 0 && {
        borderTopLeftRadius: "50%",
        borderBottomLeftRadius: "50%",
    }),
    ...(day.day() === 6 && {
        borderTopRightRadius: "50%",
        borderBottomRightRadius: "50%",
    }),
}));

const isInSameWeek = (dayA: Dayjs, dayB: Dayjs | null | undefined) => {
    if (dayB == null) {
        return false;
    }

    return dayA.isSame(dayB, "week");
};

function Day(
    props: PickersDayProps & {
        selectedDay?: Dayjs | null;
        hoveredDay?: Dayjs | null;
    },
) {
    const { day, selectedDay, hoveredDay, ...other } = props;

    return (
        <CustomPickersDay
            {...other}
            day={day}
            sx={{ px: 2.5 }}
            disableMargin
            selected={false}
            isselected={isInSameWeek(day, selectedDay)}
            ishovered={isInSameWeek(day, hoveredDay)}
        />
    );
}

interface WeekPickerProps {
    targetState: Dayjs | null;
    saveTo: React.Dispatch<React.SetStateAction<Dayjs | null>>;
    onSave?: Function | null;
    onCancel?: Function | null;
    onReset?: Function | null;
}
export const WeekPicker: React.FC<WeekPickerProps> = ({ targetState, saveTo, onSave, onCancel, onReset }) => {
    const [hoveredDay, setHoveredDay] = useState<Dayjs | null>(null);

    return (
        <Stack>
            <DateCalendar
                sx={{ paddingBottom: 0, height: "300px" }}
                value={targetState}
                onChange={(v) => {
                    if (v && v.isValid()) {
                        saveTo(v);
                        console.log("[WeekPicker] new value updated: ", v);
                    } else {
                        console.error("Invalid date value received:", v);
                    }
                }}
                showDaysOutsideCurrentMonth
                slots={{
                    day: (props) => (
                        <Day
                            {...props}
                            selectedDay={targetState}
                            hoveredDay={hoveredDay}
                            onMouseEnter={() => setHoveredDay(props.day)}
                            onMouseLeave={() => setHoveredDay(null)}
                        />
                    ),
                }}
            />
            <Stack direction="row" justifyContent="space-evenly" spacing={2} marginX={2} marginY={2}>
                <Button
                    variant="outlined"
                    onClick={() => {
                        if (onReset) onReset();
                    }}
                >
                    Reset
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => {
                        if (onSave) onSave();
                    }}
                >
                    Save
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => {
                        if (onCancel) onCancel();
                    }}
                >
                    Cancel
                </Button>
            </Stack>
        </Stack>
    );
};
