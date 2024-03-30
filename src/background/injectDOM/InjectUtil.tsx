import React from "react";
import { createRoot } from "react-dom/client";
import FloatingHelper from "./DomInject";

class InjectUtil {
  private static GcssInjectFor(target_element: HTMLInputElement, val: string, manual: boolean = false) {
    if (!target_element) {
      console.error("No target element found for: " + target_element);
      return;
    }

    const new_div = document.createElement("div");
    new_div.setAttribute("style", "display: flex; align-items: center;");

    const inject_react = createRoot(new_div);
    inject_react.render(<FloatingHelper target={target_element} new_value={val} manual_change={manual} />);

    (target_element.closest("div") as HTMLDivElement).style.position = "relative";

    target_element.insertAdjacentElement("afterend", new_div);
  }

  private static IcareInjectFor(target_elm: HTMLInputElement, val: string, manual: boolean = false) {
    if (!target_elm) {
      console.error("No target element found for: " + target_elm);
      return;
    }

    const new_div = document.createElement("div");
    new_div.setAttribute("style", "display: flex; align-items: center;");

    const inject_react = createRoot(new_div);
    inject_react.render(<FloatingHelper target={target_elm} new_value={val} manual_change={manual} for_icare={true} />);

    (target_elm.closest("div") as HTMLDivElement).style.position = "relative";

    target_elm.insertAdjacentElement("afterend", new_div);
  }

  static GcssSwitchValue(original_element: HTMLInputElement, change_to: string, manual: boolean = false) {
    if (!change_to) manual = true;
    if (manual) {
      this.GcssInjectFor(original_element, change_to, manual);
    } else {
      this.GcssInjectFor(original_element, original_element.value);
      original_element.value = change_to;
    }
  }
  static IcareSwitchValue(original_element: HTMLInputElement, change_to: string, manual: boolean = false) {
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
