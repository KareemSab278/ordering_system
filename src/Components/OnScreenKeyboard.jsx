import { useEffect, useRef } from "react";
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css";

export { OnScreenKeyboard };

const OnScreenKeyboard = ({ value, onChange, onClose, numericOnly = false }) => {
  const keyboardRef = useRef(null);

  const onChangeCb = useRef(onChange);
  const onCloseCb = useRef(onClose);
  onChangeCb.current = onChange;
  onCloseCb.current = onClose;

  useEffect(() => {
    const opts = numericOnly
      ? {
          onChange: (input) => onChangeCb.current(input),
          onKeyPress: (btn) => { if (btn === "{done}") onCloseCb.current?.(); },
          layout: { default: ["1 2 3", "4 5 6", "7 8 9", ". 0 {bksp}", "{done}"] },
          display: { "{bksp}": "⌫", "{done}": "Done ✓" },
        }
      : {
          onChange: (input) => onChangeCb.current(input),
          onKeyPress: (btn) => {
            if (btn === "{done}") { onCloseCb.current?.(); return; }
            if (btn === "{shift}") {
              const next = keyboardRef.current?.options.layoutName === "shift" ? "default" : "shift";
              keyboardRef.current?.setOptions({ layoutName: next });
            }
          },
          layout: {
            default: [
              "1 2 3 4 5 6 7 8 9 0 {bksp}",
              "q w e r t y u i o p",
              "a s d f g h j k l",
              "{shift} z x c v b n m -",
              "{space} . , ! {done}",
            ],
            shift: [
              "1 2 3 4 5 6 7 8 9 0 {bksp}",
              "Q W E R T Y U I O P",
              "A S D F G H J K L",
              "{shift} Z X C V B N M -",
              "{space} . , ! {done}",
            ],
          },
          display: {
            "{bksp}": "⌫",
            "{shift}": "⇧",
            "{done}": "Done ✓",
            "{space}": "Space",
          },
        };

    keyboardRef.current = new Keyboard(".osk-container", opts);
    keyboardRef.current.setInput(value ?? "");

    return () => {
      keyboardRef.current?.destroy();
      keyboardRef.current = null;
    };
  }, [numericOnly]);

  useEffect(() => {
    keyboardRef.current?.setInput(value ?? "");
  }, [value]);

  return (
    <div style={styles.overlay} onPointerDown={(e) => e.stopPropagation()}>
      <div style={styles.wrapper}>
        <div className="osk-container" />
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100000,
    padding: "0.75rem 0.5rem 0.5rem",
  },
  wrapper: {
    maxWidth: "720px",
    margin: "0 auto",
  },
};