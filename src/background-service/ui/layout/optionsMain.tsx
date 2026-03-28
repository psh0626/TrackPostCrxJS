import "@/background-service/fonts.css";
import "@/background-service/index.css";
import { deepOrange, orange } from "@mui/material/colors";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/ko";
import React from "react";
import ReactDOM from "react-dom/client";
import OptionsApp from "../app/optionsApp";

const myTheme = createTheme({
    palette: {
        primary: deepOrange,
        secondary: orange,
    },
    typography: {
        fontFamily: `"Pretendard Variable", sans-serif`,
        fontSize: 14,
        fontWeightLight: 300,
        fontWeightRegular: 400,
        fontWeightMedium: 500,
    },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
            <ThemeProvider theme={myTheme}>
                <OptionsApp />
            </ThemeProvider>
        </LocalizationProvider>
    </React.StrictMode>,
);
