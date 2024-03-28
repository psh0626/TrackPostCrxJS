
import { createRoot } from "react-dom/client";
import FloatingHelper from "./GcssInject";

class InjectUtil{
    private static GcssInjectFor(id: string, val: string){
        
          const new_div = document.createElement("div");
          const inject_react = createRoot(new_div);
          inject_react.render(<FloatingHelper targetId={id} newValue={val} />);

          document.body.appendChild(new_div);
    }
    static SwitchValue(original_element: HTMLInputElement, change_to: string){
        this.GcssInjectFor(original_element.id, original_element.value);
        original_element.value = change_to;
    }
}

export default InjectUtil;