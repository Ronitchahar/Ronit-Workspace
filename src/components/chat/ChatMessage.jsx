import { useEffect, useState, memo, useCallback } from "react";
import ImageMessage from "./ImageMessage";
import "./ChatMessage.css";

function ChatMessage({ sender, text, imageUrl, imageId, prompt, messageId, onRegenerate, onDelete }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Optimized typing animation - reduce update frequency
  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      setIsTyping(false);
      return;
    }

    // Check if this is an AI message and should have typing animation
    const shouldAnimate = sender === "ai" && text.length > 0;
    
    if (shouldAnimate) {
      setIsTyping(true);
      setDisplayedText("");
      
      let currentIndex = 0;
      // Increased typing speed for smoother feel (reduced latency)
      const typingSpeed = 8; // milliseconds per character - faster but still visible
      
      const typingInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.substring(0, currentIndex));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(typingInterval);
        }
      }, typingSpeed);

      return () => clearInterval(typingInterval);
    } else {
      // For user messages, display immediately
      setDisplayedText(text);
      setIsTyping(false);
    }
  }, [text, sender]);

  const handleRegenerate = useCallback(() => {
    if (onRegenerate) {
      onRegenerate(messageId);
    }
  }, [messageId, onRegenerate]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(messageId);
    }
  }, [messageId, onDelete]);

  return (
    <div
      className={
        sender === "ai"
          ? "message ai-message"
          : "message user-message"
      }
    >
      <p className="message-sender">{sender === "ai" ? "Ronit" : "You"}</p>

      {(imageUrl || imageId) && (
        <ImageMessage
          imageUrl={imageUrl}
          imageId={imageId}
          prompt={prompt}
        />
      )}

      {/* Text Message */}
      {text && (
        <span className="message-content">
          {displayedText}
          {isTyping && <span className="typing-cursor">|</span>}
        </span>
      )}
    </div>
  );
}

export default memo(ChatMessage);