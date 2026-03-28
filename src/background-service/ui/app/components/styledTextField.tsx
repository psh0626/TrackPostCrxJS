import { styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";

const StyledTextField = styled(TextField)({
    "& .MuiInputLabel-root": { right: 0, textAlign: "center" },
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

export default StyledTextField;
