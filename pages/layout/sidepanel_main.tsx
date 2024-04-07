import React from "react";
import ReactDOM from "react-dom/client";
import SidePanelApp from "../app/sidepanel_app";
import "@fontsource/noto-sans-kr/300.css";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { deepOrange, orange } from "@mui/material/colors";

const myTheme = createTheme({
  palette: {
    primary: deepOrange,
    secondary: orange,
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={myTheme}>
      <SidePanelApp />
    </ThemeProvider>
  </React.StrictMode>
);
