import React, { useEffect, useRef } from "react";
import { useState } from "react";

import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { MyList, StyledTextField } from "../custom/components";
import PopupTrack from "../../src/lib/PopupTrack";
import { GcssItem, WorkflowItem } from "../../src/background/GetUnreadReplies/DataWrapper";
import { IMICSettings } from "../../src/lib/OptionElement";
import {
  Accordion,
  AccordionSummary,
  Checkbox,
  Icon,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { ExpandMore, OpenInBrowser } from "@mui/icons-material";
import { ServiceNames, ServiceTypes } from "../../src/background/GetUnreadReplies/GcssReplies";

function PopUpApp() {
  // TODO: GCSS Author Name Separation.
  // Tracking number state (you might want to bind this as well)
  const [item_id_field, set_item_id_field] = useState("");
  const [is_valid, set_is_valid] = useState(true);

  const [icare_items, set_icare_items] = useState<WorkflowItem[]>([]);
  const [icare_req_items, set_icare_req] = useState<WorkflowItem[]>([]);
  const [icare_author, set_icare_author] = useState<string[]>([]);
  const [gcss_items, set_gcss_items] = useState<GcssItem[]>([]);
  const [gcss_req_items, set_gcss_req] = useState<GcssItem[]>([]);
  const [gcss_author, set_gcss_author] = useState<string[]>([]);
  const [gcss_services, set_gcss_services] = useState<ServiceTypes[]>([ServiceTypes.EMS]);

  const [chk_rep, set_chk_rep] = useState(false);
  const [chk_req, set_chk_req] = useState(false);
  const [chk_gcss_rep, set_chk_gcssrep] = useState(false);
  const [chk_gcss_req, set_chk_gcssreq] = useState(false);

  const textfield_ref = useRef<HTMLInputElement>(null);
  const settings = useRef(new IMICSettings());
  const tracker = new PopupTrack();

  const IncludesOneOf = (target: string, search_strings: string[]) => {
    return search_strings.some((item) => target.toLowerCase().includes(item.toLowerCase()));
  };
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
      chrome.sidePanel.open({ windowId: w.id! });
      window.close();
    });
    console.log("Popup sidepanel opened state:", tracker);
  };

  useEffect(() => {
    if (textfield_ref.current) {
      textfield_ref.current.focus();
    }

    (async () => {
      await settings.current.LoadOptions();
      set_chk_rep(settings.current.IcareUnreadReplies);
      set_chk_req(settings.current.IcareUnreadRequests);
      set_icare_author(settings.current.IcareAuthor);
      set_chk_gcssrep(settings.current.GcssUnreadReplies);
      set_chk_gcssreq(settings.current.GcssUnreadRequests);
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
        return MyList({
          items: gcss_items.filter((el) => el.ServiceType === gcss_services[0]),
          type: "replies",
          service: "GCSS",
        });
      } else {
        // 이용자 2명 이상, 서비스 1개
        return gcss_author.map((user) =>
          MyList({
            items: gcss_items.filter((el) =>
              el.RequestAuthor.toLowerCase().includes(user.toLowerCase())
            ),
            type: "replies",
            service: "GCSS",
            author: user,
            serviceType: ServiceNames[gcss_services[0]],
          })
        );
      }
    } else {
      // 서비스 2개 이상
      if (gcss_author.length <= 1) {
        // 이용자 1명 이하
        return gcss_services.map((serv) =>
          MyList({
            items: gcss_items.filter((el) => el.ServiceType === serv),
            type: "replies",
            service: "GCSS",
            author: "",
            serviceType: ServiceNames[serv],
          })
        );
      } else {
        // 이용자 2명 이상
        return gcss_services.flatMap((serv) =>
          gcss_author.map((user) =>
            MyList({
              items: gcss_items.filter(
                (el) =>
                  el.ServiceType === serv &&
                  el.RequestAuthor.toLowerCase().includes(user.toLowerCase())
              ),
              type: "replies",
              service: "GCSS",
              author: user,
              serviceType: ServiceNames[serv],
            })
          )
        );
      }
    }
  };

  return (
    <Stack spacing={0} margin={6} marginTop={0} width="300px">
      <StyledTextField
        inputRef={textfield_ref}
        variant="outlined"
        label="Tracking Number"
        error={!is_valid}
        onFocus={(e) => e.target.select()}
        inputProps={{
          style: { textTransform: "uppercase", textAlign: "center" },
          maxLength: 13,
          pattern: String.raw`[a-zA-Z]{2}\d{9}[a-zA-Z]{2}`,
        }}
        InputLabelProps={{
          style: { textAlign: "center" },
        }}
        FormHelperTextProps={{
          style: { textAlign: "center" },
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
          MyList({ items: gcss_req_items, type: "requests", service: "GCSS" })
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
      ) : (
        ""
      )}

      {render_gcss_replies()}
      <Divider variant="middle" sx={{ m: "15px" }}></Divider>

      {chk_req ? (
        icare_req_items.length > 0 ? (
          MyList({ items: icare_req_items, type: "requests" })
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
      ) : (
        ""
      )}
      {chk_rep ? (
        icare_items.length > 0 ? (
          icare_author.length > 1 ? (
            icare_author.map((user) =>
              MyList({
                items: icare_items.filter((e) =>
                  e.author.toLowerCase().includes(user.toLowerCase())
                ),
                type: "replies",
                service: "iCare",
                author: user,
              })
            )
          ) : (
            MyList({ items: icare_items })
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
      ) : (
        ""
      )}
    </Stack>
  );
}

export default PopUpApp;
