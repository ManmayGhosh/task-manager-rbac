import React, { useState } from 'react';
import api from '../api/axios';

export default function TaskForm({ onCreated, users = [], canAssign }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { title, description, priority };
      if (dueDate) payload.dueDate = dueDate;
      if (assignedTo) payload.assignedTo = assignedTo;

      const { data } = await api.post('/tasks', payload);
      onCreated(data.task);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setAssignedTo('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3>New Task</h3>
      {error && <p className="error">{error}</p>}
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea placeholder="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      <select value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="low">Low priority</option>
        <option value="medium">Medium priority</option>
        <option value="high">High priority</option>
      </select>
      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      {canAssign && users.length > 0 && (
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">Assign to myself</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
          ))}
        </select>
      )}
      <button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Task'}</button>
    </form>
  );
}
