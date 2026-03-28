import { PostAPI, PostElement } from "@/common/PostUtil";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import PopupTrack from "../../lib/popupTrack";
import StyledTextField from "./components/styledTextField";
import InfoTextField from "./side-panel/infoTextField";

function SidePanelApp() {
    // State for PostElement
    const [postElement, setPostElement] = useState(new PostElement());
    const [itemIdField, setItemIdField] = useState("");
    const [isValid, setIsValid] = useState(true);
    const textFieldRef = useRef<HTMLInputElement>(null);

    const fetchPostItem = async (id: string) => {
        setPostElement(new PostElement({ ItemID: id }));
        if (id) setPostElement(await PostAPI.fetchPostElement(id)); // Update the state with the fetched PostElement
    };

    const checkValue = (target: HTMLInputElement | HTMLTextAreaElement) => {
        const pretty_value = target.value.trim().toUpperCase();
        setItemIdField(pretty_value); // Update
        if (pretty_value === "") {
            setIsValid(true);
        } else {
            setIsValid(target.validity.valid);
        }
    };
    const trackItem = async (popup: PopupTrack | undefined) => {
        console.log("tracking attempt:", itemIdField, popup, postElement);

        if (popup && popup.IsTracked) {
            setItemIdField(popup.ItemId);
            console.log("item id set", popup);
            void fetchPostItem(popup.ItemId);
            console.log("item fetched");
        }
    };

    const getPopupState = async () => {
        const dict = await chrome.storage.session.get("PopupTrack");
        const popup = dict.PopupTrack as PopupTrack | undefined;
        console.log("response received: ", popup);
        return popup;
    };

    useEffect(() => {
        void getPopupState().then((p) => trackItem(p));
        if (textFieldRef.current) {
            textFieldRef.current.focus();
        }
    }, []);

    return (
        <Stack spacing={0} margin={5}>
            <StyledTextField
                inputRef={textFieldRef}
                variant="outlined"
                label="Tracking Number"
                value={itemIdField}
                error={!isValid}
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
                helperText={isValid ? " " : "Invalid Tracking Number"}
                onChange={(e) => checkValue(e.target)}
                onKeyUp={(e) => {
                    if (e.key === "Enter" && isValid) {
                        void fetchPostItem(itemIdField);
                    }
                    return true;
                }}
            />
            <Divider style={{ margin: "15px 0" }} />

            <Card>
                <Stack spacing={0}>
                    {postElement.ItemTracked && (
                        <Stack spacing={0.5} margin="6px 0">
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    void navigator.clipboard.writeText(postElement.AddresseeZipcode);
                                }}
                            >
                                {`${postElement.Destination} (${postElement.AddresseeZipcode})`}
                            </Button>

                            <Button
                                variant="outlined"
                                onClick={() => {
                                    void navigator.clipboard.writeText(postElement.Contents);
                                }}
                            >
                                {`Contents: ${postElement.Contents}`}
                            </Button>
                        </Stack>
                    )}
                    <Accordion disableGutters expanded={postElement.ItemTracked} style={{ margin: "10px 0 0 0" }}>
                        <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
                            <Typography variant="h6">Sender</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                <InfoTextField
                                    label_text="Name"
                                    binding_value={postElement.SenderName}
                                    binding_shrink={postElement.ItemTracked}
                                />
                                <InfoTextField
                                    label_text="Phone"
                                    binding_value={postElement.SenderPhone}
                                    binding_shrink={postElement.ItemTracked}
                                />
                                <InfoTextField
                                    label_text="Address"
                                    binding_value={postElement.SenderAddress}
                                    binding_shrink={postElement.ItemTracked}
                                    multiline={true}
                                />
                            </Stack>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion disableGutters expanded={postElement.ItemTracked}>
                        <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
                            <Typography variant="h6">Addressee</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                <InfoTextField
                                    label_text="Name"
                                    binding_value={postElement.AddresseeName}
                                    binding_shrink={postElement.ItemTracked}
                                />
                                <InfoTextField
                                    label_text="Phone"
                                    binding_value={postElement.AddresseePhone}
                                    binding_shrink={postElement.ItemTracked}
                                />
                                <InfoTextField
                                    label_text="Address"
                                    binding_value={postElement.AddresseeAddress}
                                    binding_shrink={postElement.ItemTracked}
                                    multiline={true}
                                />
                            </Stack>
                        </AccordionDetails>
                    </Accordion>
                    {postElement.ItemTracked && (
                        <Typography variant="body2" textAlign="center" margin="12px 0">
                            접 수 일: {postElement.ApplicationDate} <br />
                            {/* 배달완료종적: {post_element.DeliveryResult ? "있음" : "없음"} <br /> */}
                            조사청구여부: {postElement.InquiryRequested ? "청구함" : "미청구"} <br />
                        </Typography>
                    )}
                </Stack>
            </Card>
        </Stack>
    );
}

export default SidePanelApp;
