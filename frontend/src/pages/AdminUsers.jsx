import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const ROLES = ['admin', 'manager', 'member'];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, role } : u)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const toggleActive = async (u) => {
    try {
      const { data } = await api.patch(`/users/${u._id}/status`, { isActive: !u.isActive });
      setUsers((prev) => prev.map((usr) => (usr._id === u._id ? { ...usr, isActive: data.user.isActive } : usr)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="container">
      <h2>User Management</h2>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        users.map((u) => (
          <div className="card" key={u._id}>
            <div className="task-row">
              <div>
                <strong>{u.name}</strong> <span style={{ color: '#666', fontSize: 13 }}>{u.email}</span>
                {!u.isActive && <span className="badge high">inactive</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={u.role} onChange={(e) => changeRole(u._id, e.target.value)} style={{ marginBottom: 0, width: 130 }}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className="secondary" onClick={() => toggleActive(u)}>
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
