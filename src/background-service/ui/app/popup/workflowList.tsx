import { NotificationIDs } from "@/background-service/lib/NotificationItem";
import { requestFetch } from "@/common/findTabs";
import { wait } from "@/common/utils";
import { GcssItem, isGcssItem, isWorkflowItem, WorkflowItem } from "@/content-scripts/pending-replies/dataWrapper";
import { ServiceNames } from "@/content-scripts/pending-replies/gcssReplies";
import { GCSSMessage, isGCSSMessage, isGCSSNotification } from "@/content-scripts/pending-replies/newGcssWrapper";
import { ExpandMore, OpenInBrowser } from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Card,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Typography,
} from "@mui/material";

interface WorkflowListProps {
    items: WorkflowItem[] | GcssItem[] | GCSSMessage[];
    type?: "replies" | "requests";
    author?: string;
    serviceType?: ServiceNames;
    key?: string;
}
export const WorkflowList = ({
    items,
    type = "replies",
    author = "",
    serviceType = ServiceNames.EMS,
    key = "",
}: WorkflowListProps) => {
    let service = "iCare";
    let isNotification = false;

    const [firstItem] = items;
    if (!items || !firstItem) return null;
    if (isGcssItem(firstItem)) {
        service = "GCSS";
        isNotification = firstItem.messageType === "NQ";
    } else if (isGCSSMessage(firstItem)) {
        service = "New GCSS";
        isNotification = isGCSSNotification(firstItem);
    } else {
        service = "iCare";
        isNotification = firstItem.isNotification;
    }

    let list_title =
        type === "replies" ? `${service} - ${serviceType} 발송 회신` : `${service} - ${serviceType} 도착 문의`;
    if (isNotification) list_title = list_title.replace("회신", "통지").replace("문의", "통지");
    list_title += `: ${items.length}건`;
    if (author !== "") list_title += ` (${author})`;

    const OpenNewTab = async (urlLink: string) => {
        const [current_tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        return await chrome.tabs.create({
            index: current_tab.index + 1,
            url: urlLink,
            active: false,
        });
    };

    const OpenAll = async () => {
        wait(1000 * 8).then(() => {
            console.log("Requesting fetch after opening all tabs");
            requestFetch();
        });
        chrome.notifications.clear(NotificationIDs.IMIC_PENDING_MESSAGES);
        // const reversed_items = [...items].reverse();
        const tab_promises = items.map(async (wf) => {
            let tab: chrome.tabs.Tab;
            if (isGcssItem(wf)) {
                tab = isNotification ? await OpenNewTab(wf.notificationLink) : await OpenNewTab(wf.workflowLink);
            } else if (isGCSSMessage(wf)) {
                tab = await OpenNewTab(wf.messageLink);
            } else {
                tab = await OpenNewTab(wf.link);
            }

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
        const reversed_items = [...items].reverse();
        const ids = reversed_items.map((item) =>
            isGcssItem(item) ? item.itemId : isGCSSMessage(item) ? item.itemId : item.trackingId,
        );
        const str_ids = ids.join("\n");
        void navigator.clipboard.writeText(str_ids);
    };

    const CopyCountries = () => {
        const reversed_items = [...items].reverse();
        const countries = reversed_items.map((item) => {
            if (isGcssItem(item)) {
                return type === "replies" && !isNotification ? item.destinationCountry : item.originCountry;
            } else if (isWorkflowItem(item)) {
                return type === "replies" && !isNotification
                    ? item.replyingOperator.substring(0, 2)
                    : item.requestingOperator.substring(0, 2);
            } else {
                return type === "replies" && !isNotification ? item.sendingCountry : item.receivingCountry;
            }
        });

        const str_ids = countries.join("\n");
        void navigator.clipboard.writeText(str_ids);
    };

    const onItemClick = async (item: WorkflowItem | GcssItem | GCSSMessage) => {
        wait(1000 * 8).then(() => {
            console.log("Requesting fetch after clicking item");
            requestFetch();
        });
        chrome.notifications.clear(NotificationIDs.IMIC_PENDING_MESSAGES);
        if (isWorkflowItem(item)) await OpenNewTab(item.link);
        else if (isGcssItem(item)) await OpenNewTab(isNotification ? item.notificationLink : item.workflowLink);
        else await OpenNewTab(item.messageLink);
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
                        let secondary_string: string;
                        if (isWorkflowItem(item)) {
                            const i = item;
                            secondary_string = i.trackingId;
                            if (isNotification) {
                                const date = i.created.slice(5, 10).replace("-", "/");
                                primary_string = `[${date}] ${i.requestingOperator.substring(0, 2)} - ${i.requestType}`;
                            } else {
                                primary_string = `${i.trackingId.slice(-2) === "KR" ? i.replyingOperator.substring(0, 2) : i.requestingOperator.substring(0, 2)} - L${i.currentLevel} ${i.requestType}`;
                            }
                        } else if (isGcssItem(item)) {
                            secondary_string = item.itemId;
                            if (isNotification) {
                                primary_string = `[${item.notificationCreationDate}] ${item.originCountry} - ${item.notificationReason}`;
                            } else {
                                primary_string = `${item.itemId.slice(-2) === "KR" ? item.destinationCountry : item.originCountry} - ${item.workflowLevel} ${item.requestType}`;
                            }
                        } else {
                            secondary_string = item.itemId;
                            if (isGCSSNotification(item)) {
                                const date = item.creationDate.split("T")[0].slice(5).replaceAll("-", "/");
                                const reason = item.reasonLabel.split(" ").at(-1);
                                const reasonCapitalized = reason
                                    ? reason.charAt(0).toUpperCase() + reason.slice(1)
                                    : "Unknown";
                                primary_string = `[${date}] ${item.sendingCountry} - ${reasonCapitalized}`;
                            } else {
                                primary_string = `${item.itemId.slice(-2) === "KR" ? item.sendingCountry : item.receivingCountry} - ${item.inquiryType} ${item.requestTypeMnemonic}`;
                            }
                        }

                        return (
                            <Card style={{ margin: "0 0 1px" }} key={key}>
                                <ListItem dense={true} disablePadding={true} key={id}>
                                    <ListItemButton onClick={() => onItemClick(item)}>
                                        <ListItemIcon>
                                            <OpenInBrowser />
                                        </ListItemIcon>
                                        <ListItemText primary={primary_string} secondary={secondary_string} />
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
