import React, { useEffect, useRef, useState } from "react";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormHelperText from "@mui/material/FormHelperText";
import { InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { IMICSettings, PersonalRemark } from "../../lib/OptionElement";
import { parseNumbers } from "xml2js/lib/processors";
interface prSelectProp {
  type: string;
}
export default function PersonalRemarksSelect({ type = "REQ" }: prSelectProp) {
  const settings = useRef(new IMICSettings());
  const initialized = useRef(false);

  const [pr_list, set_pr_list] = useState<PersonalRemark[]>([]);
  const [selectedItem, setSelectedItem] = useState("");

  function getElement<T>(cssString: string): T {
    return document.querySelector(cssString) as T;
  }

  function ItemChanged(event_args: SelectChangeEvent) {
    setSelectedItem(event_args.target.value);
    let textinput: HTMLTextAreaElement;
    if (type === "NOP") {
      textinput = getElement<HTMLTextAreaElement>(`textarea[name="field54"]`);
    } else if (type === "NOQ") {
      textinput = getElement<HTMLTextAreaElement>(`textarea[name="field47"]`);
    } else {
      textinput = getElement<HTMLTextAreaElement>(`textarea[name="field37"]`);
    }
    textinput.value = event_args.target.value;
    setTimeout(() => {
      textinput.focus();
      const event = new Event("input", { bubbles: true });
      textinput.dispatchEvent(event);
    }, 10);
  }

  useEffect(() => {
    (async () => {
      await settings.current.RequestLoad();
      set_pr_list(settings.current.PersonalRemarks);
      initialized.current = true;
      console.log("settings loaded:", settings.current);
    })();
  }, []);

  return (
    <FormControl variant="outlined" fullWidth size="small" sx={{ top: "4px" }}>
      <InputLabel>문구를 선택하세요.</InputLabel>
      <Select
        id="IMIC_PERSONAL_REMARKS"
        value={selectedItem}
        onChange={ItemChanged}
        label="문구를 선택하세요.">
        <MenuItem disabled value="">
          <em>문구를 선택하세요</em>
        </MenuItem>
        {pr_list.length > 0 &&
          pr_list.map(
            (item) =>
              item.Section === type && (
                <MenuItem key={item.Title} value={item.Content}>
                  {item.Title}
                </MenuItem>
              )
          )}
      </Select>
    </FormControl>
  );
}
