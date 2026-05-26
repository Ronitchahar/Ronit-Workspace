/**
 * Loading Skeleton for Chat Restoration
 * Shows while loading previous chat history
 */

function ChatSkeletonLoader() {
  return (
    <div className="chat-restore-loading">
      <div className="skeleton-container">
        <h3>🔄 Restoring your chats...</h3>
        <div className="loading-animation">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <p className="loading-text">Loading your conversation history</p>
      </div>
    </div>
  );
}

export default ChatSkeletonLoader;
