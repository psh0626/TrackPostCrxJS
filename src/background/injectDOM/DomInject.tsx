import React, { Fragment } from "react";
import { useState } from "react";

import Fab from "@mui/material/Fab";
import CachedIcon from "@mui/icons-material/Cached";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import { Tooltip, Typography } from "@mui/material";
interface HelperProps {
  target: HTMLInputElement;
  new_value: string;
  manual_change?: boolean;
  for_icare?: boolean;
}

const FloatingHelper: React.FC<HelperProps> = ({ target, new_value, manual_change = false, for_icare = false }) => {
  const [tooltip_state, set_tooltip_state] = useState<string>(manual_change ? "Original" : "Changed");
  const [tip, set_tip] = useState<string>(new_value);

  const buttonClicked = () => {
    const tooltip_element = document.getElementById(`IMIC_${target.id}`)! as HTMLButtonElement;
    const value_to_keep = target.value; // keep changed value

    target.value = tip ?? ""; // original value to input
    tooltip_element.ariaLabel = value_to_keep; // changed value to tooltip

    set_tooltip_state(tooltip_state === "Changed" ? "Original" : "Changed");
    set_tip(value_to_keep); // this updates tooltip text
  };

  const fab_style: React.CSSProperties = {
    position: "absolute",
    zIndex: "999",
    right: "-105px",
    transform: "scale(0.55)",
    alignItems: "center",
    width: "130px",
    height: "34px",
  };

  const fab_style_icare: React.CSSProperties = {
    position: "absolute",
    zIndex: "999",
    right: "-30px",
    top: "-12px",
    transform: "scale(0.55)",
    alignItems: "center",
    width: "130px",
    height: "34px",
  };

  return (
    <Tooltip
      arrow={true}
      title={
        <Fragment>
          <Typography variant="button">{tooltip_state === "Changed" ? "Original" : "Tracked"} Data</Typography>
          <br style={{ margin: 5 }} />
          <Typography variant="caption">{tip}</Typography>
        </Fragment>
      }
      placement="top"
      leaveDelay={300}>
      <Fab
        style={for_icare ? fab_style_icare : fab_style}
        variant="extended"
        onClick={buttonClicked}
        size="small"
        color={tooltip_state === "Changed" ? "primary" : "default"}
        id={`IMIC_${target.id}`}
        sx={{ boxShadow: 0 }}>
        <CachedIcon />
        <Typography textAlign="center" margin="12px 6px 12px 6px">
          {tooltip_state}
        </Typography>
      </Fab>
    </Tooltip>
  );
};

export default FloatingHelper;
