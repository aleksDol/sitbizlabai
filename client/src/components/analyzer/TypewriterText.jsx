import { useTypewriter } from "../../hooks/use-typewriter";

export function TypewriterText({ text, enabled, className = "" }) {
  const { typedText, isTyping } = useTypewriter(text, enabled);

  return (
    <>
      <p className={className}>{typedText}</p>
      {isTyping && <span className="typing-cursor">|</span>}
    </>
  );
}
