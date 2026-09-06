import { useState, useEffect } from 'react'
import { usersAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import {
  UserCheck, UserPlus, Pencil, CheckCircle2, Trash2, Mail, Search, Eye, EyeOff,
} from 'lucide-react'

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
  })

  useEffect(() => { loadTeachers() }, [])

  const loadTeachers = async () => {
    setLoading(true)
    try {
      const res = await usersAPI.listTeachers()
      setTeachers(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({
      first_name: '', last_name: '', email: '', phone: '', password: '',
    })
    setShowPassword(false)
    setShowModal(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({
      first_name: t.first_name || '', last_name: t.last_name || '', email: t.email || '',
      phone: (t.phone || '').replace(/^\+92/, ''), password: '',
    })
    setShowPassword(false)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const phone = `+92${form.phone}`.replace(/\s+/g, '')
    try {
      if (editing) {
        const { password, ...rest } = form
        await usersAPI.updateTeacher(editing.id, { ...rest, phone })
      } else {
        await usersAPI.createTeacher({ ...form, phone })
      }
      setShowModal(false)
      loadTeachers()
    } catch (err) { alert(err.response?.data?.detail || 'Failed to save teacher') }
  }



  const handleHardDelete = async (t) => {
    if (!confirm(`Permanently delete ${t.first_name} ${t.last_name}? This cannot be undone.`)) return
    try { await usersAPI.hardDeleteTeacher(t.id); loadTeachers() } catch { alert('Failed') }
  }


  const filteredTeachers = teachers.filter((t) => {
    const q = search.trim().toLowerCase()
    const roleMatch =
      filter === '' ||
      (filter === 'active' && t.is_active) ||
      (filter === 'inactive' && !t.is_active)
    if (!roleMatch) return false
    if (!q) return true
    return (
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q)
    )
  })

  const stats = [
    { label: 'Total Teachers', value: teachers.length, icon: UserCheck, chip: 'bg-navy-900/10 text-navy-800 border-navy-900/10' },
    { label: 'Active', value: teachers.filter((t) => t.is_active).length, icon: CheckCircle2, chip: 'bg-success/10 text-success-dark border-success/20' },
  ]

  const input = "w-full px-3.5 py-2.5 bg-surface-0 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 hover:border-navy-300"

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <UserCheck className="w-3 h-3" />
          Teacher Management
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Teachers</h1>
        <p className="text-sm text-navy-400 mt-1">
          {teachers.length} faculty members
          {search.trim() || filter ? ` · ${filteredTeachers.length} matching` : ''}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
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
        <div className="inline-flex gap-1 p-1 bg-navy-900/5 rounded-xl self-start lg:self-center">
          {[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }].map((r) => (
            <button key={r.value} onClick={() => setFilter(r.value)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
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
          New Teacher
        </Button>
      </div>

      {/* Table */}
      <div className="border border-surface-200 rounded-xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50/60">
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Teacher</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-2xs font-bold text-navy-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="w-9 h-9 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <span className="inline-flex w-12 h-12 rounded-2xl bg-navy-900/5 text-navy-400 border border-navy-900/10 items-center justify-center mb-3">
                      <UserCheck className="w-6 h-6" />
                    </span>
                    <p className="text-navy-500 text-sm font-medium">No teachers found matching your criteria.</p>
                  </td>
                </tr>
              ) : filteredTeachers.map((t) => {
                return (
                  <tr key={t.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-info to-info-dark flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold">{t.first_name?.[0]}{t.last_name?.[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy-900 truncate">{t.first_name} {t.last_name}</p>
                          <p className="text-2xs font-mono text-navy-300">{t.phone || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-sm text-navy-500">
                          <Mail className="w-3.5 h-3.5 text-navy-300 shrink-0" />
                          {t.email}
                        </span>
                        {t.phone && <span className="block text-2xs text-navy-300 font-medium pl-5">{t.phone}</span>}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold border ${
                        t.is_active
                          ? 'bg-success-light text-success-dark border-success/20'
                          : 'bg-surface-100 text-navy-400 border-surface-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.is_active ? 'bg-success' : 'bg-navy-300'}`} />
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(t)} title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-500 border border-surface-200 bg-white hover:bg-surface-50 hover:text-navy-900 transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleHardDelete(t)} title="Delete"
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

      {/* Add / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Teacher' : 'Create Teacher'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">First name</label>
              <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={input} required />
            </div>
            <div>
              <label className="input-label">Last name</label>
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={input} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} required />
            </div>
            <div>
              <label className="input-label">Phone</label>
              <div className="relative flex">
                <span className="flex items-center pl-3.5 pr-2 bg-surface-100 border border-r-0 border-surface-200 rounded-l-xl text-sm font-semibold text-navy-600 select-none">+92</span>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 bg-surface-0 border border-surface-200 rounded-r-xl text-sm text-navy-900 placeholder-navy-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 hover:border-navy-300" placeholder="3XX XXXXXXX" />
              </div>
            </div>
          </div>
          {!editing && (
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${input} pr-10`} required minLength={6} placeholder="Min. 8 characters" />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Create Teacher'}</Button>
          </div>
        </form>
      </Modal>


    </div>
  )
}