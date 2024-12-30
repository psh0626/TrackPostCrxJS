import React, { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import FloatingHelper from "./DomInject";
import PersonalRemarksSelect from "./PersonalRemarks";
import { ElevatorSharp } from "@mui/icons-material";

class InjectUtil {
    private static InsertReact(
        react_component: ReactNode,
        target: HTMLElement,
        where: InsertPosition = "afterend"
    ) {
        if (!target) {
            console.error("No target element found for: " + target);
            return;
        }

        (target.closest("div") as HTMLDivElement).style.position = "relative";

        const new_div = document.createElement("div");
        new_div.setAttribute("style", "display: flex; align-items: center;");

        const inject_react = createRoot(new_div);
        inject_react.render(react_component);

        target.insertAdjacentElement(where, new_div);
        return new_div;
    }
    private static GcssInjectFor(
        target_element: HTMLInputElement,
        val: string,
        manual: boolean = false
    ) {
        this.InsertReact(
            <FloatingHelper target={target_element} new_value={val} manual_change={manual} />,
            target_element
        );
    }

    private static IcareInjectFor(
        target_elm: HTMLInputElement,
        val: string,
        manual: boolean = false
    ) {
        this.InsertReact(
            <FloatingHelper
                target={target_elm}
                new_value={val}
                manual_change={manual}
                for_icare={true}
            />,
            target_elm
        );
    }
    private static kor2en(text: string) {
        const mapping: { [key: string]: string } = {
            ㅂ: "q",
            ㅈ: "w",
            ㄷ: "e",
            ㄱ: "r",
            ㅅ: "t",
            ㅛ: "y",
            ㅕ: "u",
            ㅑ: "i",
            ㅐ: "o",
            ㅔ: "p",
            ㅁ: "a",
            ㄴ: "s",
            ㅇ: "d",
            ㄹ: "f",
            ㅎ: "g",
            ㅗ: "h",
            ㅓ: "j",
            ㅏ: "k",
            ㅣ: "l",
            ㅋ: "z",
            ㅌ: "x",
            ㅊ: "c",
            ㅍ: "v",
            ㅠ: "b",
            ㅜ: "n",
            ㅡ: "m",
        };

        return text
            .split("")
            .map((char) => mapping[char] || char)
            .join("");
    }
    static ChangeAttributes(
        target_input: HTMLInputElement,
        target_form: HTMLFormElement,
        apply_pattern = true,
        trial = 0
    ) {
        console.log("[ChangeAttributes] start");
        if (!target_input) {
            if (trial < 2) {
                setTimeout(() => {
                    this.ChangeAttributes(target_input, target_form, apply_pattern, ++trial);
                }, 1000);
                console.log("[ChangeAttributes] input not found");
            }
            return;
        }

        target_input.setAttribute("maxlength", "13");
        // target_input.setAttribute("title", "EE123456789KR");
        target_input.setAttribute("placeholder", "등기번호를 입력하세요.");
        target_input.classList.add("uppercase");

        target_input.addEventListener("input", (e) => {
            const old_position = target_input.selectionStart;
            const input = e.target as HTMLInputElement;
            const value = this.kor2en(input.value).toUpperCase();

            if (apply_pattern) {
                target_input.setAttribute("pattern", String.raw`[A-Z]{2}\d{9}[A-Z]{2}`);
                let new_value = "";
                for (let i = 0; i < value.length && i < 13; i++) {
                    const char = value[i];
                    if (i < 2 || i > 10) {
                        if (char >= "A" && char <= "Z") {
                            new_value += char;
                        }
                    } else {
                        if (char >= "0" && char <= "9") {
                            new_value += char;
                        }
                    }
                }
                input.value = new_value;
            }

            if (input.selectionStart !== old_position) {
                input.setSelectionRange(old_position, old_position);
            }
        });
        target_form.onsubmit = () => {
            target_input.value = target_input.value.toUpperCase();
        };
    }
    static InjectGcssIdSearchInput() {
        const input = document.querySelector("input#txtItemId") as HTMLInputElement;
        const form = document.querySelector("form:has(input#txtItemId)") as HTMLFormElement;
        this.ChangeAttributes(input, form);
    }
    static InjectGcssQueryInput() {
        const old_input = document.querySelector("input[name='itemId']") as HTMLInputElement;
        const form = document.querySelector("form:has(input[name='itemId'])") as HTMLFormElement;
        this.ChangeAttributes(old_input, form);
    }
    static InjectIcareIdSearchInput() {
        const old_input = document.querySelector("input[type='text']") as HTMLInputElement;
        const form = document.querySelector("form:has(input[type='text'])") as HTMLFormElement;
        this.ChangeAttributes(old_input, form, false);
    }

    static InjectIcarePersonalRemarks(type: string = "REQ") {
        let selector: string;
        switch (type) {
            case "REQ":
                selector =
                    "div.request-fields > div > div > div.row.text-templates-row > div > div.input-container";
                break;
            case "REP":
                selector =
                    "div.reply-fields > div > div > div.row.text-templates-row > div > div.input-container";
                break;
            case "SUM":
                selector = "div.update-message > form > div > div.row > div > div.input-container";
                break;
            default:
                selector = "div.row.text-templates-row > div > div.input-container";
        }
        const target = document.querySelector(selector) as HTMLElement;
        if (!target) {
            console.log("cannot find: 'div.input-container'\nunable to inject personal remarks");
            return;
        }
        const new_div = this.InsertReact(
            <PersonalRemarksSelect type={type} />,
            target,
            "afterbegin"
        );
        new_div?.setAttribute(
            "style",
            "z-index: 1; top: 3px; position: absolute; width: 100%; background: white;"
        );
    }

    static GcssSwitchValueForCurrency(
        original_element: HTMLInputElement,
        currency_element: HTMLSelectElement,
        change_to: string,
        manual: boolean = false
    ) {
        if (!change_to) manual = true;
        if (manual) {
            this.InsertReact(
                <FloatingHelper
                    target={original_element}
                    new_value={`${change_to} SDR`}
                    manual_change={manual}
                    currency_target={currency_element}
                />,
                original_element
            );
        } else {
            this.InsertReact(
                <FloatingHelper
                    target={original_element}
                    new_value={`${original_element.value} ${currency_element.selectedOptions[0].text}`}
                    manual_change={manual}
                    currency_target={currency_element}
                />,
                original_element
            );
            original_element.value = change_to;
        }
    }
    static GcssSwitchValue(
        original_element: HTMLInputElement,
        change_to: string,
        manual: boolean = false
    ) {
        if (!change_to) manual = true;
        if (manual) {
            this.GcssInjectFor(original_element, change_to, manual);
        } else {
            this.GcssInjectFor(original_element, original_element.value);
            original_element.value = change_to;
        }
    }
    static IcareSwitchValue(
        original_element: HTMLInputElement,
        change_to: string,
        manual: boolean = false
    ) {
        if (!change_to) manual = true;
        if (manual) {
            this.IcareInjectFor(original_element, change_to, manual);
        } else {
            this.IcareInjectFor(original_element, original_element.value);
            original_element.value = change_to;
        }
    }
}

export default InjectUtil;
