import { styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";

export const StyledTextField = styled(TextField)({
  "& .MuiInputLabel-root": {
    right: 0,
    textAlign: "center",
  },
  "& .MuiInputLabel-shrink": {
    margin: "0 auto",
    position: "absolute",
    right: "0",
    left: "0",
    top: "-3px",
    width: "150px", // Need to give it a width so the positioning will work
    background: "white", // Add a white bg
    // display: "none" //if you want to hide it completly
  },
  "& .MuiOutlinedInput-root.Mui-focused": {
    "& legend ": {
      display: "none", // If you want it then you need to position it similar with above
    },
  },
});

interface InfoFieldType {
  label_text: string;
  binding_value: string;
  binding_shrink: boolean;
  multiline?: boolean;
}
export const InfoTextField: React.FC<InfoFieldType> = ({ label_text, binding_value, binding_shrink, multiline }) => {
  const TextFieldFocused = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    navigator.clipboard.writeText(e.target.value);
  };
  return (
    <TextField
      variant="outlined"
      size="small"
      value={binding_value}
      label={label_text}
      onFocus={TextFieldFocused}
      InputLabelProps={{ shrink: binding_shrink }}
      inputProps={{ style: { fontSize: "14px" } }}
      multiline={multiline}
    />
  );
};
