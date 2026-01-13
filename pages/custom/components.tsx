import { ExpandMore, OpenInBrowser } from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Card,
    Input,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import React, { useEffect, useState } from "react";
import { GcssItem, WorkflowItem } from "../../src/background/GetUnreadReplies/DataWrapper";
import { ServiceNames } from "../../src/background/GetUnreadReplies/GcssReplies";

export const CountryInput = (prop: {
    text: string;
    state: string[];
    onChange: (countries: string[]) => void;
}) => {
    const [rawValue, setRawValue] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {        
        const changedValue = e.target.value.toUpperCase();
        // console.log("PROP uppercase: ", changedValue);
        setRawValue(changedValue);
        if (!changedValue.endsWith(",")) {
            const countries = changedValue
                .split(",")
                .map((el) => el.trim())
                .filter((el) => el !== "");
            // console.log("PROP split: ", countries);
            prop.onChange(countries);
        }
    }

    useEffect(() => {
        setRawValue(prop.state.join(", "));
        console.log("PROP LOADED");
    }, []);

    return (
        <Stack direction="column" justifyContent="space-evenly" spacing={0} paddingX={0.5}>
            <Typography
                alignContent={"end"}
                textAlign={"start"}
                fontWeight={100}
                fontSize={12}
                sx={{ mt: 0 }}
                variant="subtitle2"
            >
                {prop.text}
            </Typography>
            <Input
                size="small"
                sx={{ marginBottom: 0 }}
                value={rawValue}
                onChange={handleChange}
                onBlur={() => setRawValue(prop.state.join(", "))}
            ></Input>
        </Stack>
    );
};
export const StyledTextField = styled(TextField)({
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

interface InfoFieldType {
    label_text: string;
    binding_value: string;
    binding_shrink: boolean;
    multiline?: boolean;
}
export const InfoTextField: React.FC<InfoFieldType> = ({ label_text, binding_value, binding_shrink, multiline }) => {
    const TextFieldFocused = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
        void navigator.clipboard.writeText(e.target.value);
    };
    return (
        <TextField
            variant="outlined"
            size="small"
            value={binding_value}
            label={label_text}
            onFocus={TextFieldFocused}
            slotProps={{
                inputLabel: { shrink: binding_shrink },
                input: { style: { fontSize: "14px" } },
            }}
            multiline={multiline}
        />
    );
};
interface MyListProps {
    items: WorkflowItem[] | GcssItem[] | any[];
    type?: "replies" | "requests";
    service?: "GCSS" | "iCare";
    author?: string;
    serviceType?: ServiceNames;
    isNotification?: boolean;
}
export const MyList: React.FC<MyListProps> = ({
    items,
    type = "replies",
    service = "iCare",
    author = "",
    serviceType = ServiceNames.EMS,
    isNotification = false,
}) => {
    let list_title = type === "replies" ? `${service} - ${serviceType} 발송 회신` : `${service} - ${serviceType} 도착 문의`;
    if (isNotification) list_title = list_title.replace("회신", "통지").replace("문의", "통지");
    list_title += `: ${items.length}건`;
    if (author !== "") list_title += ` (${author})`;

    const OpenNewTab = async (urlLink: string) => {
        const current_tab = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        return await chrome.tabs.create({
            index: current_tab[0].index + 1,
            url: urlLink,
            active: false,
        });
    };

    const OpenAll = async () => {
        // const reversed_items = [...items].reverse();
        const tab_promises = items.map(async (wf) => {
            let tab: chrome.tabs.Tab;
            if (service === "GCSS") {
                tab = isNotification ? await OpenNewTab(wf.NotificationLink): await OpenNewTab(wf.WorkflowLink);
            } else tab = await OpenNewTab(wf.link);

            if (tab && tab.id) {
                console.log("tab id push to tabids: ", tab.id);
                return tab.id; // Return the tab ID to be collected
            }
            return -1; // Return -1 for any tab that couldn't be opened
        });

        const tab_ids = (await Promise.all(tab_promises)).filter((id) => id !== -1); // Filter out any -1
        console.log("tab ids: ", tab_ids);

        if (tab_ids.length > 0) {
            const newGroup = await chrome.tabs.group({ tabIds: tab_ids as [number, ...number[]] });
            await chrome.tabGroups.update(newGroup, {
                title: list_title.replace(`: ${items.length}건`, ""),
                color: "orange",
                collapsed: true,
            });
        }
    };

    const CopyIDs = () => {
        let ids: string[];
        const reversed_items = [...items].reverse();
        if (service === "GCSS") {
            ids = reversed_items.map((item) => (item as GcssItem).ItemId);
        } else {
            ids = reversed_items.map((item) => (item as WorkflowItem).tracking_id);
        }
        const str_ids = ids.join("\n");
        void navigator.clipboard.writeText(str_ids);
    };

    const CopyCountries = () => {
        let countries: string[];
        const reversed_items = [...items].reverse();
        if (service === "GCSS") {
            if (type === "replies" && !isNotification) {
                countries = reversed_items.map((item) => (item as GcssItem).DestinationCountry);
            } else {
                countries = reversed_items.map((item) => (item as GcssItem).OriginCountry);
            }
        } else {
            if (type === "replies" && !isNotification) {
                countries = reversed_items.map((item) => (item as WorkflowItem).replying_op.substring(0, 2));
            } else {
                countries = reversed_items.map((item) => (item as WorkflowItem).requesting_op.substring(0, 2));
            }
        }
        const str_ids = countries.join("\n");
        void navigator.clipboard.writeText(str_ids);
    };

    return items.length === 0 ? null : (
        <List>
            <Accordion>
                <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{ "& .MuiAccordionSummary-content": { justifyContent: "center" } }}
                >
                    <Typography variant="body1" fontWeight="300" letterSpacing="-1px">
                        {list_title}
                    </Typography>
                </AccordionSummary>
                <Stack alignItems="center" justifyContent="space-around" direction="row">
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={async () => CopyIDs()}
                        sx={{ padding: "0.5 1 0.5 1" }}
                    >
                        ID 복사
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={async () => CopyCountries()}
                        sx={{ m: 1, padding: "0.5 1 0.5 1" }}
                    >
                        국가 복사
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={async () => await OpenAll()}
                        sx={{ padding: "0.5 1 0.5 1" }}
                    >
                        Open All
                    </Button>
                </Stack>
                <AccordionDetails>
                    {[...items].reverse().map((item, id) => {
                        let primary_string: string;
                        if (service === "iCare") {
                            const i = item as WorkflowItem;
                            if (isNotification) {
                                const date = i.created.slice(5, 10).replace("-", "/");
                                primary_string = `[${date}] ${i.requesting_op.substring(0, 2)} - ${i.request_type}`;
                            } else {
                                primary_string = `${i.tracking_id.slice(-2) === "KR" ? i.replying_op.substring(0, 2) : i.requesting_op.substring(0, 2)} - L${i.current_level} ${i.request_type}`;
                            }
                        } else {
                            const i = item as GcssItem;
                            if (isNotification) {
                                primary_string = `[${i.NotificationCreationDate}] ${i.OriginCountry} - ${i.NotificationReason}`;
                            } else {
                                primary_string = `${i.ItemId.slice(-2) === "KR" ? `${i.DestinationCountry}` : `${i.OriginCountry}`} - ${i.WorkflowLevel} ${i.RequestType}`;
                            }
                        }

                        return (
                            <Card style={{ margin: "0 0 1px" }} key={id}>
                                <ListItem dense={true} disablePadding={true} key={id}>
                                    <ListItemButton
                                        onClick={async () => {
                                            if (service === "iCare") await OpenNewTab(item.link);
                                            else {
                                                if (isNotification) await OpenNewTab(item.NotificationLink);
                                                else await OpenNewTab(item.WorkflowLink);
                                            }
                                        }}
                                    >
                                        <ListItemIcon>
                                            <OpenInBrowser />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={primary_string}
                                            secondary={service === "iCare" ? `${item.tracking_id}` : `${item.ItemId}`}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            </Card>
                        );
                    })}
                </AccordionDetails>
            </Accordion>
        </List>
    );
};
