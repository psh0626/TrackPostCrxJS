import React, { useEffect, useRef, useState } from "react";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormHelperText from "@mui/material/FormHelperText";
import { InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { IMICSettings, PersonalRemark } from "../../lib/OptionElement";
import { parseNumbers } from "xml2js/lib/processors";

export default function PersonalRemarksSelect() {
  const settings = useRef(new IMICSettings());
  const initialized = useRef(false);

  const [pr_list, set_pr_list] = useState<PersonalRemark[]>([]);
  const [selectedItem, setSelectedItem] = useState("");

  function getElement<T>(cssString: string): T {
    return document.querySelector(cssString) as T;
  }

  function ItemChanged(event: SelectChangeEvent) {
    setSelectedItem(event.target.value);
    const textinput = getElement<HTMLTextAreaElement>(`textarea[name="field37"]`);
    textinput.value = event.target.value;
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
    <FormControl variant="outlined" fullWidth size="medium">
      <InputLabel>문구를 선택하세요.</InputLabel>
      <Select id="IMIC_PERSONAL_REMARKS" value={selectedItem} onChange={ItemChanged}>
        <MenuItem disabled value="">
          <em>문구를 선택하세요</em>
        </MenuItem>
        {pr_list.length > 0 &&
          pr_list.map((item) => <MenuItem value={item.Content}>{item.Title}</MenuItem>)}
      </Select>
    </FormControl>
  );
}
