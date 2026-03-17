import FloatingHelper from "./floatingHelper";
import InjectUtil from "./injectUtil";

export default class NewGcssInjectUtil {
    private static InjectFor(target_element: HTMLInputElement, val: string, manual: boolean = false) {
        InjectUtil.InsertReact(
            <FloatingHelper target={target_element} new_value={val} manual_change={manual} platform={"NewGCSS"} />,
            target_element,
        );
    }

    static async InjectIdSearchInput() {
        const input = (await InjectUtil.TryQuerySelectFor("input[name='search']")) as HTMLInputElement;
        if (input) {
            // form.action = "/CSS/gcss/multiview/singleItemTracking";
            InjectUtil.ChangeAttributes(input, null, false);
        }
    }

    static SwitchValueForCurrency(
        original_element: HTMLInputElement,
        currency_element: HTMLInputElement,
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
                    new_value={`${original_element.value} ${currency_element.value}`}
                    manual_change={manual}
                    currency_target={currency_element}
                    platform="NewGCSS"
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
