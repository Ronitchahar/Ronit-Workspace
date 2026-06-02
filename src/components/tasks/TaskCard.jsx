import { useState, useEffect, useRef, memo, useCallback } from "react";
import { useToast } from "../../context/ToastContext";

function TaskCard({ task, toggleTask, deleteTask }) {
  const { addToast } = useToast();
  const [timeLeft, setTimeLeft] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!task.due_date) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const due = new Date(task.due_date);
      const diff = due - now;

      if (diff < 0) {
        setIsOverdue(true);
        setTimeLeft("Overdue");
        
        if (!notifiedRef.current && !task.completed) {
          // Send internal app notification
          addToast(`Task Overdue: ${task.title}`, "error");

          // Trigger Desktop Notification if permission granted
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Task Overdue!", {
              body: `Your task "${task.title}" is now overdue.`,
              icon: "/favicon.ico"
            });
          }
          notifiedRef.current = true;
        }
        return;
      }

      setIsOverdue(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);

      if (days > 0) setTimeLeft(`${days}d ${hours}h left`);
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m left`);
      else setTimeLeft(`${minutes}m left`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [task.due_date, task.completed, task.title, addToast]);

  const handleToggle = useCallback(() => {
    toggleTask(task.id);
  }, [task.id, toggleTask]);

  const handleDelete = useCallback(() => {
    deleteTask(task.id);
  }, [task.id, deleteTask]);

  return (
    <div className={`bento-task-card fade-in-up ${task.completed ? "completed" : ""} ${isOverdue && !task.completed ? "overdue" : ""}`}>
      <div className="task-checkbox" onClick={handleToggle}>
        <div className={`checkbox-inner ${task.completed ? "checked" : ""}`}>
           {task.completed && "✓"}
        </div>
      </div>
      <div className="task-card-content">
        <h3>{task.title}</h3>
        <div className="task-meta">
          {task.due_date && (
            <span className="task-date" style={{ color: isOverdue && !task.completed ? '#ef4444' : '#888' }}>
              ⏳ {timeLeft}
            </span>
          )}
        </div>
      </div>
      <button className="delete-task-btn" onClick={handleDelete}>🗑</button>
    </div>
  );
}

export default memo(TaskCard);
