import { Stack, Typography, Input } from "@mui/material";
import { useState, useEffect } from "react";

export const CountryInput = (prop: { text: string; state: string[]; onChange: (countries: string[]) => void }) => {
    const [rawValue, setRawValue] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const changedValue = e.target.value.toUpperCase();
        // console.log("PROP uppercase: ", changedValue);
        setRawValue(changedValue);
        if (!changedValue.endsWith(",")) {
            const countries = changedValue
                .split(",")
                .map((el) => el.trim())
                .filter((el) => el !== "");
            // console.log("PROP split: ", countries);
            prop.onChange(countries);
        }
    };

    useEffect(() => {
        setRawValue(prop.state.join(", "));
        console.log("PROP LOADED");
    }, []);

    return (
        <Stack direction="column" justifyContent="space-evenly" spacing={0} paddingX={0.5}>
            <Typography
                alignContent={"end"}
                textAlign={"start"}
                fontWeight={300}
                fontSize={12}
                sx={{ mt: 0 }}
                variant="subtitle2"
            >
                {prop.text}
            </Typography>
            <Input
                size="small"
                sx={{ marginBottom: 0 }}
                value={rawValue}
                onChange={handleChange}
                onBlur={() => setRawValue(prop.state.join(", "))}
            ></Input>
        </Stack>
    );
};
