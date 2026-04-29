import { useEffect, useRef } from "react";
import { useTypewriter } from "../../hooks/use-typewriter";

function stripMarkdownLikeSyntax(text) {
  return (text || "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function TypewriterText({
  text,
  enabled,
  className = "",
  sanitizeMarkdown = false,
  onComplete = null
}) {
  const preparedText = sanitizeMarkdown ? stripMarkdownLikeSyntax(text) : text;
  const { typedText, isTyping } = useTypewriter(preparedText, enabled);
  const completedForTextRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      completedForTextRef.current = null;
      return;
    }

    const completionKey = `${preparedText || ""}`;
    if (!isTyping && typedText && completedForTextRef.current !== completionKey) {
      completedForTextRef.current = completionKey;
      if (typeof onComplete === "function") {
        onComplete();
      }
    }
  }, [enabled, isTyping, onComplete, preparedText, typedText]);

  return (
    <>
      <p className={className}>{typedText}</p>
      {isTyping && <span className="typing-cursor">|</span>}
    </>
  );
}
