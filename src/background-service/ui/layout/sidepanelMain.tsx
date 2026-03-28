import "@/background-service/fonts.css";
import "@/background-service/index.css";
import { deepOrange, orange } from "@mui/material/colors";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom/client";
import SidePanelApp from "../app/sidepanelApp";

const myTheme = createTheme({
    palette: {
        primary: deepOrange,
        secondary: orange,
    },
    typography: {
        fontFamily: `Paperozi, sans-serif`,
        fontSize: 14,
        fontWeightLight: 300,
        fontWeightRegular: 400,
        fontWeightMedium: 500,
        fontWeightBold: 700,
    },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider theme={myTheme}>
            <SidePanelApp />
        </ThemeProvider>
    </React.StrictMode>,
);
