import { TextField } from "@mui/material";

interface InfoTextFieldProps {
    label_text: string;
    binding_value: string;
    binding_shrink: boolean;
    multiline?: boolean;
}
const InfoTextField: React.FC<InfoTextFieldProps> = ({ label_text, binding_value, binding_shrink, multiline }) => {
    const TextFieldFocused = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
        void navigator.clipboard.writeText(e.target.value);
    };
    return (
        <TextField
            variant="outlined"
            size="small"
            value={binding_value}
            label={label_text}
            onFocus={TextFieldFocused}
            slotProps={{
                inputLabel: { shrink: binding_shrink },
                input: { style: { fontSize: "14px" } },
            }}
            multiline={multiline}
        />
    );
};

export default InfoTextField;
