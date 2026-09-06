import { useState, useEffect } from 'react'
import { usersAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import {
  Users, UserPlus, Mail, Pencil, ShieldCheck, ShieldOff,
  Trash2, Search, GraduationCap, UserCheck, Clock, Eye, EyeOff,
} from 'lucide-react'

const ROLE_BAGE = {
  admin: 'bg-navy-900 text-white border border-navy-900',
  teacher: 'bg-info/10 text-info-dark border border-info/20',
  student: 'bg-success/10 text-success-dark border border-success/20',
}

const AVATAR_GRADIENT = {
  admin: 'from-navy-800 to-navy-950',
  teacher: 'from-info to-info-dark',
  student: 'from-accent-400 to-accent-600',
}

export default function ManageUsers() {
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
    role_name: 'student', semester: '',
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
    setForm({ first_name: '', last_name: '', email: '', phone: '', password: '', role_name: 'student', semester: '' })
    setShowPassword(false)
    setShowModal(true)
  }

  const openEdit = (user) => {
    setEditing(user)
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: (user.phone || '').replace(/^\+92/, ''),
      password: '',
      role_name: user.role?.name || 'student',
      semester: user.student_profile?.semester || '',
      is_active: user.is_active,
      is_verified: user.is_verified,
    })
    setShowPassword(false)
    setShowModal(true)
  }

  const normalizePhone = (p) => (p ? `+92${p.replace(/^\+92/, '')}` : undefined)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { first_name, last_name, email, phone, is_active, is_verified, semester } = form
        const payload = { first_name, last_name, email, phone: normalizePhone(phone), is_active, is_verified }
        if (editing.role?.name === 'student' && semester) payload.semester = parseInt(semester, 10)
        await usersAPI.update(editing.id, payload)
      } else {
        const { first_name, last_name, email, phone, password, role_name, semester } = form
        const payload = { first_name, last_name, email, phone: normalizePhone(phone), password, role_name }
        if (role_name === 'student' && semester) {
          payload.semester = parseInt(semester, 10)
        }
        await usersAPI.create(payload)
      }
      setShowModal(false)
      loadUsers()
    } catch (err) { alert(err.response?.data?.detail || 'Failed to save user') }
  }

  const handleHardDelete = async (user) => {
    if (!confirm(`Permanently delete ${user.first_name} ${user.last_name}? This cannot be undone.`)) return
    try { await usersAPI.hardDelete(user.id); loadUsers() } catch { alert('Failed') }
  }


  const filteredUsers = users.filter((user) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q)
    )
  })

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, chip: 'bg-navy-900/10 text-navy-800 border-navy-900/10' },
    { label: 'Students', value: users.filter((u) => u.role?.name === 'student').length, icon: GraduationCap, chip: 'bg-success/10 text-success-dark border-success/20' },
    { label: 'Teachers', value: users.filter((u) => u.role?.name === 'teacher').length, icon: UserCheck, chip: 'bg-info/10 text-info-dark border-info/20' },
    { label: 'Pending Verification', value: users.filter((u) => !u.is_verified).length, icon: Clock, chip: 'bg-warning/10 text-warning-dark border-warning/20' },
  ]

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Users className="w-3 h-3" />
          User Management
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Users</h1>
        <p className="text-sm text-navy-400 mt-1">
          {users.length} total users in the CS Department
          {search.trim() || filter ? ` · ${filteredUsers.length} matching` : ''}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="border border-surface-200 rounded-xl bg-white p-4 flex items-center gap-3">
            <span className={`inline-flex w-11 h-11 rounded-xl border items-center justify-center shrink-0 ${s.chip}`}>
              <s.icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold text-navy-900 tracking-tight leading-none">{s.value}</p>
              <p className="text-xs font-medium text-navy-400 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: filters + search + action */}
      <div className="border border-surface-200 rounded-xl bg-white p-3 mb-8 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="inline-flex justify-center gap-1 p-1 bg-navy-900/5 rounded-xl self-center w-full lg:w-auto lg:self-center">
          {[{ value: '', label: 'All' }, { value: 'admin', label: 'Admin' }, { value: 'teacher', label: 'Teacher' }, { value: 'student', label: 'Student' }].map((r) => (
            <button key={r.value} onClick={() => setFilter(r.value)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                filter === r.value
                  ? 'bg-navy-900 text-white shadow-md shadow-navy-900/10'
                  : 'text-navy-500 hover:bg-white hover:text-navy-800'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
          />
        </div>
        <Button onClick={openCreate} className="lg:self-center">
          <UserPlus className="w-4 h-4" />
          New User
        </Button>
      </div>

      {/* Users table */}
      <div className="border border-surface-200 rounded-xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50/60">
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-2xs font-bold text-navy-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="w-9 h-9 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <span className="inline-flex w-12 h-12 rounded-2xl bg-navy-900/5 text-navy-400 border border-navy-900/10 items-center justify-center mb-3">
                      <Users className="w-6 h-6" />
                    </span>
                    <p className="text-navy-500 text-sm font-medium">No users found matching your criteria.</p>
                  </td>
                </tr>
              ) : filteredUsers.map((user) => {
                const role = user.role?.name || 'student'
                return (
                  <tr key={user.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 ${AVATAR_GRADIENT[role] || AVATAR_GRADIENT.student}`}>
                          <span className="text-white text-xs font-bold">{user.first_name?.[0]}{user.last_name?.[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy-900 truncate">{user.first_name} {user.last_name}</p>
                          <p className="text-2xs font-mono text-navy-300">{user.phone || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-navy-500">
                        <Mail className="w-3.5 h-3.5 text-navy-300 shrink-0" />
                        {user.email}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-semibold capitalize ${ROLE_BAGE[role]}`}>
                        {role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold border ${
                          user.is_active
                            ? 'bg-success-light text-success-dark border-success/20'
                            : 'bg-surface-100 text-navy-400 border-surface-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-success' : 'bg-navy-300'}`} />
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold border ${
                          user.is_verified
                            ? 'bg-accent-500/10 text-accent-700 border-accent-200'
                            : 'bg-warning/10 text-warning-dark border-warning/20'
                        }`}>
                          {user.is_verified ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                          {user.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(user)} title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-500 border border-surface-200 bg-white hover:bg-surface-50 hover:text-navy-900 transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button onClick={() => handleHardDelete(user)} title="Delete"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit User' : 'Create User'} size="lg">
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
          <div className="grid grid-cols-2 gap-3">

            <div>
              <label className="input-label">Phone</label>
              <div className="relative flex">
                <span className="flex items-center pl-3.5 pr-2 bg-surface-100 border border-r-0 border-surface-200 rounded-l-xl text-sm font-semibold text-navy-600 select-none">+92</span>
                <input type="tel" value={form.phone.replace(/^\+92/, '')}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface-0 border border-surface-200 rounded-r-xl text-sm text-navy-900 placeholder-navy-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 hover:border-navy-300" placeholder="3XX XXXXXXX" />
              </div>
              {form.role_name === 'student' && !editing && (
                <p className="text-2xs text-navy-400 mt-1">An OTP will be sent to this number for account verification.</p>
              )}
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
              {editing.role?.name === 'student' && (
                <div>
                  <label className="input-label">Semester</label>
                  <input type="number" value={form.semester} min={1} max={8}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="input-field" placeholder="1 – 8" required />
                </div>
              )}
              <p className="text-2xs text-navy-400">Editing {editing.first_name} {editing.last_name} ({editing.role?.name})</p>
            </>
          ) : (
            <>
              <div>
                <label className="input-label">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field pr-10" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
              {form.role_name === 'student' && (
                <div>
                  <label className="input-label">Semester</label>
                  <input type="number" value={form.semester} min={1} max={8}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="input-field" placeholder="1 – 8" required />
                </div>
              )}
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