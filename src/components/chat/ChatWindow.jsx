import { useEffect, useRef, useCallback, memo } from "react";
import ChatMessage from "./ChatMessage";
import "./ChatWindow.css";

function ChatWindow({ messages, onRegenerate, onDelete }) {
  const chatWindowRef = useRef(null);
  const hasAutoScrolled = useRef(false);

  // Optimized auto-scroll: only on new messages
  useEffect(() => {
    if (!chatWindowRef.current || !messages.length) return;

    // Use requestAnimationFrame for smooth scrolling
    requestAnimationFrame(() => {
      if (chatWindowRef.current) {
        chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        hasAutoScrolled.current = true;
      }
    });
  }, [messages.length]); // Only depend on message count, not entire array

  // Memoized scroll handler
  const handleScroll = useCallback(() => {
    // Debounced scroll position save
    if (!chatWindowRef.current) return;
    sessionStorage.setItem("chatWindowScroll", chatWindowRef.current.scrollTop);
  }, []);

  // Restore scroll position on mount
  useEffect(() => {
    if (!chatWindowRef.current) return;

    const savedScroll = sessionStorage.getItem("chatWindowScroll");
    if (savedScroll) {
      // Restore on next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (chatWindowRef.current) {
          chatWindowRef.current.scrollTop = parseInt(savedScroll, 10);
        }
      });
    }

    chatWindowRef.current.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      chatWindowRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  return (
    <div ref={chatWindowRef} className="chat-window">
      {messages && messages.length > 0 ? (
        messages.map((msg) => (
          <ChatMessage
            key={msg.id || `${msg.sender}-${msg.timestamp}`}
            sender={msg.sender}
            text={msg.text}
            image={msg.image}
            imageUrl={msg.imageUrl}
            imageId={msg.imageId}
            prompt={msg.prompt}
            messageId={msg.id}
            onRegenerate={onRegenerate}
            onDelete={onDelete}
          />
        ))
      ) : (
        <div className="empty-chat-state">
          <div className="empty-chat-icon">💬</div>
          <h3>Start a conversation</h3>
          <p>Ask me anything, in English or Hinglish!</p>
        </div>
      )}
    </div>
  );
}

export default memo(ChatWindow);