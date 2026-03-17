import { Margin } from "@mui/icons-material";
import { Button, Input, Paper, Stack, styled, Typography } from "@mui/material";
import { PickersDayProps, PickersDay, DateCalendar } from "@mui/x-date-pickers";
import { Dayjs } from "dayjs";
import React, { useEffect, useMemo, useState } from "react";

interface CustomPickerDayProps extends PickersDayProps {
    isSelected: boolean;
    isHovered: boolean;
}

const CustomPickersDay = styled(PickersDay)<CustomPickerDayProps>(
    ({ theme, isSelected, isHovered, day }) => ({
        borderRadius: 0,
        ...(isSelected && {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            "&:hover, &:focus": {
                backgroundColor: theme.palette.primary.main,
            },
        }),
        ...(isHovered && {
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
    })
);

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
    }
) {
    const { day, selectedDay, hoveredDay, ...other } = props;

    return (
        <CustomPickersDay
            {...other}
            day={day}
            sx={{ px: 2.5 }}
            disableMargin
            selected={false}
            isSelected={isInSameWeek(day, selectedDay)}
            isHovered={isInSameWeek(day, hoveredDay)}
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
export const WeekPicker: React.FC<WeekPickerProps> = ({
    targetState,
    saveTo,
    onSave,
    onCancel,
    onReset
}) => {
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
            <Stack
                direction="row"
                justifyContent="space-evenly"
                spacing={2}
                marginX={2}
                marginY={2}>
                <Button
                    variant="outlined"
                    onClick={() => {
                        if (onReset) onReset();
                    }}>
                    Reset
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => {
                        if (onSave) onSave();
                    }}>
                    Save
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => {
                        if (onCancel) onCancel();
                    }}>
                    Cancel
                </Button>
            </Stack>
        </Stack>
    );
};
