import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import "./ChatWindow.css";

function ChatWindow({ messages, onRegenerate, onDelete }) {
  const chatWindowRef = useRef(null);

  // Auto-scroll to latest message with smooth behavior
  useEffect(() => {
    // Use a timeout to ensure DOM updates are complete
    const scrollTimer = setTimeout(() => {
      if (chatWindowRef.current) {
        chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
      }
    }, 50);

    return () => clearTimeout(scrollTimer);
  }, [messages]);

  // Preserve scroll position on navigation
  useEffect(() => {
    if (!chatWindowRef.current) return;

    // Save scroll position to sessionStorage
    const saveScroll = () => {
      sessionStorage.setItem(
        "chatWindowScroll",
        chatWindowRef.current?.scrollTop || 0
      );
    };

    chatWindowRef.current.addEventListener("scroll", saveScroll);

    // Restore scroll position
    const savedScroll = sessionStorage.getItem("chatWindowScroll");
    if (savedScroll && chatWindowRef.current) {
      chatWindowRef.current.scrollTop = parseInt(savedScroll, 10);
    }

    return () => {
      chatWindowRef.current?.removeEventListener("scroll", saveScroll);
    };
  }, []);

  return (
    <div ref={chatWindowRef} className="chat-window">
      {messages && messages.length > 0 ? (
        messages.map((msg, index) => (
          <ChatMessage
            key={index}
            sender={msg.sender}
            text={msg.text}
            image={msg.image}
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

export default ChatWindow;