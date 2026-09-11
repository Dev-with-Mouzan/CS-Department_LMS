import { useState, useEffect, useRef } from 'react'
import { backupAPI } from '../services/api'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import {
  Download, Trash2, Database, HardDrive, Clock, RefreshCw, ShieldCheck,
  Upload, AlertTriangle, CheckCircle2,
} from 'lucide-react'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminBackup() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importConfirm, setImportConfirm] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => { loadBackups() }, [])

  const loadBackups = async () => {
    setLoading(true)
    try {
      const res = await backupAPI.list()
      setBackups(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      await backupAPI.create()
      await loadBackups()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create backup')
    } finally { setCreating(false) }
  }

  const handleDownload = async (backup) => {
    try {
      const res = await backupAPI.download(backup.id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = backup.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) { setError('Download failed') }
  }

  const handleDelete = async (backup) => {
    setDeleteTarget(backup)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await backupAPI.delete(deleteTarget.id)
      await loadBackups()
    } catch (err) { setError('Delete failed') }
    setDeleteTarget(null)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportResult(null)
    if (!file.name.endsWith('.db') && !file.name.endsWith('.sql')) {
      setError('Please select a .db (SQLite) or .sql (PostgreSQL) file')
      return
    }
    setImportFile(file)
    setImportConfirm(true)
    e.target.value = ''
  }

  const confirmImport = async () => {
    if (!importFile) return
    setImporting(true)
    setImportConfirm(false)
    try {
      const res = await backupAPI.importBackup(importFile)
      setImportResult({ success: true, message: res.data.message })
      setImportFile(null)
    } catch (err) {
      setImportResult({ success: false, message: err.response?.data?.detail || 'Import failed' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {error && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-light text-danger-dark text-sm font-medium animate-slide-up">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-current opacity-50 hover:opacity-100">&times;</button>
        </div>
      )}
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Database className="w-3 h-3" />
          System Backup
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Backup</h1>
        <p className="text-sm text-navy-400 mt-1">
          Create, restore, and manage system backups
        </p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Create backup card */}
        <div className="border border-surface-200 rounded-xl bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 items-center justify-center shrink-0">
              <HardDrive className="w-6 h-6 text-white" />
            </span>
            <div>
              <p className="text-sm font-bold text-navy-900">Create Backup</p>
              <p className="text-xs text-navy-400">Snapshot the current database</p>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full" size="sm">
            {creating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {creating ? 'Creating...' : 'Create Backup'}
          </Button>
        </div>

        {/* Import backup card */}
        <div className="border border-surface-200 rounded-xl bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 items-center justify-center shrink-0">
              <Upload className="w-6 h-6 text-white" />
            </span>
            <div>
              <p className="text-sm font-bold text-navy-900">Import Backup</p>
              <p className="text-xs text-navy-400">Restore from a .db or .sql file</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".db,.sql"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            variant="secondary"
            className="w-full"
            size="sm"
          >
            {importing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {importing ? 'Restoring...' : 'Choose File to Import'}
          </Button>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className={`mb-6 flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-slide-up ${
          importResult.success ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'
        }`}>
          {importResult.success ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <p>{importResult.message}</p>
            {importResult.success && (
              <p className="text-xs mt-1 opacity-70">Refresh the page to see the restored data.</p>
            )}
          </div>
          <button onClick={() => setImportResult(null)} className="text-current opacity-50 hover:opacity-100">
            <span className="sr-only">Dismiss</span>
            &times;
          </button>
        </div>
      )}

      {/* Backups list */}
      <div className="border border-surface-200 rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/60">
          <h2 className="text-sm font-bold text-navy-900">Previous Backups</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-9 h-9 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-16">
            <span className="inline-flex w-12 h-12 rounded-2xl bg-navy-900/5 text-navy-400 border border-navy-900/10 items-center justify-center mb-3">
              <Database className="w-6 h-6" />
            </span>
            <p className="text-navy-500 text-sm font-medium">No backups yet</p>
            <p className="text-navy-400 text-xs mt-1">Create your first backup to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {backups.map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 transition-colors">
                <span className="inline-flex w-10 h-10 rounded-xl bg-accent-500/10 items-center justify-center shrink-0">
                  <Database className="w-5 h-5 text-accent-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">{b.filename}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                      <Clock className="w-3 h-3" />
                      {formatTime(b.created_at)}
                    </span>
                    <span className="text-2xs text-navy-300">|</span>
                    <span className="text-2xs text-navy-400">{formatSize(b.size_bytes)}</span>
                    <span className="text-2xs text-navy-300">|</span>
                    <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                      <ShieldCheck className="w-3 h-3" />
                      {b.db_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {Object.entries(b.tables).map(([table, count]) => count > 0 && (
                      <span key={table} className="px-1.5 py-0.5 rounded bg-surface-100 text-2xs text-navy-500">
                        {table}: {count}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleDownload(b)} title="Download"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-500 border border-surface-200 bg-white hover:bg-surface-50 hover:text-navy-900 transition-all">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(b)} title="Delete"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Backup"
        message={`Delete backup ${deleteTarget?.filename}? This cannot be undone.`}
        confirmLabel="Delete"
      />

      {/* Import confirm */}
      <ConfirmDialog
        isOpen={importConfirm}
        onClose={() => { setImportConfirm(false); setImportFile(null) }}
        onConfirm={confirmImport}
        title="Restore Database"
        message={`Replace the current database with "${importFile?.name}"? This will overwrite all current data. This action cannot be undone.`}
        confirmLabel="Restore"
      />
    </div>
  )
}
