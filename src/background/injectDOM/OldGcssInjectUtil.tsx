import FloatingHelper from "./DomInject";
import InjectUtil from "./InjectUtil";

export default class OldGcssInjectUtil {
    private static InjectFor(target_element: HTMLInputElement, val: string, manual: boolean = false) {
        InjectUtil.InsertReact(
            <FloatingHelper target={target_element} new_value={val} manual_change={manual} />,
            target_element,
        );
    }

    static async InjectIdSearchInput() {
        const input = (await InjectUtil.TryQuerySelectFor("input#txtItemId")) as HTMLInputElement;
        if (input) {
            const form = document.querySelector("form:has(input#txtItemId)") as HTMLFormElement;
            // form.action = "/CSS/gcss/multiview/singleItemTracking";
            InjectUtil.ChangeAttributes(input, form);
        }
    }
    static async InjectQueryInput() {
        const old_input = (await InjectUtil.TryQuerySelectFor("input[name='itemId']")) as HTMLInputElement;
        if (old_input) {
            const form = document.querySelector("form:has(input[name='itemId'])") as HTMLFormElement;
            InjectUtil.ChangeAttributes(old_input, form);
        }
    }

    static SwitchValueForCurrency(
        original_element: HTMLInputElement,
        currency_element: HTMLSelectElement,
        change_to: string,
        manual: boolean = false,
    ) {
        if (!change_to) manual = true;
        if (manual) {
            InjectUtil.InsertReact(
                <FloatingHelper
                    target={original_element}
                    new_value={`${change_to} SDR`}
                    manual_change={manual}
                    currency_target={currency_element}
                />,
                original_element,
            );
        } else {
            InjectUtil.InsertReact(
                <FloatingHelper
                    target={original_element}
                    new_value={`${original_element.value} ${currency_element.selectedOptions[0].text}`}
                    manual_change={manual}
                    currency_target={currency_element}
                />,
                original_element,
            );
            original_element.value = change_to;
        }
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
