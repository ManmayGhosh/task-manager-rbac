import React, { useState } from 'react';
import api from '../api/axios';

export default function TaskList({ tasks, onChange, canDelete }) {
  const [aiLoadingId, setAiLoadingId] = useState(null);

  const updateStatus = async (task, status) => {
    const { data } = await api.put(`/tasks/${task._id}`, { status });
    onChange(data.task);
  };

  const runAiBreakdown = async (task) => {
    setAiLoadingId(task._id);
    try {
      const { data } = await api.post(`/tasks/${task._id}/ai-breakdown`);
      onChange(data.task);
    } catch (err) {
      alert(err.response?.data?.message || 'AI breakdown failed');
    } finally {
      setAiLoadingId(null);
    }
  };

  const deleteTask = async (task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    await api.delete(`/tasks/${task._id}`);
    onChange(null, task._id);
  };

  if (tasks.length === 0) return <p>No tasks yet.</p>;

  return (
    <div>
      {tasks.map((task) => (
        <div className="card" key={task._id}>
          <div className="task-row">
            <div>
              <strong>{task.title}</strong>
              <span className={`badge ${task.priority}`}>{task.priority}</span>
              {task.aiGenerated && <span className="badge role">AI</span>}
            </div>
            <div>
              <select value={task.status} onChange={(e) => updateStatus(task, e.target.value)}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          {task.description && <p>{task.description}</p>}
          <p style={{ fontSize: 13, color: '#666' }}>
            Assigned to: {task.assignedTo?.name || 'Unassigned'} · Created by: {task.createdBy?.name}
            {task.estimatedHours ? ` · Est. ${task.estimatedHours}h` : ''}
            {task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}
          </p>
          {task.subtasks?.length > 0 && (
            <ul className="subtask-list">
              {task.subtasks.map((s, i) => <li key={i}>{s.text}</li>)}
            </ul>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="secondary" onClick={() => runAiBreakdown(task)} disabled={aiLoadingId === task._id}>
              {aiLoadingId === task._id ? 'Thinking...' : '✨ AI Breakdown'}
            </button>
            {canDelete && <button className="danger" onClick={() => deleteTask(task)}>Delete</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
