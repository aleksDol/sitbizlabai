import { useEffect, useRef, useState } from "react";
import {
  FALLBACK_ANALYSIS_TEXT,
  TYPEWRITER_CHARS_PER_SECOND
} from "../constants/analyze-ui.constants";

export function useTypewriter(text, enabled) {
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setTypedText("");
      setIsTyping(false);
      return undefined;
    }

    const fullText = text || FALLBACK_ANALYSIS_TEXT;
    let startTimestamp;
    setTypedText("");
    setIsTyping(true);

    const step = (timestamp) => {
      if (startTimestamp === undefined) {
        startTimestamp = timestamp;
      }

      const elapsedSeconds = (timestamp - startTimestamp) / 1000;
      const charsToShow = Math.min(
        fullText.length,
        Math.floor(elapsedSeconds * TYPEWRITER_CHARS_PER_SECOND)
      );

      setTypedText((prev) => {
        if (prev.length === charsToShow) {
          return prev;
        }
        return fullText.slice(0, charsToShow);
      });

      if (charsToShow < fullText.length) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setIsTyping(false);
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [enabled, text]);

  return { typedText, isTyping };
}
