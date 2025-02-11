import React, { useEffect, useRef } from "react";
import { useState } from "react";

import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { MyList, StyledTextField } from "../custom/components";
import PopupTrack from "../../src/lib/PopupTrack";
import { GcssItem, WorkflowItem } from "../../src/background/GetUnreadReplies/DataWrapper";
import { IMICSettings } from "../../src/lib/OptionElement";
import { ServiceNames, ServiceTypes } from "../../src/background/GetUnreadReplies/GcssReplies";
import { COMMANDS } from "../../src/lib/Message";

function PopUpApp() {
    // TODO: GCSS Author Name Separation.
    // Tracking number state (you might want to bind this as well)
    const [item_id_field, set_item_id_field] = useState("");
    const [is_valid, set_is_valid] = useState(true);

    const [icare_items, set_icare_items] = useState<WorkflowItem[]>([]);
    const [icare_req_items, set_icare_req] = useState<WorkflowItem[]>([]);
    const [icare_notif_in_items, set_icare_notif_in_items] = useState<WorkflowItem[]>([]);
    const [icare_notif_out_items, set_icare_notif_out_items] = useState<WorkflowItem[]>([]);
    const [icare_author, set_icare_author] = useState<string[]>([]);

    const [gcss_items, set_gcss_items] = useState<GcssItem[]>([]);
    const [gcss_req_items, set_gcss_req] = useState<GcssItem[]>([]);
    const [gcss_notif_in_items, set_gcss_notif_in_items] = useState<GcssItem[]>([]);
    const [gcss_notif_out_items, set_gcss_notif_out_items] = useState<GcssItem[]>([]);
    const [gcss_author, set_gcss_author] = useState<string[]>([]);
    const [gcss_services, set_gcss_services] = useState<ServiceTypes[]>([ServiceTypes.EMS]);

    const [chk_rep, set_chk_rep] = useState(false);
    const [chk_req, set_chk_req] = useState(false);
    const [chk_notif_in, set_chk_notif_in] = useState(false);
    const [chk_notif_out, set_chk_notif_out] = useState(false);

    const [chk_gcss_rep, set_chk_gcssrep] = useState(false);
    const [chk_gcss_req, set_chk_gcssreq] = useState(false);
    const [chk_gcss_notif_in, set_chk_gcss_notif_in] = useState(false);
    const [chk_gcss_notif_out, set_chk_gcss_notif_out] = useState(false);

    const textfield_ref = useRef<HTMLInputElement>(null);
    const settings = useRef(new IMICSettings());
    const tracker = new PopupTrack();

    // const IncludesOneOf = (target: string, search_strings: string[]) => {
    //   return search_strings.some((item) => target.toLowerCase().includes(item.toLowerCase()));
    // };
    const CheckValue = (target: HTMLInputElement | HTMLTextAreaElement) => {
        const pretty_value = target.value.trim().toUpperCase();
        set_item_id_field(pretty_value); // Update
        if (pretty_value === "") {
            set_is_valid(true);
        } else {
            set_is_valid(target.validity.valid);
        }
    };

    const OpenSidePanel = () => {
        chrome.windows.getCurrent(async (w) => {
            await tracker.SetItemId(item_id_field);
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
            await settings.current.LoadOptions();
            set_chk_rep(settings.current.IcareUnreadReplies);
            set_chk_req(settings.current.IcareUnreadRequests);
            set_chk_notif_in(settings.current.IcareUnreadNotificationInbound);
            set_chk_notif_out(settings.current.IcareUnreadNotificationOutbound);
            set_icare_author(settings.current.IcareAuthor);
            set_chk_gcssrep(settings.current.GcssUnreadReplies);
            set_chk_gcssreq(settings.current.GcssUnreadRequests);
            set_chk_gcss_notif_in(settings.current.GcssUnreadNotificationInbound);
            set_chk_gcss_notif_out(settings.current.GcssUnreadNotificationOutbound);
            set_gcss_author(settings.current.GcssAuthor);
            set_gcss_services(
                settings.current.GcssServiceTypes.sort((a, b) => {
                    const serviceOrder = [
                        ServiceTypes.EMS,
                        ServiceTypes.Parcel,
                        ServiceTypes.Registered,
                        ServiceTypes.KPacket,
                    ];
                    return serviceOrder.indexOf(a) - serviceOrder.indexOf(b);
                })
            );

            if (settings.current.IcareUnreadReplies) {
                const dict = (await chrome.storage.session.get("ICARE_UNREAD_REPLIES"))
                    .ICARE_UNREAD_REPLIES as WorkflowItem[];

                if (typeof dict !== "undefined" && dict.length > 0) {
                    set_icare_items(dict);
                    console.log("icare replies loaded from storage local: ", dict);
                } else {
                    console.log("icare replies  count is 0 or below");
                }
            }

            if (settings.current.IcareUnreadRequests) {
                const dict = (await chrome.storage.session.get("ICARE_UNREAD_REQUESTS"))
                    .ICARE_UNREAD_REQUESTS as WorkflowItem[];
                if (typeof dict !== "undefined" && dict.length > 0) set_icare_req(dict);
            }

            if (settings.current.GcssUnreadReplies) {
                const dict = (await chrome.storage.session.get("GCSS_UNREAD_REPLIES"))
                    .GCSS_UNREAD_REPLIES as GcssItem[];
                if (typeof dict !== "undefined" && dict.length > 0) set_gcss_items(dict);
            }

            if (settings.current.GcssUnreadRequests) {
                const dict = (await chrome.storage.session.get("GCSS_UNREAD_REQUESTS"))
                    .GCSS_UNREAD_REQUESTS as GcssItem[];
                if (typeof dict !== "undefined" && dict.length > 0) set_gcss_req(dict);
            }

            if (settings.current.IcareUnreadNotificationInbound) {
                const dict = (
                    await chrome.storage.session.get(COMMANDS.ICARE_UNREAD_NOTIF_INBOUND)
                )[COMMANDS.ICARE_UNREAD_NOTIF_INBOUND] as WorkflowItem[];
                if (typeof dict !== "undefined" && dict.length > 0) set_icare_notif_in_items(dict);
            }

            if (settings.current.IcareUnreadNotificationOutbound) {
                const dict = (
                    await chrome.storage.session.get(COMMANDS.ICARE_UNREAD_NOTIF_OUTBOUND)
                )[COMMANDS.ICARE_UNREAD_NOTIF_OUTBOUND] as WorkflowItem[];
                if (typeof dict !== "undefined" && dict.length > 0) set_icare_notif_out_items(dict);
            }

            if (settings.current.GcssUnreadNotificationInbound) {
                const dict = (await chrome.storage.session.get(COMMANDS.GCSS_UNREAD_NOTIF_INBOUND))[
                    COMMANDS.GCSS_UNREAD_NOTIF_INBOUND
                ] as GcssItem[];
                if (typeof dict !== "undefined" && dict.length > 0) set_gcss_notif_in_items(dict);
            }

            if (settings.current.GcssUnreadNotificationOutbound) {
                const dict = (
                    await chrome.storage.session.get(COMMANDS.GCSS_UNREAD_NOTIF_OUTBOUND)
                )[COMMANDS.GCSS_UNREAD_NOTIF_OUTBOUND] as GcssItem[];
                if (typeof dict !== "undefined" && dict.length > 0) set_gcss_notif_out_items(dict);
            }

            // chrome.storage.session.onChanged.addListener((dict) => {
            //   set_workflow_items(dict.ICARE_UNREAD_REPLIES.newValue as WorkflowItem[]);
            //   set_gcss_items(dict.GCSS_UNREAD_REPLIES.newValue as GcssItem[]);
            // });
        })();
    }, []);
    const render_gcss_replies = () => {
        if (!chk_gcss_rep) return null;

        if (gcss_items.length < 1)
            return (
                <Stack alignItems="center">
                    <Typography
                        variant="subtitle2"
                        color="initial"
                        sx={{ userSelect: "none", fontWeight: "300" }}>
                        GCSS 발송 회신: 모두 읽음 ✔️
                    </Typography>
                </Stack>
            );
        console.log("GCSS POPUP: services--", gcss_services, "author--", gcss_author);
        if (gcss_services.length === 1) {
            if (gcss_author.length <= 1) {
                return (
                    <MyList
                        items={gcss_items.filter((el) => el.ServiceType === gcss_services[0])}
                        type="replies"
                        service="GCSS"
                    />
                );
            } else {
                return gcss_author.map((user) => (
                    <MyList
                        key={user}
                        items={gcss_items.filter((el) =>
                            el.RequestAuthor.toLowerCase().includes(user.toLowerCase())
                        )}
                        type="replies"
                        service="GCSS"
                        author={user}
                        serviceType={ServiceNames[gcss_services[0]]}
                    />
                ));
            }
        } else {
            if (gcss_author.length <= 1) {
                return gcss_services.map((serv) => (
                    <MyList
                        key={serv}
                        items={gcss_items.filter((el) => el.ServiceType === serv)}
                        type="replies"
                        service="GCSS"
                        author=""
                        serviceType={ServiceNames[serv]}
                    />
                ));
            } else {
                return gcss_services.flatMap((serv) =>
                    gcss_author.map((user) => (
                        <MyList
                            key={`${serv}-${user}`}
                            items={gcss_items.filter(
                                (el) =>
                                    el.ServiceType === serv &&
                                    el.RequestAuthor.toLowerCase().includes(user.toLowerCase())
                            )}
                            type="replies"
                            service="GCSS"
                            author={user}
                            serviceType={ServiceNames[serv]}
                        />
                    ))
                );
            }
        }
    };

    const render_gcss_notifications = () => {
        if (!chk_gcss_notif_in) {
            return null;
        }
        if (gcss_notif_in_items.length < 1) {
            return (
                <Stack alignItems="center">
                    <Typography
                        variant="subtitle2"
                        color="initial"
                        sx={{ userSelect: "none", fontWeight: "300" }}>
                        GCSS 도착 통지: 모두 읽음 ✔️
                    </Typography>
                </Stack>
            );
        }
        return (
            <MyList
                items={gcss_notif_in_items}
                type="requests"
                service="GCSS"
                isNotification={true}
            />
        );
    };

    const render_gcss_inbound_notifications = () => {
        if (!chk_gcss_notif_in) {
            return null;
        }
        if (gcss_notif_in_items.length < 1) {
            return (
                <Stack alignItems="center">
                    <Typography
                        variant="subtitle2"
                        color="initial"
                        sx={{ userSelect: "none", fontWeight: "300" }}>
                        GCSS 도착 통지: 모두 읽음 ✔️
                    </Typography>
                </Stack>
            );
        }
        return (
            <MyList
                items={gcss_notif_in_items}
                type="requests"
                service="GCSS"
                isNotification={true}
            />
        );
    };

    const render_gcss_outbound_notifications = () => {
        if (!chk_gcss_notif_out) {
            return null;
        }
        if (gcss_notif_out_items.length < 1) {
            return (
                <Stack alignItems="center">
                    <Typography
                        variant="subtitle2"
                        color="initial"
                        sx={{ userSelect: "none", fontWeight: "300" }}>
                        GCSS 발송 통지: 모두 읽음 ✔️
                    </Typography>
                </Stack>
            );
        }
        return (
            <MyList
                items={gcss_notif_out_items}
                type="replies"
                service="GCSS"
                isNotification={true}
            />
        );
    };

    const render_icare_inbound_notifications = () => {
        if (!chk_notif_in) {
            return null;
        }
        if (icare_notif_in_items.length < 1) {
            return (
                <Stack alignItems="center">
                    <Typography
                        variant="subtitle2"
                        color="initial"
                        sx={{ userSelect: "none", fontWeight: "300" }}>
                        iCare 도착 통지: 모두 읽음 ✔️
                    </Typography>
                </Stack>
            );
        }
        return (
            <MyList
                items={icare_notif_in_items}
                type="requests"
                service="iCare"
                isNotification={true}
            />
        );
    };

    const render_icare_outbound_notifications = () => {
        if (!chk_notif_out) {
            return null;
        }
        if (icare_notif_out_items.length < 1) {
            return (
                <Stack alignItems="center">
                    <Typography
                        variant="subtitle2"
                        color="initial"
                        sx={{ userSelect: "none", fontWeight: "300" }}>
                        iCare 발송 통지: 모두 읽음 ✔️
                    </Typography>
                </Stack>
            );
        }
        return (
            <MyList
                items={icare_notif_out_items}
                type="replies"
                service="iCare"
                isNotification={true}
            />
        );
    };

    return (
        <Stack spacing={0} margin={6} marginTop={0} width="300px">
            <StyledTextField
                inputRef={textfield_ref}
                variant="outlined"
                label="Tracking Number"
                error={!is_valid}
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
                helperText={is_valid ? " " : "Invalid Tracking Number"}
                onChange={(e) => CheckValue(e.target)}
                onKeyUp={(e) => {
                    if (e.key === "Enter" && is_valid) {
                        OpenSidePanel();
                    }
                    return true;
                }}
            />

            <Divider style={{ margin: "15px 0" }} />
            {chk_gcss_req ? (
                gcss_req_items.length > 0 ? (
                    <MyList items={gcss_req_items} type="requests" service="GCSS" />
                ) : (
                    <Stack alignItems="center">
                        <Typography
                            variant="subtitle2"
                            color="initial"
                            sx={{ userSelect: "none", fontWeight: "300" }}>
                            GCSS 도착 문의: 모두 읽음 ✔️
                        </Typography>
                    </Stack>
                )
            ) : null}
            {render_gcss_inbound_notifications()}

            {render_gcss_replies()}

            {render_gcss_outbound_notifications()}
            <Divider variant="middle" sx={{ m: "15px" }}></Divider>

            {chk_req ? (
                icare_req_items.length > 0 ? (
                    <MyList items={icare_req_items} type="requests" />
                ) : (
                    <Stack alignItems="center">
                        <Typography
                            variant="subtitle2"
                            color="initial"
                            sx={{ userSelect: "none", fontWeight: "300" }}>
                            ICare 도착 문의: 모두 읽음 ✔️
                        </Typography>
                    </Stack>
                )
            ) : null}

            {render_icare_inbound_notifications()}

            {chk_rep ? (
                icare_items.length > 0 ? (
                    icare_author.length > 1 ? (
                        icare_author.map((user) => (
                            <MyList
                                key={user}
                                items={icare_items.filter((e) =>
                                    e.author.toLowerCase().includes(user.toLowerCase())
                                )}
                                type="replies"
                                service="iCare"
                                author={user}
                            />
                        ))
                    ) : (
                        <MyList items={icare_items} />
                    )
                ) : (
                    <Stack alignItems="center">
                        <Typography
                            variant="subtitle2"
                            color="initial"
                            sx={{ userSelect: "none", fontWeight: "300" }}>
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
