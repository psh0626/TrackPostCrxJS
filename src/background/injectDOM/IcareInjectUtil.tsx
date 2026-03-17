import FloatingHelper from "./FloatingHelper";
import InjectUtil from "./InjectUtil";
import PersonalRemarksSelect from "./PersonalRemarks";

export default class IcareInjectUtil {
    private static InjectFor(target_elm: HTMLInputElement, val: string, manual: boolean = false) {
        InjectUtil.InsertReact(
            <FloatingHelper target={target_elm} new_value={val} manual_change={manual} platform={"iCare"} />,
            target_elm,
        );
    }
    static async InjectIdSearchInput() {
        const old_input = (await InjectUtil.TryQuerySelectFor("input[type='text']")) as HTMLInputElement;
        if (old_input) {
            const form = document.querySelector("form:has(input[type='text'])") as HTMLFormElement;
            InjectUtil.ChangeAttributes(old_input, form, false);
        }
    }

    static async InjectPersonalRemarks(type: string = "REQ") {
        let selector: string;
        switch (type) {
            case "REQ":
                selector = "div.request-fields > div > div > div.row.text-templates-row > div > div.input-container";
                break;
            case "REP":
                selector = "div.reply-fields > div > div > div.row.text-templates-row > div > div.input-container";
                break;
            case "SUM":
                selector = "div.update-message > form > div > div.row > div > div.input-container";
                break;
            default:
                selector = "div.row.text-templates-row > div > div.input-container";
        }
        const target = (await InjectUtil.TryQuerySelectFor(selector)) as HTMLElement;
        if (!target) {
            console.log("cannot find: 'div.input-container'\nunable to inject personal remarks");
            return;
        }
        const new_div = InjectUtil.InsertReact(<PersonalRemarksSelect type={type} />, target, "afterbegin");
        new_div?.setAttribute("style", "z-index: 1; top: 3px; position: absolute; width: 100%; background: white;");
    }
    static SwitchValue(original_element: HTMLInputElement, change_to: string, manual: boolean = false) {
        if (!change_to) manual = true;
        if (manual) {
            this.InjectFor(original_element, change_to, manual);
        } else {
            this.InjectFor(original_element, original_element.value);
            original_element.value = change_to;
        }
    }
}
