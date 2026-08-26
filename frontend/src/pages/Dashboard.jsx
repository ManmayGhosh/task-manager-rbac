import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [digest, setDigest] = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const canAssign = user?.role === 'admin' || user?.role === 'manager';
  const canDelete = user?.role === 'admin' || user?.role === 'manager';

  const loadTasks = async () => {
    const { data } = await api.get('/tasks');
    setTasks(data.tasks);
  };

  const loadUsers = async () => {
    if (!canAssign) return;
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch {
      // non-admins get 403; ignore
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadTasks(), loadUsers()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreated = (task) => setTasks((prev) => [task, ...prev]);

  const handleChange = (updatedTask, deletedId) => {
    if (deletedId) {
      setTasks((prev) => prev.filter((t) => t._id !== deletedId));
      return;
    }
    setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
  };

  const runDigest = async () => {
    setDigestLoading(true);
    try {
      const { data } = await api.get('/tasks/ai-digest');
      setDigest(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate digest');
    } finally {
      setDigestLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Dashboard</h2>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>✨ AI Daily Digest</h3>
          <button onClick={runDigest} disabled={digestLoading}>
            {digestLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {digest && (
          <div style={{ marginTop: 12 }}>
            <p>{digest.summary}</p>
            {digest.top_priority_titles?.length > 0 && (
              <p style={{ fontSize: 13, color: '#666' }}>
                Top priority: {digest.top_priority_titles.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      <TaskForm onCreated={handleCreated} users={users} canAssign={canAssign} />

      <h3>Tasks</h3>
      {loading ? <p>Loading...</p> : <TaskList tasks={tasks} onChange={handleChange} canDelete={canDelete} />}
    </div>
  );
}
