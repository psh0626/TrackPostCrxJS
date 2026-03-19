import { useEffect, useRef, useState } from "react";

import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GcssItem, WorkflowItem } from "../../background/pending-replies/dataWrapper";
import { ServiceNames, ServiceTypes } from "../../background/pending-replies/gcssReplies";
import { GCSSNotification, GCSSWorkflow } from "../../background/pending-replies/newGcssWrapper";
import { IMICSettings } from "../../lib/IMICSettings";
import { COMMANDS } from "../../lib/Message";
import PopupTrack from "../../lib/PopupTrack";
import { MyList, StyledTextField } from "../components/components";
class iCareState {
    replyItems: WorkflowItem[] = [];
    requestItems: WorkflowItem[] = [];
    notifInItems: WorkflowItem[] = [];
    notifOutItems: WorkflowItem[] = [];
}
class OldGcssState {
    replyItems: GcssItem[] = [];
    requestItems: GcssItem[] = [];
    notifInItems: GcssItem[] = [];
    notifOutItems: GcssItem[] = [];
}
class NewGcssState {
    replyItems: GCSSWorkflow[] = [];
    requestItems: GCSSWorkflow[] = [];
    notifInItems: GCSSNotification[] = [];
    notifOutItems: GCSSNotification[] = [];
}
async function loadSessionData<T>(key: COMMANDS): Promise<T[]> {
    const data = await chrome.storage.session.get(key).then((result) => result[key]);
    if (!data) {
        console.warn(`No data found in session storage for key: ${key}`);
    } else {
        console.log(`Data loaded from session storage for key: ${key}`, data);
    }
    return (data ?? []) as T[];
}
function PopUpApp() {
    const [inputState, setInputState] = useState({
        itemIdField: "",
        isValid: true,
    });

    const [icareState, setIcareState] = useState<iCareState>(new iCareState());
    const [oldGcssState, setOldGcssState] = useState<OldGcssState>(new OldGcssState());
    const [newGcssState, setNewGcssState] = useState<NewGcssState>(new NewGcssState());

    const settings = useRef<IMICSettings>(new IMICSettings());
    const textfield_ref = useRef<HTMLInputElement>(null);
    const initialized = useRef(false);
    const tracker = new PopupTrack();

    useEffect(() => {
        if (textfield_ref.current) {
            textfield_ref.current.focus();
        }

        void (async () => {
            await settings.current.loadOptions();
            const thisSettings = settings.current;

            const serviceOrder = [ServiceTypes.EMS, ServiceTypes.Parcel, ServiceTypes.Registered, ServiceTypes.KPacket];
            thisSettings.GcssServiceTypes = thisSettings.GcssServiceTypes.sort((a, b) => {
                return serviceOrder.indexOf(a) - serviceOrder.indexOf(b);
            });
            thisSettings.GcssRequestServiceTypes = thisSettings.GcssRequestServiceTypes.sort((a, b) => {
                return serviceOrder.indexOf(a) - serviceOrder.indexOf(b);
            });

            const nextIcareState = new iCareState();
            const nextOldGcssState = new OldGcssState();
            const nextNewGcssState = new NewGcssState();

            if (thisSettings.IcareUnreadReplies) {
                nextIcareState.replyItems = await loadSessionData<WorkflowItem>(COMMANDS.ICARE_UNREAD_REPLIES);
            }

            if (thisSettings.IcareUnreadRequests) {
                nextIcareState.requestItems = await loadSessionData<WorkflowItem>(COMMANDS.ICARE_UNREAD_REQUESTS);
            }

            if (thisSettings.GcssUnreadReplies) {
                nextOldGcssState.replyItems = await loadSessionData<GcssItem>(COMMANDS.GCSS_UNREAD_REPLIES);
                nextNewGcssState.replyItems = await loadSessionData<GCSSWorkflow>(COMMANDS.NEW_GCSS_UNREAD_REPLIES);
            }

            if (thisSettings.GcssUnreadRequests) {
                nextOldGcssState.requestItems = await loadSessionData<GcssItem>(COMMANDS.GCSS_UNREAD_REQUESTS);
                nextNewGcssState.requestItems = await loadSessionData<GCSSWorkflow>(COMMANDS.NEW_GCSS_UNREAD_REQUESTS);
            }

            if (thisSettings.IcareUnreadNotificationInbound) {
                nextIcareState.notifInItems = await loadSessionData<WorkflowItem>(COMMANDS.ICARE_UNREAD_NOTIF_INBOUND);
            }

            if (thisSettings.IcareUnreadNotificationOutbound) {
                nextIcareState.notifOutItems = await loadSessionData<WorkflowItem>(
                    COMMANDS.ICARE_UNREAD_NOTIF_OUTBOUND,
                );
            }

            if (thisSettings.GcssUnreadNotificationInbound) {
                nextOldGcssState.notifInItems = await loadSessionData<GcssItem>(COMMANDS.GCSS_UNREAD_NOTIF_INBOUND);
                nextNewGcssState.notifInItems = await loadSessionData<GCSSNotification>(
                    COMMANDS.NEW_GCSS_UNREAD_NOTIF_INBOUND,
                );
            }

            if (thisSettings.GcssUnreadNotificationOutbound) {
                nextOldGcssState.notifOutItems = await loadSessionData<GcssItem>(COMMANDS.GCSS_UNREAD_NOTIF_OUTBOUND);
                nextNewGcssState.notifOutItems = await loadSessionData<GCSSNotification>(
                    COMMANDS.NEW_GCSS_UNREAD_NOTIF_OUTBOUND,
                );
            }

            setIcareState(nextIcareState);
            setOldGcssState(nextOldGcssState);
            setNewGcssState(nextNewGcssState);

            // chrome.storage.session.onChanged.addListener((dict) => {
            //   set_workflow_items(dict.ICARE_UNREAD_REPLIES.newValue as WorkflowItem[]);
            //   set_gcss_items(dict.GCSS_UNREAD_REPLIES.newValue as GcssItem[]);
            // });
        })();
    }, []);

    const CheckValue = (target: HTMLInputElement | HTMLTextAreaElement) => {
        const pretty_value = target.value.trim().toUpperCase();
        setInputState({
            itemIdField: pretty_value,
            isValid: pretty_value === "" ? true : target.validity.valid,
        });
    };

    const OpenSidePanel = () => {
        chrome.windows.getCurrent(async (w) => {
            await tracker.SetItemId(inputState.itemIdField);
            await chrome.sidePanel.open({ windowId: w.id! });
            window.close();
        });
        console.log("Popup sidepanel opened state:", tracker);
    };

    // Helper for empty state
    const renderEmpty = (msg: string) => (
        <Stack alignItems="center">
            <Typography variant="subtitle2" color="initial" sx={{ userSelect: "none", fontWeight: "300" }}>
                {msg}
            </Typography>
        </Stack>
    );

    // Generic list renderer
    const renderList = (show: boolean, items: any[], emptyMsg: string, props: any) => {
        if (!show) return null;
        if (!items || items.length < 1) return renderEmpty(emptyMsg);
        return <MyList {...props} items={items} />;
    };

    // GCSS requests
    const renderOldGcssRequests = () =>
        renderList(settings.current.GcssUnreadRequests, oldGcssState.requestItems, "GCSS 도착 회신: 모두 읽음 ✔️", {
            type: "requests",
            service: "GCSS",
            children: settings.current.GcssRequestServiceTypes.map((serv) => (
                <MyList
                    key={serv}
                    items={oldGcssState.requestItems.filter((el) => el.serviceType === serv)}
                    type="requests"
                    serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                />
            )),
        });

    // GCSS replies
    const renderOldGcssReplies = () => {
        if (!settings.current.GcssUnreadReplies) return null;
        if (oldGcssState.replyItems.length < 1) return renderEmpty("GCSS 발송 회신: 모두 읽음 ✔️");
        if (settings.current.GcssServiceTypes.length === 1) {
            if (settings.current.GcssAuthor.length <= 1) {
                return <MyList items={oldGcssState.replyItems} type="replies" />;
            } else {
                return settings.current.GcssAuthor.map((user) => (
                    <MyList
                        key={user}
                        items={oldGcssState.replyItems.filter((el) =>
                            el.requestAuthor.toLowerCase().includes(user.toLowerCase()),
                        )}
                        type="replies"
                        author={user}
                        serviceType={ServiceNames[settings.current.GcssServiceTypes[0] as keyof typeof ServiceNames]}
                    />
                ));
            }
        } else {
            if (settings.current.GcssAuthor.length <= 1) {
                return settings.current.GcssServiceTypes.map((serv) => (
                    <MyList
                        key={serv}
                        items={oldGcssState.replyItems}
                        type="replies"
                        author=""
                        serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                    />
                ));
            } else {
                return settings.current.GcssServiceTypes.flatMap((serv) =>
                    settings.current.GcssAuthor.map((user) => (
                        <MyList
                            key={`${serv}-${user}`}
                            items={oldGcssState.replyItems.filter(
                                (el) =>
                                    el.serviceType === serv &&
                                    el.requestAuthor.toLowerCase().includes(user.toLowerCase()),
                            )}
                            type="replies"
                            author={user}
                            serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                        />
                    )),
                );
            }
        }
    };

    // GCSS inbound notifications
    const renderOldGcssInboundNotifications = () =>
        renderList(
            settings.current.GcssUnreadRequests && settings.current.GcssUnreadNotificationInbound,
            oldGcssState.notifInItems,
            "GCSS 도착 통지: 모두 읽음 ✔️",
            {
                type: "requests",
                service: "GCSS",
            },
        );

    // GCSS outbound notifications
    const renderOldGcssOutboundNotifications = () =>
        renderList(
            settings.current.GcssUnreadReplies && settings.current.GcssUnreadNotificationOutbound,
            oldGcssState.notifOutItems,
            "GCSS 발송 통지: 모두 읽음 ✔️",
            {
                type: "replies",
                service: "GCSS",
            },
        );

    const renderIcareRequests = () =>
        renderList(settings.current.IcareUnreadRequests, icareState.requestItems, "iCare 도착 문의: 모두 읽음 ✔️", {
            type: "requests",
            service: "iCare",
        });
    const renderIcareReplies = () => {
        if (!settings.current.IcareUnreadReplies) return null;
        if (icareState.replyItems.length < 1) return renderEmpty("iCare 발송 회신: 모두 읽음 ✔️");
        if (settings.current.IcareAuthor.length <= 1) {
            return <MyList items={icareState.replyItems} type="replies" />;
        } else {
            return settings.current.IcareAuthor.map((user) => (
                <MyList
                    key={user}
                    items={icareState.replyItems.filter((el) => el.author.toLowerCase().includes(user.toLowerCase()))}
                    type="replies"
                    author={user}
                />
            ));
        }
    };
    // iCare inbound notifications
    const renderIcareInboundNotifications = () =>
        renderList(
            settings.current.IcareUnreadRequests && settings.current.IcareUnreadNotificationInbound,
            icareState.notifInItems,
            "iCare 도착 통지: 모두 읽음 ✔️",
            {
                type: "requests",
                service: "iCare",
            },
        );

    // iCare outbound notifications
    const renderIcareOutboundNotifications = () =>
        renderList(
            settings.current.IcareUnreadReplies && settings.current.IcareUnreadNotificationOutbound,
            icareState.notifOutItems,
            "iCare 발송 통지: 모두 읽음 ✔️",
            {
                type: "replies",
                service: "iCare",
            },
        );

    const renderNewGcssRequests = () =>
        renderList(settings.current.GcssUnreadRequests, newGcssState.requestItems, "GCSS 도착 회신: 모두 읽음 ✔️", {
            type: "requests",
            service: "GCSS",
            children: settings.current.GcssRequestServiceTypes.map((serv) => (
                <MyList
                    key={serv}
                    items={newGcssState.requestItems.filter((el) => el.product === serv)}
                    type="requests"
                    serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                />
            )),
        });
    const renderNewGcssReplies = () => {
        if (!settings.current.GcssUnreadReplies) return null;
        if (newGcssState.replyItems.length < 1) return renderEmpty("New GCSS 발송 회신: 모두 읽음 ✔️");
        if (settings.current.GcssServiceTypes.length === 1) {
            if (settings.current.GcssAuthor.length <= 1) {
                return <MyList items={newGcssState.replyItems} type="replies" />;
            } else {
                return settings.current.GcssAuthor.map((user) => (
                    <MyList
                        key={user}
                        items={newGcssState.replyItems.filter((el) =>
                            "inquiryAuthorName" in el
                                ? el.inquiryAuthorName.toLowerCase().includes(user.toLowerCase())
                                : false,
                        )}
                        type="replies"
                        author={user}
                        serviceType={ServiceNames[settings.current.GcssServiceTypes[0] as keyof typeof ServiceNames]}
                    />
                ));
            }
        } else {
            if (settings.current.GcssAuthor.length <= 1) {
                return settings.current.GcssServiceTypes.map((serv) => (
                    <MyList
                        key={serv}
                        items={newGcssState.replyItems}
                        type="replies"
                        author=""
                        serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                    />
                ));
            } else {
                return settings.current.GcssServiceTypes.flatMap((serv) =>
                    settings.current.GcssAuthor.map((user) => (
                        <MyList
                            key={`${serv}-${user}`}
                            items={newGcssState.replyItems.filter(
                                (el) =>
                                    el.product === serv &&
                                    "inquiryAuthorName" in el &&
                                    el.inquiryAuthorName.toLowerCase().includes(user.toLowerCase()),
                            )}
                            type="replies"
                            author={user}
                            serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                        />
                    )),
                );
            }
        }
    };
    const renderNewGcssInboundNotifications = () =>
        renderList(
            settings.current.GcssUnreadRequests && settings.current.GcssUnreadNotificationInbound,
            newGcssState.notifInItems,
            "GCSS 도착 통지: 모두 읽음 ✔️",
            {
                type: "requests",
                service: "GCSS",
            },
        );
    const renderNewGcssOutboundNotifications = () =>
        renderList(
            settings.current.GcssUnreadReplies && settings.current.GcssUnreadNotificationOutbound,
            newGcssState.notifOutItems,
            "GCSS 발송 통지: 모두 읽음 ✔️",
            {
                type: "replies",
                service: "GCSS",
            },
        );

    return (
        <Stack spacing={0} margin={6} marginTop={0} width="300px">
            <StyledTextField
                inputRef={textfield_ref}
                variant="outlined"
                label="Tracking Number"
                error={!inputState.isValid}
                onFocus={(e) => e.target.select()}
                slotProps={{
                    htmlInput: {
                        style: { textTransform: "uppercase", textAlign: "center" },
                        maxLength: 13,
                        pattern: String.raw`[a-zA-Z]{2}\d{9}[a-zA-Z]{2}`,
                    },
                    inputLabel: {
                        style: { textAlign: "center" },
                    },
                    formHelperText: {
                        style: { textAlign: "center" },
                    },
                }}
                helperText={inputState.isValid ? " " : "Invalid Tracking Number"}
                onChange={(e) => CheckValue(e.target)}
                onKeyUp={(e) => {
                    if (e.key === "Enter" && inputState.isValid) {
                        OpenSidePanel();
                    }
                    return true;
                }}
            />

            <Divider style={{ margin: "15px 0" }} />
            {renderOldGcssRequests()}

            {renderOldGcssInboundNotifications()}

            {renderOldGcssReplies()}

            {renderOldGcssOutboundNotifications()}

            {(settings.current.GcssUnreadReplies || settings.current.GcssUnreadRequests) &&
            (settings.current.IcareUnreadReplies || settings.current.IcareUnreadRequests) ? (
                <Divider variant="middle" sx={{ m: "15px" }}></Divider>
            ) : null}

            {renderIcareRequests()}

            {renderIcareInboundNotifications()}

            {renderIcareReplies()}

            {renderIcareOutboundNotifications()}

            {(settings.current.IcareUnreadReplies || settings.current.IcareUnreadRequests) &&
            (newGcssState.replyItems.length > 0 || newGcssState.requestItems.length > 0) ? (
                <Divider variant="middle" sx={{ m: "15px" }}></Divider>
            ) : null}
            {renderNewGcssRequests()}
            {renderNewGcssInboundNotifications()}
            {renderNewGcssReplies()}
            {renderNewGcssOutboundNotifications()}
        </Stack>
    );
}

export default PopUpApp;
