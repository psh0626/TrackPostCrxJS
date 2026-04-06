import { IMICSettings } from "@/common/IMICSettings";
import { CMD } from "@/common/message-hub/Message";
import StorageKey from "@/common/StorageKey";
import { CheckCircle } from "@mui/icons-material";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { GcssItem, WorkflowItem } from "../../../content-scripts/pending-replies/dataWrapper";
import { ServiceNames, ServiceTypes } from "../../../content-scripts/pending-replies/gcssReplies";
import { GCSSNotification, GCSSWorkflow } from "../../../content-scripts/pending-replies/newGcssWrapper";
import PopupTrack from "../../lib/popupTrack";
import StyledTextField from "./components/styledTextField";
import { WorkflowList } from "./popup/workflowList";

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
async function loadSessionData<T>(key: CMD): Promise<T[]> {
    const data = await new StorageKey(key).fromSession.get<T[]>();
    if (!data) {
        console.log(`No data found in session storage for key: ${key}`);
    } else {
        console.log(`Data loaded from session storage for key: ${key}`, data);
    }
    return data ?? [];
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
    const tracker = new PopupTrack();
    const idNumber = useRef(0);

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
                nextIcareState.replyItems = await loadSessionData<WorkflowItem>(CMD.ICARE_UNREAD_REPLIES);
            }

            if (thisSettings.IcareUnreadRequests) {
                nextIcareState.requestItems = await loadSessionData<WorkflowItem>(CMD.ICARE_UNREAD_REQUESTS);
            }

            if (thisSettings.GcssUnreadReplies) {
                nextOldGcssState.replyItems = await loadSessionData<GcssItem>(CMD.GCSS_UNREAD_REPLIES);
                nextNewGcssState.replyItems = await loadSessionData<GCSSWorkflow>(CMD.NEW_GCSS_UNREAD_REPLIES);
            }

            if (thisSettings.GcssUnreadRequests) {
                nextOldGcssState.requestItems = await loadSessionData<GcssItem>(CMD.GCSS_UNREAD_REQUESTS);
                nextNewGcssState.requestItems = await loadSessionData<GCSSWorkflow>(CMD.NEW_GCSS_UNREAD_REQUESTS);
            }

            if (thisSettings.IcareUnreadNotificationInbound) {
                nextIcareState.notifInItems = await loadSessionData<WorkflowItem>(CMD.ICARE_UNREAD_NOTIF_INBOUND);
            }

            if (thisSettings.IcareUnreadNotificationOutbound) {
                nextIcareState.notifOutItems = await loadSessionData<WorkflowItem>(CMD.ICARE_UNREAD_NOTIF_OUTBOUND);
            }

            if (thisSettings.GcssUnreadNotificationInbound) {
                nextOldGcssState.notifInItems = await loadSessionData<GcssItem>(CMD.GCSS_UNREAD_NOTIF_INBOUND);
                nextNewGcssState.notifInItems = await loadSessionData<GCSSNotification>(
                    CMD.NEW_GCSS_UNREAD_NOTIF_INBOUND,
                );
            }

            if (thisSettings.GcssUnreadNotificationOutbound) {
                nextOldGcssState.notifOutItems = await loadSessionData<GcssItem>(CMD.GCSS_UNREAD_NOTIF_OUTBOUND);
                nextNewGcssState.notifOutItems = await loadSessionData<GCSSNotification>(
                    CMD.NEW_GCSS_UNREAD_NOTIF_OUTBOUND,
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
        <Typography variant="subtitle2" color="initial" sx={{ userSelect: "none", fontWeight: "300" }}>
            <CheckCircle fontSize="small" color="info" sx={{ verticalAlign: "middle", mr: 0.5 }} />
            {msg}
        </Typography>
    );

    // Generic list renderer
    const renderList = (show: boolean, items: any[], emptyMsg: string, props: any) => {
        if (!show) return null;
        if (!items || items.length < 1) return emptyMsg ? renderEmpty(emptyMsg) : null;
        return <WorkflowList {...props} items={items} key={`popup-list-${idNumber.current++}`} />;
    };

    // GCSS requests
    const renderOldGcssRequests = () => {
        if (!settings.current.GcssUnreadRequests) return null;
        if (oldGcssState.requestItems.length < 1) return null;
        return settings.current.GcssRequestServiceTypes.map((serv) => (
            <WorkflowList
                key={`popup-list-${idNumber.current++}`}
                items={oldGcssState.requestItems.filter((el) => el.serviceType === serv)}
                type="requests"
                serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
            />
        ));
    };

    // GCSS replies
    const renderOldGcssReplies = () => {
        if (!settings.current.GcssUnreadReplies) return null;
        if (oldGcssState.replyItems.length < 1) return null;
        if (settings.current.GcssServiceTypes.length === 1) {
            if (settings.current.GcssAuthor.length <= 1) {
                return (
                    <WorkflowList
                        items={oldGcssState.replyItems}
                        type="replies"
                        key={`popup-list-${idNumber.current++}`}
                    />
                );
            } else {
                return settings.current.GcssAuthor.map((user) => (
                    <WorkflowList
                        key={`popup-list-${idNumber.current++}`}
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
                    <WorkflowList
                        key={`popup-list-${idNumber.current++}`}
                        items={oldGcssState.replyItems.filter((el) => el.serviceType === serv)}
                        type="replies"
                        author=""
                        serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                    />
                ));
            } else {
                return settings.current.GcssServiceTypes.flatMap((serv) =>
                    settings.current.GcssAuthor.map((user) => (
                        <WorkflowList
                            key={`popup-list-${idNumber.current++}`}
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
            "",
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
            "",
            {
                type: "replies",
                service: "GCSS",
            },
        );
    const renderNewGcssRequests = () => {
        if (!settings.current.GcssUnreadRequests) return null;
        if (newGcssState.requestItems.length < 1) return null;
        return settings.current.GcssRequestServiceTypes.map((serv) => (
            <WorkflowList
                key={serv}
                items={newGcssState.requestItems.filter((el) => el.product === serv)}
                type="requests"
                serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
            />
        ));
    };

    const renderNewGcssReplies = () => {
        if (!settings.current.GcssUnreadReplies) return null;
        if (newGcssState.replyItems.length < 1) return null;
        if (settings.current.GcssServiceTypes.length === 1) {
            if (settings.current.GcssAuthor.length <= 1) {
                return (
                    <WorkflowList
                        items={newGcssState.replyItems}
                        type="replies"
                        key={`popup-list-${idNumber.current++}`}
                    />
                );
            } else {
                return settings.current.GcssAuthor.map((user) => (
                    <WorkflowList
                        key={`popup-list-${idNumber.current++}`}
                        items={newGcssState.replyItems.filter((el) =>
                            el.inquiryAuthorName.toLowerCase().includes(user.toLowerCase()),
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
                    <WorkflowList
                        key={`popup-list-${idNumber.current++}`}
                        items={newGcssState.replyItems.filter((el) => el.product === serv)}
                        type="replies"
                        author=""
                        serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                    />
                ));
            } else {
                return settings.current.GcssServiceTypes.flatMap((serv) =>
                    settings.current.GcssAuthor.map((user) => (
                        <WorkflowList
                            key={`popup-list-${idNumber.current++}`}
                            items={newGcssState.replyItems.filter(
                                (el) =>
                                    el.product === serv &&
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
            "",
            {
                type: "requests",
                service: "GCSS",
            },
        );
    const renderNewGcssOutboundNotifications = () =>
        renderList(
            settings.current.GcssUnreadReplies && settings.current.GcssUnreadNotificationOutbound,
            newGcssState.notifOutItems,
            "",
            {
                type: "replies",
                service: "GCSS",
            },
        );

    const renderIcareRequests = () =>
        renderList(settings.current.IcareUnreadRequests, icareState.requestItems, "iCare 도착 문의", {
            type: "requests",
            service: "iCare",
        });
    const renderIcareReplies = () => {
        if (!settings.current.IcareUnreadReplies) return null;
        if (icareState.replyItems.length < 1) return renderEmpty("iCare 발송 회신");
        if (settings.current.IcareAuthor.length <= 1) {
            return (
                <WorkflowList items={icareState.replyItems} type="replies" key={`popup-list-${idNumber.current++}`} />
            );
        } else {
            return settings.current.IcareAuthor.map((user) => (
                <WorkflowList
                    key={`popup-list-${idNumber.current++}`}
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
            "iCare 도착 통지",
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
            "iCare 발송 통지",
            {
                type: "replies",
                service: "iCare",
            },
        );

    const renderOrder = [
        {
            key: "newGcssRequests",
            count: newGcssState.requestItems.length,
            render: renderNewGcssRequests,
        },
        {
            key: "newGcssReplies",
            count: newGcssState.replyItems.length,
            render: renderNewGcssReplies,
        },
        {
            key: "newGcssInboundNotifications",
            count: newGcssState.notifInItems.length,
            render: renderNewGcssInboundNotifications,
        },
        {
            key: "newGcssOutboundNotifications",
            count: newGcssState.notifOutItems.length,
            render: renderNewGcssOutboundNotifications,
        },
        {
            key: "gcssRequests",
            count: oldGcssState.requestItems.length + newGcssState.requestItems.length,
            render: () => {
                if (!settings.current.GcssUnreadRequests) return null;
                if (oldGcssState.requestItems.length + newGcssState.requestItems.length < 1)
                    return renderEmpty("GCSS 도착 문의");
                return renderOldGcssRequests();
            },
        },
        {
            key: "gcssReplies",
            count: oldGcssState.replyItems.length + newGcssState.replyItems.length,
            render: () => {
                if (!settings.current.GcssUnreadReplies) return null;
                if (oldGcssState.replyItems.length + newGcssState.replyItems.length < 1)
                    return renderEmpty("GCSS 발송 회신");
                return renderOldGcssReplies();
            },
        },
        {
            key: "gcssInboundNotifications",
            count: oldGcssState.notifInItems.length + newGcssState.notifInItems.length,
            render: () => {
                if (!settings.current.GcssUnreadRequests || !settings.current.GcssUnreadNotificationInbound)
                    return null;
                if (oldGcssState.notifInItems.length + newGcssState.notifInItems.length < 1)
                    return renderEmpty("GCSS 도착 통지");
                return renderOldGcssInboundNotifications();
            },
        },
        {
            key: "gcssOutboundNotifications",
            count: oldGcssState.notifOutItems.length + newGcssState.notifOutItems.length,
            render: () => {
                if (!settings.current.GcssUnreadReplies || !settings.current.GcssUnreadNotificationOutbound)
                    return null;
                if (oldGcssState.notifOutItems.length + newGcssState.notifOutItems.length < 1)
                    return renderEmpty("GCSS 발송 통지");
                return renderOldGcssOutboundNotifications();
            },
        },
        {
            key: "icareRequests",
            count: icareState.requestItems.length,
            render: renderIcareRequests,
        },
        {
            key: "icareReplies",
            count: icareState.replyItems.length,
            render: renderIcareReplies,
        },
        {
            key: "icareInboundNotifications",
            count: icareState.notifInItems.length,
            render: renderIcareInboundNotifications,
        },
        {
            key: "icareOutboundNotifications",
            count: icareState.notifOutItems.length,
            render: renderIcareOutboundNotifications,
        },
    ];

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
            {renderOrder.every((el) => el.count < 1) && (
                <Stack
                    width="100%"
                    justifyContent={"center"}
                    alignItems={"center"}
                    sx={{ minHeight: "50px", textAlign: "center" }}
                >
                    <Typography variant="caption" color="textDisabled" sx={{ userSelect: "none", fontWeight: "500" }}>
                        새로 온 메시지가 여기에 표시됩니다.
                    </Typography>
                </Stack>
            )}
            {renderOrder.filter((item) => item.render() !== null).map((item) => item.count > 0 && item.render())}

            {renderOrder.some((item) => item.count < 1 && item.render() !== null) ? (
                <Divider variant="middle" sx={{ mt: "7px", mb: "4px" }}>
                    <Typography variant="caption" color="initial" sx={{ userSelect: "none", fontWeight: "300" }}>
                        모두 읽음
                    </Typography>
                </Divider>
            ) : (
                <Divider variant="middle" sx={{ m: "15px" }}></Divider>
            )}

            <Stack direction="row" width="100%" justifyContent="center" sx={{ alignSelf: "center" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gridColumnGap: "18px",
                        width: "fit-content",
                        rowGap: "5px",
                        columnGap: "15px",
                    }}
                >
                    {renderOrder
                        .filter((item) => item.count < 1 && item.render() !== null)
                        .map((item, idx, arr) => {
                            const content = item.render();
                            const isLastSingle = (idx === arr.length - 1 && idx % 2 === 0) || arr.length === 1;
                            return (
                                <div
                                    key={idx}
                                    data-idx={`idx-${idx}`}
                                    style={{
                                        gridColumn: isLastSingle ? "span 2" : "span 1",
                                        justifySelf: isLastSingle ? "center" : "start",
                                    }}
                                >
                                    {content}
                                </div>
                            );
                        })}
                </div>
            </Stack>
        </Stack>
    );
}

export default PopUpApp;
