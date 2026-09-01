import { useState, useEffect } from 'react'
import { usersAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { Users, UserPlus, Mail, Pencil, ShieldCheck, Ban, CheckCircle } from 'lucide-react'

export default function ManageUsers() {
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    role_name: 'student', department: '',
  })

  useEffect(() => { loadUsers() }, [filter])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = filter ? { role: filter } : {}
      const res = await usersAPI.list(params)
      setUsers(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ first_name: '', last_name: '', email: '', password: '', role_name: 'student', department: '' })
    setShowModal(true)
  }

  const openEdit = (user) => {
    setEditing(user)
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      password: '',
      role_name: user.role?.name || 'student',
      department: user.department || '',
      is_active: user.is_active,
      is_verified: user.is_verified,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { first_name, last_name, email, is_active, is_verified } = form
        await usersAPI.update(editing.id, { first_name, last_name, email, is_active, is_verified })
      } else {
        await usersAPI.create(form)
      }
      setShowModal(false)
      loadUsers()
    } catch (err) { alert(err.response?.data?.detail || 'Failed to save user') }
  }

  const handleToggleActive = async (user) => {
    try {
      await usersAPI.update(user.id, { is_active: !user.is_active })
      loadUsers()
    } catch { alert('Failed') }
  }

  const handleToggleVerified = async (user) => {
    try {
      await usersAPI.update(user.id, { is_verified: !user.is_verified })
      loadUsers()
    } catch { alert('Failed') }
  }

  const roleBadges = {
    admin: 'bg-navy-900 text-white',
    teacher: 'bg-info-light text-info-dark',
    student: 'bg-success-light text-success-dark',
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-200 bg-accent-50 text-accent-700 text-[11px] font-bold uppercase tracking-widest mb-3">
          <Users className="w-3 h-3" />
          User Management
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Users</h1>
        <p className="text-navy-400 mt-1.5">{users.length} total users in the CS Department</p>
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <div className="flex gap-1.5">
          {[{ value: '', label: 'All' }, { value: 'admin', label: 'Admin' }, { value: 'teacher', label: 'Teacher' }, { value: 'student', label: 'Student' }].map((r) => (
            <button key={r.value} onClick={() => setFilter(r.value)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === r.value
                  ? 'bg-navy-900 text-white shadow-md shadow-navy-900/10'
                  : 'bg-white text-navy-500 border border-surface-200 hover:bg-surface-100'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="w-4 h-4" />
          New User
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-50">
              <th className="px-6 py-3.5 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3.5 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3.5 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3.5 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-navy-300 text-sm">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-navy-300 text-sm">No users found</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-surface-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-navy-900/5 border border-navy-900/10 flex items-center justify-center">
                      <span className="text-navy-700 text-xs font-bold">{user.first_name?.[0]}{user.last_name?.[0]}</span>
                    </div>
                    <span className="text-sm font-semibold text-navy-900">{user.first_name} {user.last_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-navy-500">
                    <Mail className="w-3.5 h-3.5 text-navy-300" />
                    {user.email}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`badge ${roleBadges[user.role?.name] || 'badge-neutral'}`}>
                    {user.role?.name}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-success' : 'bg-danger'}`} />
                      <span className="text-xs text-navy-500 font-medium">{user.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className={`w-3 h-3 ${user.is_verified ? 'text-accent-600' : 'text-navy-300'}`} />
                      <span className={`text-2xs font-medium ${user.is_verified ? 'text-accent-700' : 'text-navy-400'}`}>
                        {user.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => openEdit(user)}
                      className="inline-flex items-center gap-1 text-xs text-navy-500 hover:text-navy-900 font-semibold transition-colors">
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    {user.is_verified ? (
                      <button onClick={() => handleToggleVerified(user)}
                        className="inline-flex items-center gap-1 text-xs text-warning-dark hover:text-warning font-semibold transition-colors">
                        Unverify
                      </button>
                    ) : (
                      <button onClick={() => handleToggleVerified(user)}
                        className="inline-flex items-center gap-1 text-xs text-success-dark hover:text-success font-semibold transition-colors">
                        <CheckCircle className="w-3 h-3" />
                        Verify
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(user)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
                        user.is_active ? 'text-danger hover:text-danger-dark' : 'text-success-dark hover:text-success'
                      }`}>
                      {user.is_active ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit User' : 'Create User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">First name</label>
              <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="input-field" required />
            </div>
            <div>
              <label className="input-label">Last name</label>
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="input-field" required />
            </div>
          </div>
          <div>
            <label className="input-label">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field" required />
          </div>

          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-surface-200 bg-surface-50 cursor-pointer">
                  <span className="text-sm font-medium text-navy-700">Active</span>
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 accent-accent-500" />
                </label>
                <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-surface-200 bg-surface-50 cursor-pointer">
                  <span className="text-sm font-medium text-navy-700">Verified</span>
                  <input type="checkbox" checked={form.is_verified} onChange={(e) => setForm({ ...form, is_verified: e.target.checked })}
                    className="w-4 h-4 accent-accent-500" />
                </label>
              </div>
              <p className="text-2xs text-navy-400">Editing {editing.first_name} {editing.last_name} ({editing.role?.name})</p>
            </>
          ) : (
            <>
              <div>
                <label className="input-label">Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field" required minLength={6} />
              </div>
              <div>
                <label className="input-label">Role</label>
                <select value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })}
                  className="input-field">
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="input-label">Department</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="input-field" placeholder="e.g. Computer Science" />
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Create User'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}