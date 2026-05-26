import { useState, useRef, useEffect } from "react";
import { Calendar, Flag, Plus, ArrowRight, ChevronDown } from "lucide-react";

function TaskInput({ addTask }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isFocused, setIsFocused] = useState(false);


  const handleAdd = () => {
    if (!title.trim()) return;
    addTask({
      title,
      due_date: dueDate || null,
    });
    setTitle("");
    setDueDate("");
  };

  return (
    <div className={`modern-task-input-wrapper ${isFocused ? 'focused' : ''}`}>
      <div className="task-input-top">
        <div className="task-input-icon">
          <Plus size={20} className="text-muted" />
        </div>
        <input
          className="task-main-input-borderless"
          type="text"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {title.trim() && (
          <button className="task-quick-add-btn fade-in" onClick={handleAdd}>
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      <div className="task-input-bottom-toolbar">
        <div className="task-toolbar-chip">
          <Calendar size={14} className="chip-icon" />
          <input 
            className="task-datetime-invisible"
            type="datetime-local" 
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="toolbar-spacer"></div>

        <button 
          className="task-submit-pill"
          onClick={handleAdd}
          disabled={!title.trim()}
        >
          Add Task
        </button>
      </div>
    </div>
  );
}

export default TaskInput;
