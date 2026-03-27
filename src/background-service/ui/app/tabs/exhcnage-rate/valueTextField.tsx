import { TextField } from "@mui/material";

export default function ValueTextField({
    value,
    onChange,
}: {
    value: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value?.replaceAll(",", "");
        const numericValue = isNaN(Number(value)) ? "1" : value;
        onChange?.({ ...event, target: { ...event.target, value: numericValue } });
    };
    return (
        <TextField
            variant="outlined"
            size="small"
            slotProps={{
                input: {
                    inputMode: "numeric",
                },
                htmlInput: { sx: { textAlign: "right" } },
            }}
            value={isNaN(Number(value)) ? "1" : Number(value) === 0 ? "1" : Number(value).toLocaleString()}
            onChange={handleChange}
        ></TextField>
    );
}
