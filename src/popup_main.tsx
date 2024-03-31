import React from "react";
import ReactDOM from "react-dom/client";
import PopUpApp from "./popup_app";
import "./index.css";
import '@fontsource/noto-sans-kr/300.css';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/500.css';
import '@fontsource/noto-sans-kr/700.css';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { deepOrange, orange } from "@mui/material/colors";

const myTheme = createTheme({
  palette: {
    primary: deepOrange,
    secondary: orange,
  },
  typography: {
    fontFamily: `"Noto Sans KR Variable", sans-serif`,
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={myTheme}>
      <PopUpApp />
    </ThemeProvider>
  </React.StrictMode>
);
