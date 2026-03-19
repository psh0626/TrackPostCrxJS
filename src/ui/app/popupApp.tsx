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

function PopUpApp() {
    const [inputState, setInputState] = useState({
        itemIdField: "",
        isValid: true,
    });

    const [icareState, setIcareState] = useState({
        items: [] as WorkflowItem[],
        reqItems: [] as WorkflowItem[],
        notifInItems: [] as WorkflowItem[],
        notifOutItems: [] as WorkflowItem[],
        author: [] as string[],
    });

    const [gcssState, setGcssState] = useState({
        items: [] as GcssItem[],
        reqItems: [] as GcssItem[],
        notifInItems: [] as GcssItem[],
        notifOutItems: [] as GcssItem[],
        author: [] as string[],
        services: [ServiceTypes.EMS] as ServiceTypes[],
        reqServices: [ServiceTypes.EMS] as ServiceTypes[],
    });

    const [newGcssState, setNewGcssState] = useState({
        items: [] as GCSSWorkflow[],
        reqItems: [] as GCSSWorkflow[],
        notifInItems: [] as GCSSNotification[],
        notifOutItems: [] as GCSSNotification[],
    });

    const [flags, setFlags] = useState({
        icare: {
            rep: false,
            req: false,
            notifIn: false,
            notifOut: false,
        },
        gcss: {
            rep: false,
            req: false,
            notifIn: false,
            notifOut: false,
        },
    });

    const textfield_ref = useRef<HTMLInputElement>(null);
    const settings = useRef(new IMICSettings());
    const tracker = new PopupTrack();

    // const IncludesOneOf = (target: string, search_strings: string[]) => {
    //   return search_strings.some((item) => target.toLowerCase().includes(item.toLowerCase()));
    // };
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

    useEffect(() => {
        if (textfield_ref.current) {
            textfield_ref.current.focus();
        }

        void (async () => {
            await settings.current.loadOptions();
            const nextFlags = {
                icare: {
                    rep: settings.current.IcareUnreadReplies,
                    req: settings.current.IcareUnreadRequests,
                    notifIn: settings.current.IcareUnreadNotificationInbound,
                    notifOut: settings.current.IcareUnreadNotificationOutbound,
                },
                gcss: {
                    rep: settings.current.GcssUnreadReplies,
                    req: settings.current.GcssUnreadRequests,
                    notifIn: settings.current.GcssUnreadNotificationInbound,
                    notifOut: settings.current.GcssUnreadNotificationOutbound,
                },
            };

            const nextIcareState = {
                items: [] as WorkflowItem[],
                reqItems: [] as WorkflowItem[],
                notifInItems: [] as WorkflowItem[],
                notifOutItems: [] as WorkflowItem[],
                author: settings.current.IcareAuthor,
            };

            const nextGcssState = {
                items: [] as GcssItem[],
                reqItems: [] as GcssItem[],
                notifInItems: [] as GcssItem[],
                notifOutItems: [] as GcssItem[],
                author: settings.current.GcssAuthor,
                services: [...settings.current.GcssServiceTypes].sort((a, b) => {
                    const serviceOrder = [
                        ServiceTypes.EMS,
                        ServiceTypes.Parcel,
                        ServiceTypes.Registered,
                        ServiceTypes.KPacket,
                    ];
                    return serviceOrder.indexOf(a) - serviceOrder.indexOf(b);
                }),
                reqServices: [...settings.current.GcssRequestServiceTypes].sort((a, b) => {
                    const serviceOrder = [
                        ServiceTypes.EMS,
                        ServiceTypes.Parcel,
                        ServiceTypes.KPacket,
                        ServiceTypes.Registered,
                        ServiceTypes.Insured,
                    ];
                    return serviceOrder.indexOf(a) - serviceOrder.indexOf(b);
                }),
            };

            const nextNewGcssState = {
                items: [] as GCSSWorkflow[],
                reqItems: [] as GCSSWorkflow[],
                notifInItems: [] as GCSSNotification[],
                notifOutItems: [] as GCSSNotification[],
            };

            if (settings.current.IcareUnreadReplies) {
                const dict = (await chrome.storage.session.get("ICARE_UNREAD_REPLIES"))
                    .ICARE_UNREAD_REPLIES as WorkflowItem[];

                if (typeof dict !== "undefined" && dict.length > 0) {
                    nextIcareState.items = dict;
                    console.log("icare replies loaded from storage local: ", dict);
                } else {
                    console.log("icare replies  count is 0 or below");
                }
            }

            if (settings.current.IcareUnreadRequests) {
                const dict = (await chrome.storage.session.get("ICARE_UNREAD_REQUESTS"))
                    .ICARE_UNREAD_REQUESTS as WorkflowItem[];
                if (typeof dict !== "undefined" && dict.length > 0) {
                    nextIcareState.reqItems = dict;
                }
            }

            if (settings.current.GcssUnreadReplies) {
                const dict = (await chrome.storage.session.get("GCSS_UNREAD_REPLIES"))
                    .GCSS_UNREAD_REPLIES as GcssItem[];
                if (typeof dict !== "undefined" && dict.length > 0) {
                    nextGcssState.items = dict;
                }
                const dict2 = (await chrome.storage.session.get(COMMANDS.NEW_GCSS_UNREAD_REPLIES))[
                    COMMANDS.NEW_GCSS_UNREAD_REPLIES
                ] as GCSSWorkflow[];
                if (typeof dict2 !== "undefined" && dict2.length > 0) {
                    nextNewGcssState.items = dict2;
                }
            }

            if (settings.current.GcssUnreadRequests) {
                const dict = (await chrome.storage.session.get("GCSS_UNREAD_REQUESTS"))
                    .GCSS_UNREAD_REQUESTS as GcssItem[];
                if (typeof dict !== "undefined" && dict.length > 0) {
                    nextGcssState.reqItems = dict;
                }
                const dict2 = (await chrome.storage.session.get(COMMANDS.NEW_GCSS_UNREAD_REQUESTS))[
                    COMMANDS.NEW_GCSS_UNREAD_REQUESTS
                ] as GCSSWorkflow[];
                if (typeof dict2 !== "undefined" && dict2.length > 0) {
                    nextNewGcssState.reqItems = dict2;
                }
            }

            if (settings.current.IcareUnreadNotificationInbound) {
                const dict = (await chrome.storage.session.get(COMMANDS.ICARE_UNREAD_NOTIF_INBOUND))[
                    COMMANDS.ICARE_UNREAD_NOTIF_INBOUND
                ] as WorkflowItem[];
                if (typeof dict !== "undefined" && dict.length > 0) {
                    nextIcareState.notifInItems = dict;
                }
            }

            if (settings.current.IcareUnreadNotificationOutbound) {
                const dict = (await chrome.storage.session.get(COMMANDS.ICARE_UNREAD_NOTIF_OUTBOUND))[
                    COMMANDS.ICARE_UNREAD_NOTIF_OUTBOUND
                ] as WorkflowItem[];
                if (typeof dict !== "undefined" && dict.length > 0) {
                    nextIcareState.notifOutItems = dict;
                }
            }

            if (settings.current.GcssUnreadNotificationInbound) {
                const dict = (await chrome.storage.session.get(COMMANDS.GCSS_UNREAD_NOTIF_INBOUND))[
                    COMMANDS.GCSS_UNREAD_NOTIF_INBOUND
                ] as GcssItem[];
                if (typeof dict !== "undefined" && dict.length > 0) {
                    nextGcssState.notifInItems = dict;
                }
                const dict2 = (await chrome.storage.session.get(COMMANDS.NEW_GCSS_UNREAD_NOTIF_INBOUND))[
                    COMMANDS.NEW_GCSS_UNREAD_NOTIF_INBOUND
                ] as GCSSNotification[];
                if (typeof dict2 !== "undefined" && dict2.length > 0) {
                    nextNewGcssState.notifInItems = dict2;
                }
            }

            if (settings.current.GcssUnreadNotificationOutbound) {
                const dict = (await chrome.storage.session.get(COMMANDS.GCSS_UNREAD_NOTIF_OUTBOUND))[
                    COMMANDS.GCSS_UNREAD_NOTIF_OUTBOUND
                ] as GcssItem[];
                if (typeof dict !== "undefined" && dict.length > 0) {
                    nextGcssState.notifOutItems = dict;
                }
                const dict2 = (await chrome.storage.session.get(COMMANDS.NEW_GCSS_UNREAD_NOTIF_OUTBOUND))[
                    COMMANDS.NEW_GCSS_UNREAD_NOTIF_OUTBOUND
                ] as GCSSNotification[];
                if (typeof dict2 !== "undefined" && dict2.length > 0) {
                    nextNewGcssState.notifOutItems = dict2;
                }
            }

            setFlags(nextFlags);
            setIcareState(nextIcareState);
            setGcssState(nextGcssState);
            setNewGcssState(nextNewGcssState);

            // chrome.storage.session.onChanged.addListener((dict) => {
            //   set_workflow_items(dict.ICARE_UNREAD_REPLIES.newValue as WorkflowItem[]);
            //   set_gcss_items(dict.GCSS_UNREAD_REPLIES.newValue as GcssItem[]);
            // });
        })();
    }, []);

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
    const render_gcss_requests = () =>
        renderList(flags.gcss.req, gcssState.reqItems, "GCSS 도착 회신: 모두 읽음 ✔️", {
            type: "requests",
            service: "GCSS",
            serviceType: undefined,
            children: gcssState.reqServices.map((serv) => (
                <MyList
                    key={serv}
                    items={gcssState.reqItems.filter((el) => el.serviceType === serv)}
                    type="requests"
                    service="GCSS"
                    serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                />
            )),
        });

    // GCSS replies
    const render_gcss_replies = () => {
        if (!flags.gcss.rep) return null;
        if (gcssState.items.length < 1) return renderEmpty("GCSS 발송 회신: 모두 읽음 ✔️");
        if (gcssState.services.length === 1) {
            if (gcssState.author.length <= 1) {
                return (
                    <MyList
                        items={gcssState.items.filter((el) => el.serviceType === gcssState.services[0])}
                        type="replies"
                        service="GCSS"
                    />
                );
            } else {
                return gcssState.author.map((user) => (
                    <MyList
                        key={user}
                        items={gcssState.items.filter((el) =>
                            el.requestAuthor.toLowerCase().includes(user.toLowerCase()),
                        )}
                        type="replies"
                        service="GCSS"
                        author={user}
                        serviceType={ServiceNames[gcssState.services[0] as keyof typeof ServiceNames]}
                    />
                ));
            }
        } else {
            if (gcssState.author.length <= 1) {
                return gcssState.services.map((serv) => (
                    <MyList
                        key={serv}
                        items={gcssState.items.filter((el) => el.serviceType === serv)}
                        type="replies"
                        service="GCSS"
                        author=""
                        serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                    />
                ));
            } else {
                return gcssState.services.flatMap((serv) =>
                    gcssState.author.map((user) => (
                        <MyList
                            key={`${serv}-${user}`}
                            items={gcssState.items.filter(
                                (el) =>
                                    el.serviceType === serv &&
                                    el.requestAuthor.toLowerCase().includes(user.toLowerCase()),
                            )}
                            type="replies"
                            service="GCSS"
                            author={user}
                            serviceType={ServiceNames[serv as keyof typeof ServiceNames]}
                        />
                    )),
                );
            }
        }
    };

    // GCSS inbound notifications
    const render_gcss_inbound_notifications = () =>
        renderList(flags.gcss.req && flags.gcss.notifIn, gcssState.notifInItems, "GCSS 도착 통지: 모두 읽음 ✔️", {
            type: "requests",
            service: "GCSS",
            isNotification: true,
        });

    // GCSS outbound notifications
    const render_gcss_outbound_notifications = () =>
        renderList(flags.gcss.rep && flags.gcss.notifOut, gcssState.notifOutItems, "GCSS 발송 통지: 모두 읽음 ✔️", {
            type: "replies",
            service: "GCSS",
            isNotification: true,
        });

    // iCare inbound notifications
    const render_icare_inbound_notifications = () =>
        renderList(flags.icare.req && flags.icare.notifIn, icareState.notifInItems, "iCare 도착 통지: 모두 읽음 ✔️", {
            type: "requests",
            service: "iCare",
            isNotification: true,
        });

    // iCare outbound notifications
    const render_icare_outbound_notifications = () =>
        renderList(flags.icare.rep && flags.icare.notifOut, icareState.notifOutItems, "iCare 발송 통지: 모두 읽음 ✔️", {
            type: "replies",
            service: "iCare",
            isNotification: true,
        });

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
            {render_gcss_requests()}

            {render_gcss_inbound_notifications()}

            {render_gcss_replies()}

            {render_gcss_outbound_notifications()}
            <Divider variant="middle" sx={{ m: "15px" }}></Divider>

            {flags.icare.req ? (
                icareState.reqItems.length > 0 ? (
                    <MyList items={icareState.reqItems} type="requests" />
                ) : (
                    <Stack alignItems="center">
                        <Typography variant="subtitle2" color="initial" sx={{ userSelect: "none", fontWeight: "300" }}>
                            ICare 도착 문의: 모두 읽음 ✔️
                        </Typography>
                    </Stack>
                )
            ) : null}

            {render_icare_inbound_notifications()}

            {flags.icare.rep ? (
                icareState.items.length > 0 ? (
                    icareState.author.length > 1 ? (
                        icareState.author.map((user) => (
                            <MyList
                                key={user}
                                items={icareState.items.filter((e) =>
                                    e.author.toLowerCase().includes(user.toLowerCase()),
                                )}
                                type="replies"
                                service="iCare"
                                author={user}
                            />
                        ))
                    ) : (
                        <MyList items={icareState.items} />
                    )
                ) : (
                    <Stack alignItems="center">
                        <Typography variant="subtitle2" color="initial" sx={{ userSelect: "none", fontWeight: "300" }}>
                            iCare 발송 회신: 모두 읽음 ✔️
                        </Typography>
                    </Stack>
                )
            ) : null}
            {render_icare_outbound_notifications()}
        </Stack>
    );
}

export default PopUpApp;
