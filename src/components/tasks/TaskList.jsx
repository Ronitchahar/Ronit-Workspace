import TaskCard from "./TaskCard";

function TaskList({ tasks, toggleTask, deleteTask }) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state fade-in-up">
        <div className="empty-icon">✓</div>
        <h3>All caught up!</h3>
        <p>You have no active tasks. Take a break or add a new one.</p>
      </div>
    );
  }

  return (
    <div className="bento-task-list">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} />
      ))}
    </div>
  );
}
export default TaskList;
