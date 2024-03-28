import { useState, useEffect } from "react";

const FloatingHelper: React.FC<{targetId: string, newValue: string}> = ({ targetId, newValue }) => {
    const [style, setStyle] = useState<React.CSSProperties>({});
  
    useEffect(() => {
        setTimeout(() => {
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    const rect = targetElement.getBoundingClientRect();
                    // Calculate position to place the button above the target input
                    const topPosition = rect.top + window.scrollY - 5; // Example: 5px above the target
                    const leftPosition = rect.left + window.scrollX;
            
                    setStyle({
                    position: 'absolute',
                    top: `${topPosition}px`,
                    left: `${leftPosition}px`,
                    zIndex: 1000, // Ensure the button is above other elements
                    });
                }
            }, 3000);
        }, [targetId]);
    const buttonClicked = () =>{
        const this_element = document.getElementById(`IMIC_${targetId}`)!;
        const input_element = document.getElementById(targetId)! as HTMLInputElement;
        const value_to_keep = input_element.value;
        input_element.value = this_element.textContent ?? "";
        this_element.innerText = value_to_keep;

    };
    return (
      <button style={style} id={`IMIC_${targetId}`} onClick={buttonClicked}>{newValue}</button>
    );
  };

  export default FloatingHelper;