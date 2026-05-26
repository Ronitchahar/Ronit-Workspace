import { useEffect, useState } from "react";
import TaskInput from "../components/tasks/TaskInput";
import TaskList from "../components/tasks/TaskList";
import { getTasks, addTask as addTaskToDB, updateTask as updateTaskInDB, deleteTask as deleteTaskFromDB } from "../services/tasksService";
import { getCurrentUser } from "../services/authService";
import { useToast } from "../context/ToastContext";
import Skeleton from "../components/layout/Skeleton";

function TasksPage() {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await getCurrentUser();
      if (!mounted) return;
      setUserId(user?.id || null);
      if (user?.id) {
        const rows = await getTasks(user.id);
        if (!mounted) return;
        setTasks(rows || []);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false };
  }, []);

  const addTask = async (taskData) => {
    if (!userId) {
      // optimistic local add
      setTasks(prev => [{ id: Date.now(), completed: false, ...taskData }, ...prev]);
      addToast("Task added locally (Login to sync to cloud)", "info");
      return;
    }
    try {
      const created = await addTaskToDB(userId, taskData);
      if (created) {
        setTasks(prev => [created, ...prev]);
        addToast("Task saved to cloud", "success");
      }
    } catch (e) {
      console.error("Failed to add task FULL ERROR:", e);
      addToast(`Failed to save task: ${e.message || e.error_description || "Unknown error"}`, "error");
    }
  };

  const toggleTask = async (id) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    
    // optimistic UI update
    const updated = { completed: !t.completed };
    setTasks(prev => prev.map(x => x.id === id ? { ...x, ...updated } : x));
    
    if (!userId || t.isLocal) return;
    
    try {
      await updateTaskInDB(id, updated);
    } catch (e) {
      console.error("Failed to update task FULL ERROR:", e);
      // rollback UI
      setTasks(prev => prev.map(x => x.id === id ? { ...x, completed: t.completed } : x));
      addToast(`Failed to update task: ${e.message || e.error_description || "Unknown error"}`, "error");
    }
  };

  const deleteTask = async (id) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    // optimistic UI update
    setTasks(prev => prev.filter(x => x.id !== id));
    
    if (!userId) return;
    
    try {
      await deleteTaskFromDB(id);
      addToast("Task deleted", "info");
    } catch (e) {
      console.error("Failed to delete task FULL ERROR:", e);
      // rollback UI
      setTasks(prev => [...prev, t]); // Just pushes it to the end, but better than losing it
      addToast(`Failed to delete task: ${e.message || e.error_description || "Unknown error"}`, "error");
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.length - completedCount;

  return (
    <div className="files-bento-page page-transition">
      <div className="bento-header">
        <h1 className="gradient-text-hero">Task Command</h1>
        <p>Orchestrate your workflow with absolute precision.</p>
      </div>

      <div className="bento-grid">
        <div className="bento-item bento-upload" style={{ gridColumn: 'span 2', gridRow: 'span 1', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '32px' }}>
           <h3 style={{ margin: '0 0 16px', fontSize: '1.5rem', color: '#fff' }}>New Objective</h3>
           <TaskInput addTask={addTask} />
        </div>

        <div className="bento-item bento-stat">
          <div className="bento-stat-icon neon-purple">⏳</div>
          <div className="bento-stat-info">
            <span>Pending</span>
            {loading ? <Skeleton width="30px" height="24px" /> : <strong>{pendingCount}</strong>}
          </div>
        </div>

        <div className="bento-item bento-stat">
          <div className="bento-stat-icon neon-blue">✓</div>
          <div className="bento-stat-info">
            <span>Completed</span>
            {loading ? <Skeleton width="30px" height="24px" /> : <strong>{completedCount}</strong>}
          </div>
        </div>

        <div className="bento-item bento-recent" style={{ gridColumn: 'span 4' }}>
          <div className="bento-recent-header">
            <h3>Active Directives</h3>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Skeleton width="100%" height="80px" borderRadius="12px" />
              <Skeleton width="100%" height="80px" borderRadius="12px" />
              <Skeleton width="100%" height="80px" borderRadius="12px" />
            </div>
          ) : tasks.length === 0 ? (
             <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.5 }}>✅</div>
              <p>No active directives. You're all caught up!</p>
            </div>
          ) : (
            <TaskList tasks={tasks} toggleTask={toggleTask} deleteTask={deleteTask} />
          )}
        </div>
      </div>
    </div>
  );
}

export default TasksPage;