import { InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import FormControl from "@mui/material/FormControl";
import { useEffect, useRef, useState } from "react";
import { IMICSettings, PersonalRemark } from "../../lib/IMICSettings";
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
        let field_number: string;
        switch (type) {
            case "NOP":
                field_number = "field54";
                break;
            case "NOQ":
                field_number = "field47";
                break;
            case "REP":
                field_number = "field41";
                break;
            case "SUM":
                field_number = "updateMessage";
                break;
            default:
                field_number = "field37";
        }
        const textarea_elm = getElement<HTMLTextAreaElement>(`textarea[name="${field_number}"]`);
        textarea_elm.value = event_args.target.value;
        setTimeout(() => {
            textarea_elm.focus();
            const event = new Event("input", { bubbles: true });
            textarea_elm.dispatchEvent(event);
        }, 10);
    }

    useEffect(() => {
        void (async () => {
            await settings.current.requestLoad();
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
                label="문구를 선택하세요."
                size="small"
            >
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
                            ),
                    )}
            </Select>
        </FormControl>
    );
}
