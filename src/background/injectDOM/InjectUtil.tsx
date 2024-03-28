import React from "react";
import { createRoot } from "react-dom/client";
import FloatingHelper from "./GcssInject";

class InjectUtil {
  private static GcssInjectFor(id: string, val: string, manual: boolean = false) {

    const targetElement = document.getElementById(id);
    if (!targetElement) {
      console.error("No target element found for id:" + id);
      return;
    }

    const new_div = document.createElement("div");
    new_div.setAttribute("style", "display: flex; align-items: center;");

    const inject_react = createRoot(new_div);
    inject_react.render(
      <FloatingHelper
        target_id={id}
        new_value={val}
        manual_change={manual}
      />
    );

    (targetElement.closest(".value") as HTMLDivElement).style.position = "relative";

    targetElement.insertAdjacentElement("afterend", new_div);
  }
  static SwitchValue(original_element: HTMLInputElement, change_to: string, manual: boolean = false) {
    if (manual) {      
      this.GcssInjectFor(original_element.id, change_to, manual);
    } else {
      this.GcssInjectFor(original_element.id, original_element.value);
      original_element.value = change_to;
    }
  }
}

export default InjectUtil;
