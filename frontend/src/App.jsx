import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

// ─── API ────────────────────────────────────────────────────────────────────
const API = axios.create({ baseURL: '/api' })
API.interceptors.request.use(cfg => {
  const t = localStorage.getItem('il_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
API.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('il_token')
    window.location.reload()
  }
  return Promise.reject(err)
})

// ─── CONTEXT ────────────────────────────────────────────────────────────────
const AppCtx = createContext(null)
const useApp = () => useContext(AppCtx)

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  bg: '#0a0e1a', surface: '#111827', border: '#1e2d4a', border2: '#141e33',
  text: '#f5f0e8', text2: '#c8d5e8', text3: '#8b9dc3', muted: '#4a5a7d',
  gold: '#c9a84c', goldL: '#e8c660',
}

// ─── ICON PATHS ─────────────────────────────────────────────────────────────
const IP = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  clients:  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  matters:  'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  documents:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  billing:  'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  research: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  ai:       'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  users:    'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  tasks:    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  trust:    'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  plus:     'M12 4v16m8-8H4',
  search:   'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  logout:   'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  back:     'M10 19l-7-7m0 0l7-7m-7 7h18',
  check:    'M5 13l4 4L19 7',
  alert:    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  clock:    'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  scale:    'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  x:        'M6 18L18 6M6 6l12 12',
  edit:     'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  upload:   'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  copy:     'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  invoice:  'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  note:     'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  eye:      'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  lock:     'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
}

const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={IP[name] || IP.dashboard} />
  </svg>
)

// ─── SHARED UI PRIMITIVES ───────────────────────────────────────────────────
const iS = {
  width:'100%', background:'#0d1526', border:`1px solid ${C.border}`,
  borderRadius:8, padding:'10px 12px', color:C.text, fontSize:14,
  outline:'none', boxSizing:'border-box', fontFamily:'inherit',
}
const sS = { ...iS }

const Card = ({ children, style={}, onClick }) => (
  <div onClick={onClick} style={{
    background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20,
    cursor:onClick?'pointer':'default', ...style
  }}>{children}</div>
)

const Btn = ({ children, onClick, variant='primary', size='md', icon, disabled, type='button', style={} }) => {
  const vs = {
    primary:   { background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#0a0e1a', border:'none' },
    secondary: { background:'#1e2d4a', color:C.text3, border:`1px solid #253552` },
    danger:    { background:'rgba(248,113,113,0.12)', color:'#f87171', border:'1px solid rgba(248,113,113,0.2)' },
    ghost:     { background:'transparent', color:C.text3, border:'none' },
    success:   { background:'rgba(52,211,153,0.12)', color:'#34d399', border:'1px solid rgba(52,211,153,0.2)' },
  }
  const ps = { sm:'5px 12px', md:'9px 18px', lg:'12px 24px' }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:ps[size], borderRadius:8, fontSize:size==='sm'?11:13,
      fontWeight:600, cursor:disabled?'default':'pointer',
      opacity:disabled?0.5:1, transition:'opacity 0.15s', fontFamily:'inherit',
      ...vs[variant], ...style
    }}>
      {icon && <Icon name={icon} size={13} />}{children}
    </button>
  )
}

const Badge = ({ children, color='blue' }) => {
  const cs = {
    blue:  { bg:'rgba(59,130,246,0.15)',  text:'#60a5fa' },
    green: { bg:'rgba(34,197,94,0.15)',   text:'#4ade80' },
    yellow:{ bg:'rgba(234,179,8,0.15)',   text:'#facc15' },
    red:   { bg:'rgba(239,68,68,0.15)',   text:'#f87171' },
    gray:  { bg:'rgba(107,114,128,0.15)', text:'#9ca3af' },
    gold:  { bg:'rgba(201,168,76,0.15)',  text:C.gold },
    purple:{ bg:'rgba(167,139,250,0.15)', text:'#a78bfa' },
  }
  const c = cs[color] || cs.blue
  return <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11,
    fontWeight:600, background:c.bg, color:c.text }}>{children}</span>
}

const StatCard = ({ label, value, icon, color=C.gold, sub }) => (
  <Card style={{ flex:1 }}>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
      <div>
        <div style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
          letterSpacing:'0.1em', marginBottom:8 }}>{label}</div>
        <div style={{ color:C.text, fontSize:26, fontWeight:700,
          fontFamily:'"Crimson Pro",Georgia,serif' }}>{value}</div>
        {sub && <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{sub}</div>}
      </div>
      <div style={{ width:40, height:40, borderRadius:10, background:`${color}18`,
        display:'flex', alignItems:'center', justifyContent:'center', color }}>
        <Icon name={icon} size={20} />
      </div>
    </div>
  </Card>
)

const FormField = ({ label, children, style={} }) => (
  <div style={style}>
    <label style={{ display:'block', color:C.muted, fontSize:11,
      letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>{label}</label>
    {children}
  </div>
)

const Modal = ({ title, children, onClose, width=480 }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ width, background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:16, padding:28, maxHeight:'88vh', overflowY:'auto',
      boxShadow:'0 30px 80px rgba(0,0,0,0.6)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
        <h3 style={{ color:'#d4c5a0', fontSize:17, margin:0,
          fontFamily:'"Crimson Pro",Georgia,serif', letterSpacing:'0.03em' }}>{title}</h3>
        <button onClick={onClose} style={{ background:'none', border:'none',
          color:C.muted, cursor:'pointer', padding:4, display:'flex' }}>
          <Icon name="x" size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
)

const Loader = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
    <div style={{ width:32, height:32, border:`3px solid ${C.border}`,
      borderTopColor:C.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
  </div>
)

const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display:'flex', gap:4, borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        padding:'10px 18px', background:'none', border:'none', cursor:'pointer',
        color: active===t.id ? C.gold : C.muted,
        borderBottom: active===t.id ? `2px solid ${C.gold}` : '2px solid transparent',
        fontSize:13, fontWeight: active===t.id ? 600 : 400,
        marginBottom:-1, fontFamily:'inherit',
      }}>{t.label}</button>
    ))}
  </div>
)

const Table = ({ headers, children }) => (
  <table style={{ width:'100%', borderCollapse:'collapse' }}>
    <thead>
      <tr style={{ borderBottom:`1px solid ${C.border}` }}>
        {headers.map(h => (
          <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:C.muted,
            fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>{children}</tbody>
  </table>
)

const Empty = ({ msg }) => (
  <div style={{ padding:40, textAlign:'center', color:C.muted, fontSize:14 }}>{msg}</div>
)

const SearchBar = ({ value, onChange, placeholder, style={} }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, background:C.surface,
    border:`1px solid ${C.border}`, borderRadius:10, padding:'8px 14px', ...style }}>
    <Icon name="search" size={16} />
    <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
      style={{ flex:1, background:'none', border:'none', outline:'none',
        color:C.text2, fontSize:14, fontFamily:'inherit' }} />
  </div>
)

const ModalFooter = ({ onCancel, loading, label='Save' }) => (
  <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
    <Btn variant="secondary" onClick={onCancel} type="button">Cancel</Btn>
    <Btn type="submit" disabled={loading}>{loading ? 'Saving…' : label}</Btn>
  </div>
)

const SectionTitle = ({ children }) => (
  <div style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
    letterSpacing:'0.1em', marginBottom:14 }}>{children}</div>
)

const Detail = ({ label, value, style={} }) => (
  <div style={style}>
    <div style={{ color:C.muted, fontSize:11, marginBottom:3 }}>{label}</div>
    <div style={{ color:C.text2, fontSize:13, fontWeight:500 }}>{value || '—'}</div>
  </div>
)

const Grid2 = ({ children }) => (
  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>{children}</div>
)

const tdS = { padding:'12px 16px', fontSize:13 }

const statusColor = s => ({
  active:'green', pending:'yellow', closed:'gray', suspended:'red', archived:'gray',
  draft:'gray', sent:'blue', partial:'yellow', paid:'green', overdue:'red',
  completed:'green', in_progress:'blue', cancelled:'gray',
  low:'gray', medium:'blue', high:'yellow', urgent:'red',
}[s] || 'blue')

const fmtDate = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-ZW',
  { day:'2-digit', month:'short', year:'numeric' }) : '—'
const todayStr = () => new Date().toISOString().slice(0,10)

// ─── NAV ────────────────────────────────────────────────────────────────────
const NAV = [
  { id:'dashboard', label:'Dashboard',    icon:'dashboard' },
  { id:'clients',   label:'Clients',      icon:'clients'   },
  { id:'matters',   label:'Matters',      icon:'matters'   },
  { id:'documents', label:'Documents',    icon:'documents' },
  { id:'calendar',  label:'Calendar',     icon:'calendar'  },
  { id:'tasks',     label:'Tasks',        icon:'tasks'     },
  { id:'billing',   label:'Billing',      icon:'billing'   },
  { id:'trust',     label:'Trust',        icon:'trust'     },
  { id:'research',  label:'Research',     icon:'research'  },
  { id:'ai',        label:'AI Assistant', icon:'ai'        },
  { id:'users',     label:'Users',        icon:'users'     },
  { id:'audit_log', label:'Audit Log',    icon:'activity'  },
  { id:'settings',  label:'Settings',     icon:'settings'  },
]

// ─── LOGIN ───────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [form, setForm] = useState({ username:'admin', password:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  // MFA state
  const [mfaRequired, setMFARequired] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [mfaCode, setMFACode] = useState('')
  const [useBa ckupCode, setUseBackupCode] = useState(false)

  const submit = async e => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const { data } = await API.post('/auth/login', form)

      // Check if MFA is required
      if (data.status === 'mfa_required') {
        setMFARequired(true)
        setTempToken(data.temp_token)
        setMFACode('')
        setUseBackupCode(false)
      } else {
        // Regular login
        localStorage.setItem('il_token', data.access_token)
        onLogin(data.user)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password')
    }
    finally { setLoading(false) }
  }

  const submitMFA = async e => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      let endpoint, payload

      if (useBackupCode) {
        endpoint = '/auth/mfa/verify-backup-code'
        payload = { temp_token: tempToken, backup_code: mfaCode }
      } else {
        endpoint = '/auth/mfa/verify-login'
        payload = { temp_token: tempToken, totp_code: mfaCode }
      }

      const { data } = await API.post(endpoint, payload)
      localStorage.setItem('il_token', data.access_token)
      onLogin(data.user)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code')
    }
    finally { setLoading(false) }
  }

  if (mfaRequired) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
        alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif' }}>
        <div style={{ width:400 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:16, padding:40, boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color:C.text, fontSize:20, marginBottom:6, fontWeight:600 }}>Two-Factor Authentication</h2>
            <p style={{ color:C.muted, fontSize:13, marginBottom:24 }}>
              Enter the code from your authenticator app or a backup code.
            </p>
            <form onSubmit={submitMFA}>
              <FormField label={useBackupCode ? 'Backup Code' : 'Authenticator Code'} style={{ marginBottom:18 }}>
                <input style={iS}
                  placeholder={useBackupCode ? 'e.g. ABC-123' : '000000'}
                  value={mfaCode}
                  onChange={e => setMFACode(e.target.value.toUpperCase())}
                  maxLength={useBackupCode ? 7 : 6}
                  required autoFocus />
              </FormField>
              {error && (
                <div style={{ color:'#f87171', fontSize:13, marginBottom:16,
                  background:'rgba(248,113,113,0.1)', padding:'10px 14px', borderRadius:8 }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} style={{
                width:'100%', padding:14,
                background: loading ? '#2a3650' : `linear-gradient(135deg,${C.gold},${C.goldL})`,
                border:'none', borderRadius:8, color:'#0a0e1a', fontWeight:700,
                fontSize:15, cursor:loading?'default':'pointer', fontFamily:'inherit', marginBottom:12 }}>
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button type="button" onClick={() => {
                setUseBackupCode(!useBackupCode)
                setMFACode('')
                setError('')
              }} style={{
                width:'100%', padding:10,
                background:'none', border:` 1px solid ${C.border}`, color:C.text3,
                borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                {useBackupCode ? 'Use Authenticator Code' : 'Use Backup Code'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ width:400 }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:14, marginBottom:12 }}>
            <div style={{ width:52, height:52,
              background:`linear-gradient(135deg,${C.gold},${C.goldL})`,
              borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:`0 0 30px ${C.gold}40` }}>
              <Icon name="scale" size={28} />
            </div>
            <div>
              <div style={{ fontSize:28, fontWeight:700, color:C.text,
                fontFamily:'"Crimson Pro",Georgia,serif', letterSpacing:'0.02em' }}>IntelliLaw</div>
              <div style={{ fontSize:11, color:C.muted, letterSpacing:'0.15em',
                textTransform:'uppercase' }}>Legal Operating System</div>
            </div>
          </div>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:16, padding:40, boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}>
          <h2 style={{ color:C.text, fontSize:20, marginBottom:6, fontWeight:600 }}>Secure Sign In</h2>
          <p style={{ color:C.muted, fontSize:13, marginBottom:32 }}>
            Your matters. Secure. Offline. Intelligent.</p>
          <form onSubmit={submit}>
            <FormField label="Username" style={{ marginBottom:18 }}>
              <input style={iS} value={form.username} required
                onChange={e => setForm(f => ({ ...f, username:e.target.value }))} />
            </FormField>
            <FormField label="Password" style={{ marginBottom:18 }}>
              <div style={{ position:'relative' }}>
                <input style={{ ...iS, paddingRight:44 }}
                  type={showPw ? 'text' : 'password'} value={form.password} required
                  onChange={e => setForm(f => ({ ...f, password:e.target.value }))} />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:C.muted, cursor:'pointer', display:'flex' }}>
                  <Icon name="eye" size={16} />
                </button>
              </div>
            </FormField>
            {error && (
              <div style={{ color:'#f87171', fontSize:13, marginBottom:16,
                background:'rgba(248,113,113,0.1)', padding:'10px 14px', borderRadius:8 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              width:'100%', padding:14,
              background: loading ? '#2a3650' : `linear-gradient(135deg,${C.gold},${C.goldL})`,
              border:'none', borderRadius:8, color:'#0a0e1a', fontWeight:700,
              fontSize:15, cursor:loading?'default':'pointer', fontFamily:'inherit' }}>
              {loading ? 'Authenticating…' : 'Sign In'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', color:'#3a4a6b', fontSize:12, marginTop:24 }}>
          IntelliLaw v1.0 · Offline-First · SADC Legal Platform</p>
      </div>
    </div>
  )
}

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
function Layout({ user, onLogout, children, activeTab, setActiveTab }) {
  return (
    <div style={{ display:'flex', height:'100vh', background:C.bg,
      overflow:'hidden', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      <div style={{ width:220, background:'#0d1526', borderRight:`1px solid ${C.border}`,
        display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px 18px 16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36,
              background:`linear-gradient(135deg,${C.gold},${C.goldL})`,
              borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="scale" size={20} />
            </div>
            <div>
              <div style={{ color:C.text, fontWeight:700, fontSize:16,
                fontFamily:'"Crimson Pro",Georgia,serif', letterSpacing:'0.02em' }}>IntelliLaw</div>
              <div style={{ color:C.muted, fontSize:9, letterSpacing:'0.12em',
                textTransform:'uppercase' }}>Legal OS</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, overflowY:'auto', padding:'10px 0' }}>
          {NAV.map(item => {
            const active = activeTab === item.id
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'10px 18px', border:'none', textAlign:'left', cursor:'pointer',
                background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                color: active ? C.gold : C.text3,
                borderLeft: active ? `3px solid ${C.gold}` : '3px solid transparent',
                fontSize:13, fontWeight: active ? 600 : 400, transition:'all 0.15s',
                fontFamily:'inherit',
              }}>
                <Icon name={item.icon} size={16} />{item.label}
              </button>
            )
          })}
        </nav>
        <div style={{ padding:14, borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:32, height:32, borderRadius:'50%',
              background:'linear-gradient(135deg,#1e3a5f,#2d5a8e)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#8bb4d8', fontSize:13, fontWeight:700 }}>
              {(user?.initials || user?.full_name?.[0] || 'U')}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:'#c8d5e8', fontSize:12, fontWeight:600,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.full_name || user?.username}</div>
              <div style={{ color:C.muted, fontSize:10, textTransform:'capitalize' }}>
                {user?.user_role}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{
            width:'100%', display:'flex', alignItems:'center', gap:8,
            padding:'7px 10px', background:'rgba(248,113,113,0.08)',
            border:'1px solid rgba(248,113,113,0.15)', borderRadius:6,
            color:'#f87171', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            <Icon name="logout" size={13} />Sign Out
          </button>
        </div>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ height:52, borderBottom:`1px solid ${C.border}`,
          display:'flex', alignItems:'center', padding:'0 24px',
          background:'#0d1526', gap:16 }}>
          <h1 style={{ color:'#d4c5a0', fontSize:16, fontWeight:600, margin:0,
            fontFamily:'"Crimson Pro",Georgia,serif', letterSpacing:'0.03em' }}>
            {NAV.find(n => n.id === activeTab)?.label}
          </h1>
          <div style={{ flex:1 }} />
          <div style={{ display:'flex', alignItems:'center', gap:8,
            background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px' }}>
            <Icon name="search" size={14} />
            <input placeholder="Quick search…" style={{
              background:'none', border:'none', outline:'none',
              color:C.text3, fontSize:13, width:180, fontFamily:'inherit' }} />
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:24 }}>{children}</div>
      </div>
    </div>
  )
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    API.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])
  if (!stats) return <Loader />
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:16 }}>
        <StatCard label="Active Clients"    value={stats.total_clients}  icon="clients"  color={C.gold} />
        <StatCard label="Active Matters"    value={stats.active_matters} icon="matters"  color="#3b82f6" />
        <StatCard label="Overdue Tasks"     value={stats.overdue_tasks}  icon="alert"    color="#f87171" />
        <StatCard label="Outstanding (USD)" value={`$${(stats.outstanding_invoices||0).toLocaleString()}`}
          icon="billing" color="#34d399" />
      </div>
      <div style={{ display:'flex', gap:16 }}>
        <Card style={{ flex:2 }}>
          <h3 style={{ color:'#d4c5a0', fontSize:14, fontWeight:600, marginBottom:16,
            fontFamily:'"Crimson Pro",Georgia,serif' }}>Upcoming Hearings</h3>
          {stats.upcoming_hearings?.length === 0
            ? <p style={{ color:C.muted, fontSize:13 }}>No hearings in the next 14 days.</p>
            : stats.upcoming_hearings?.map(h => (
              <div key={h.id} style={{ display:'flex', alignItems:'center', gap:14,
                padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:44, height:44, background:'#1e2d4a', borderRadius:8,
                  display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', flexShrink:0 }}>
                  <span style={{ color:C.gold, fontSize:16, fontWeight:700,
                    fontFamily:'"Crimson Pro",Georgia,serif', lineHeight:1 }}>
                    {new Date(h.date+'T12:00:00').getDate()}</span>
                  <span style={{ color:C.muted, fontSize:9, textTransform:'uppercase' }}>
                    {new Date(h.date+'T12:00:00').toLocaleString('en',{month:'short'})}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text2, fontSize:13, fontWeight:500 }}>{h.title}</div>
                  <div style={{ color:C.muted, fontSize:11 }}>
                    {h.location||'Location TBC'}{h.time ? ` · ${h.time}` : ''}</div>
                </div>
                <Badge color="blue">{h.hearing_type?.replace('_',' ')}</Badge>
              </div>
            ))
          }
        </Card>
        <Card style={{ flex:1 }}>
          <h3 style={{ color:'#d4c5a0', fontSize:14, fontWeight:600, marginBottom:16,
            fontFamily:'"Crimson Pro",Georgia,serif' }}>Matters by Type</h3>
          {stats.matter_types_breakdown?.map(({ type, count }) => (
            <div key={type} style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color:C.text3, fontSize:12, textTransform:'capitalize' }}>
                {type.replace('_',' ')}</span>
              <span style={{ color:C.gold, fontSize:13, fontWeight:700 }}>{count}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ─── CLIENTS ─────────────────────────────────────────────────────────────────
function Clients() {
  const [clients, setClients] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_type:'individual', country:'Zimbabwe' })
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const { data } = await API.get('/clients', { params:{ search, limit:50 } })
    setClients(data.items||[]); setTotal(data.total)
  }, [search])
  useEffect(() => { load() }, [load])

  const save = async e => {
    e.preventDefault(); setLoading(true)
    try {
      await API.post('/clients', form)
      toast.success('Client created')
      setShowForm(false); setForm({ client_type:'individual', country:'Zimbabwe' }); load()
    } catch(err) { toast.error(err.response?.data?.detail||'Error creating client') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ color:C.text, fontSize:20, margin:0,
            fontFamily:'"Crimson Pro",Georgia,serif' }}>Clients</h2>
          <p style={{ color:C.muted, fontSize:12, margin:'4px 0 0' }}>{total} clients on record</p>
        </div>
        <Btn icon="plus" onClick={() => setShowForm(true)}>New Client</Btn>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search clients by name, number, email…" />
      <Card style={{ padding:0, marginTop:12 }}>
        <Table headers={['Client #','Name','Type','Phone','City','KYC','Matters','']}>
          {clients.map((c,i) => (
            <tr key={c.id} style={{ borderBottom:`1px solid ${C.border2}`,
              background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
              <td style={tdS}><span style={{ color:C.gold, fontWeight:700, fontSize:12 }}>{c.client_number}</span></td>
              <td style={tdS}><span style={{ color:C.text2, fontWeight:500 }}>{c.display_name}</span></td>
              <td style={tdS}><Badge color="blue">{c.client_type}</Badge></td>
              <td style={tdS}><span style={{ color:C.text3, fontSize:12 }}>{c.phone||'—'}</span></td>
              <td style={tdS}><span style={{ color:C.text3, fontSize:12 }}>{c.city||'—'}</span></td>
              <td style={tdS}><Badge color={c.kyc_verified?'green':'red'}>{c.kyc_verified?'Verified':'Pending'}</Badge></td>
              <td style={tdS}><span style={{ color:C.gold, fontWeight:700 }}>{c.matters_count}</span></td>
              <td style={tdS}><Btn size="sm" variant="secondary" icon="edit">View</Btn></td>
            </tr>
          ))}
        </Table>
        {clients.length===0 && <Empty msg="No clients found. Create your first client." />}
      </Card>

      {showForm && (
        <Modal title="New Client" onClose={() => setShowForm(false)}>
          <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <FormField label="Client Type">
              <select style={sS} value={form.client_type}
                onChange={e => setForm(f => ({ ...f, client_type:e.target.value }))}>
                {['individual','corporate','government','ngo'].map(t =>
                  <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </FormField>
            {form.client_type === 'individual' ? (
              <div style={{ display:'flex', gap:12 }}>
                <FormField label="First Name" style={{ flex:1 }}>
                  <input style={iS} required value={form.first_name||''}
                    onChange={e => setForm(f => ({ ...f, first_name:e.target.value }))} />
                </FormField>
                <FormField label="Last Name" style={{ flex:1 }}>
                  <input style={iS} required value={form.last_name||''}
                    onChange={e => setForm(f => ({ ...f, last_name:e.target.value }))} />
                </FormField>
              </div>
            ) : (
              <FormField label="Company Name">
                <input style={iS} required value={form.company_name||''}
                  onChange={e => setForm(f => ({ ...f, company_name:e.target.value }))} />
              </FormField>
            )}
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Email" style={{ flex:1 }}>
                <input type="email" style={iS} value={form.email||''}
                  onChange={e => setForm(f => ({ ...f, email:e.target.value }))} />
              </FormField>
              <FormField label="Phone" style={{ flex:1 }}>
                <input style={iS} value={form.phone||''}
                  onChange={e => setForm(f => ({ ...f, phone:e.target.value }))} />
              </FormField>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="City" style={{ flex:1 }}>
                <input style={iS} value={form.city||''}
                  onChange={e => setForm(f => ({ ...f, city:e.target.value }))} />
              </FormField>
              <FormField label="Country" style={{ flex:1 }}>
                <input style={iS} value={form.country||'Zimbabwe'}
                  onChange={e => setForm(f => ({ ...f, country:e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Notes">
              <textarea rows={3} style={{ ...iS, resize:'vertical' }} value={form.notes||''}
                onChange={e => setForm(f => ({ ...f, notes:e.target.value }))} />
            </FormField>
            <ModalFooter onCancel={() => setShowForm(false)} loading={loading} label="Create Client" />
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── MATTERS LIST ─────────────────────────────────────────────────────────
function Matters() {
  const [matters, setMatters] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showConflictCheck, setShowConflictCheck] = useState(false)
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({ billing_type:'hourly', matter_type:'litigation' })
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [selectedClientForConflict, setSelectedClientForConflict] = useState(null)

  const load = useCallback(async () => {
    const { data } = await API.get('/matters', { params:{ search, status:statusFilter, limit:50 } })
    setMatters(data.items||[]); setTotal(data.total)
  }, [search, statusFilter])
  useEffect(() => { load() }, [load])

  if (selected) return <MatterDetail matterId={selected} onBack={() => { setSelected(null); load() }} />

  const openForm = async () => {
    const { data } = await API.get('/clients', { params:{ limit:200 } })
    setClients(data.items||[])
    // Show conflict check modal first
    // We'll let user pick client there
    setShowConflictCheck(true)
  }

  const handleConflictCheckComplete = (clientIdFromCheck) => {
    setShowConflictCheck(false)
    setShowForm(true)
    // Pre-populate client_id from conflict check
    if (clientIdFromCheck) {
      setForm(f => ({ ...f, client_id: clientIdFromCheck }))
    }
  }

  const save = async e => {
    e.preventDefault(); setLoading(true)
    try {
      await API.post('/matters', form)
      toast.success('Matter opened')
      setShowForm(false); setForm({ billing_type:'hourly', matter_type:'litigation' }); load()
    } catch(err) { toast.error(err.response?.data?.detail||'Error') }
    finally { setLoading(false) }
  }

  const mTC = t => ({ litigation:'red', conveyancing:'blue', corporate:'gold',
    employment:'yellow', family:'green', criminal:'red' }[t]||'gray')

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ color:C.text, fontSize:20, margin:0, fontFamily:'"Crimson Pro",Georgia,serif' }}>Matters</h2>
          <p style={{ color:C.muted, fontSize:12, margin:'4px 0 0' }}>{total} matters on record</p>
        </div>
        <Btn icon="plus" onClick={openForm}>Open Matter</Btn>
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search matters…" style={{ flex:1 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ ...sS, width:150 }}>
          <option value="">All Statuses</option>
          {['active','pending','closed','suspended'].map(s =>
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>
      <Card style={{ padding:0 }}>
        <Table headers={['Matter #','Title','Client','Type','Status','Court File','Next Hearing','']}>
          {matters.map((m,i) => (
            <tr key={m.id} onClick={() => setSelected(m.id)} style={{
              borderBottom:`1px solid ${C.border2}`,
              background:i%2===0?'transparent':'rgba(255,255,255,0.01)',
              cursor:'pointer' }}>
              <td style={tdS}><span style={{ color:C.gold, fontWeight:700, fontSize:12 }}>{m.matter_number}</span></td>
              <td style={{ ...tdS, maxWidth:220 }}>
                <div style={{ color:C.text2, fontSize:13, fontWeight:500,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</div>
                {m.is_urgent && <Badge color="red">Urgent</Badge>}
              </td>
              <td style={tdS}><span style={{ color:C.text3, fontSize:12 }}>{m.client_name}</span></td>
              <td style={tdS}><Badge color={mTC(m.matter_type)}>{m.matter_type?.replace('_',' ')}</Badge></td>
              <td style={tdS}><Badge color={statusColor(m.status)}>{m.status}</Badge></td>
              <td style={tdS}><span style={{ color:C.text3, fontSize:12 }}>{m.case_number||'—'}</span></td>
              <td style={tdS}><span style={{ color:C.text3, fontSize:12 }}>{fmtDate(m.next_hearing_date)}</span></td>
              <td style={tdS} onClick={e => e.stopPropagation()}>
                <Btn size="sm" variant="secondary" icon="edit" onClick={() => setSelected(m.id)}>Open</Btn>
              </td>
            </tr>
          ))}
        </Table>
        {matters.length===0 && <Empty msg="No matters found." />}
      </Card>

      {showConflictCheck && (
        <ConflictCheckModal
          onClose={() => setShowConflictCheck(false)}
          onProceed={handleConflictCheckComplete}
        />
      )}

      {showForm && (
        <Modal title="Open New Matter" onClose={() => setShowForm(false)} width={620}>
          <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <FormField label="Matter Title">
              <input style={iS} required value={form.title||''}
                onChange={e => setForm(f => ({ ...f, title:e.target.value }))} />
            </FormField>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Client" style={{ flex:2 }}>
                <select style={sS} required value={form.client_id||''}
                  onChange={e => setForm(f => ({ ...f, client_id:parseInt(e.target.value) }))}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                </select>
              </FormField>
              <FormField label="Type" style={{ flex:1 }}>
                <select style={sS} value={form.matter_type}
                  onChange={e => setForm(f => ({ ...f, matter_type:e.target.value }))}>
                  {['litigation','conveyancing','corporate','employment','family',
                    'criminal','commercial','tax','mining','immigration','other']
                    .map(t => <option key={t} value={t}>{t.replace('_',' ')
                      .replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                </select>
              </FormField>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Court Name" style={{ flex:1 }}>
                <input style={iS} value={form.court_name||''}
                  onChange={e => setForm(f => ({ ...f, court_name:e.target.value }))} />
              </FormField>
              <FormField label="Court File / Case #" style={{ flex:1 }}>
                <input style={iS} value={form.case_number||''}
                  onChange={e => setForm(f => ({ ...f, case_number:e.target.value }))} />
              </FormField>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Opposing Party" style={{ flex:1 }}>
                <input style={iS} value={form.opposing_party||''}
                  onChange={e => setForm(f => ({ ...f, opposing_party:e.target.value }))} />
              </FormField>
              <FormField label="Billing" style={{ flex:1 }}>
                <select style={sS} value={form.billing_type}
                  onChange={e => setForm(f => ({ ...f, billing_type:e.target.value }))}>
                  <option value="hourly">Hourly</option>
                  <option value="fixed">Fixed Fee</option>
                  <option value="contingency">Contingency</option>
                </select>
              </FormField>
              {form.billing_type==='hourly' && (
                <FormField label="Rate (USD/hr)" style={{ flex:1 }}>
                  <input type="number" step="10" style={iS} value={form.hourly_rate||''}
                    onChange={e => setForm(f => ({ ...f, hourly_rate:parseFloat(e.target.value) }))} />
                </FormField>
              )}
            </div>
            <div style={{ display:'flex', gap:20 }}>
              <label style={{ display:'flex', gap:8, alignItems:'center',
                color:C.text3, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={form.is_urgent||false}
                  onChange={e => setForm(f => ({ ...f, is_urgent:e.target.checked }))} />
                Urgent Matter
              </label>
              <label style={{ display:'flex', gap:8, alignItems:'center',
                color:C.text3, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={form.is_pro_bono||false}
                  onChange={e => setForm(f => ({ ...f, is_pro_bono:e.target.checked }))} />
                Pro Bono
              </label>
            </div>
            <ModalFooter onCancel={() => setShowForm(false)} loading={loading} label="Open Matter" />
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── MATTER DETAIL ────────────────────────────────────────────────────────
function MatterDetail({ matterId, onBack }) {
  const [matter, setMatter] = useState(null)
  const [tab, setTab] = useState('overview')
  const [notes, setNotes] = useState([])
  const [hearings, setHearings] = useState([])
  const [docs, setDocs] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [aiSessions, setAiSessions] = useState([])
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [showHearingForm, setShowHearingForm] = useState(false)
  const [showTimeForm, setShowTimeForm] = useState(false)
  const [noteForm, setNoteForm] = useState({ content:'', note_type:'general', is_privileged:true })
  const [hearingForm, setHearingForm] = useState({ hearing_type:'hearing', title:'', date:todayStr(), reminder_days:3 })
  const [timeForm, setTimeForm] = useState({ date:todayStr(), hours:1, rate:200, description:'', is_billable:true })
  const [uploading, setUploading] = useState(false)

  const loadAll = async () => {
    try {
      const [m, n, h, d, t, a] = await Promise.all([
        API.get(`/matters/${matterId}`),
        API.get(`/matters/${matterId}/notes`),
        API.get(`/matters/${matterId}/hearings`),
        API.get('/documents', { params:{ matter_id:matterId, limit:50 } }),
        API.get('/billing/time-entries', { params:{ matter_id:matterId, limit:100 } }),
        API.get('/ai/sessions', { params:{ matter_id:matterId, limit:20 } }),
      ])
      setMatter(m.data); setNotes(n.data); setHearings(h.data)
      setDocs(d.data.items||[]); setTimeEntries(t.data.items||[])
      setAiSessions(a.data||[])
    } catch(e) { toast.error('Could not load matter details') }
  }
  useEffect(() => { loadAll() }, [matterId])

  const addNote = async e => {
    e.preventDefault()
    await API.post(`/matters/${matterId}/notes`, noteForm)
    toast.success('Note added'); setShowNoteForm(false)
    setNoteForm({ content:'', note_type:'general', is_privileged:true }); loadAll()
  }

  const addHearing = async e => {
    e.preventDefault()
    await API.post(`/matters/${matterId}/hearings`, hearingForm)
    toast.success('Hearing added'); setShowHearingForm(false)
    setHearingForm({ hearing_type:'hearing', title:'', date:todayStr(), reminder_days:3 }); loadAll()
  }

  const addTime = async e => {
    e.preventDefault()
    await API.post('/billing/time-entries', { ...timeForm, matter_id:matterId })
    toast.success('Time logged'); setShowTimeForm(false)
    setTimeForm({ date:todayStr(), hours:1, rate:200, description:'', is_billable:true }); loadAll()
  }

  const uploadDoc = async e => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file); fd.append('matter_id', matterId); fd.append('doc_category','general')
    try {
      await API.post('/documents/upload', fd, { headers:{ 'Content-Type':'multipart/form-data' } })
      toast.success('Uploaded'); loadAll()
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); e.target.value='' }
  }

  if (!matter) return <Loader />

  const totalHours = timeEntries.reduce((s,e) => s+(e.hours||0), 0)
  const totalBilled = timeEntries.reduce((s,e) => s+(e.amount||0), 0)
  const unbilledAmt = timeEntries.filter(e=>!e.is_billed).reduce((s,e) => s+e.amount, 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:24 }}>
        <button onClick={onBack} style={{ background:'#1e2d4a', border:`1px solid ${C.border}`,
          borderRadius:8, padding:'8px 14px', color:C.text3, cursor:'pointer',
          display:'flex', alignItems:'center', gap:6, fontSize:13, fontFamily:'inherit', flexShrink:0 }}>
          <Icon name="back" size={14} />Matters
        </button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:6 }}>
            <span style={{ color:C.gold, fontWeight:700, fontSize:13 }}>{matter.matter_number}</span>
            {matter.is_urgent && <Badge color="red">Urgent</Badge>}
            {matter.is_pro_bono && <Badge color="purple">Pro Bono</Badge>}
            <Badge color={statusColor(matter.status)}>{matter.status}</Badge>
          </div>
          <h2 style={{ color:C.text, fontSize:22, margin:'0 0 4px',
            fontFamily:'"Crimson Pro",Georgia,serif' }}>{matter.title}</h2>
          <div style={{ color:C.text3, fontSize:13 }}>
            {matter.client_name} · {matter.matter_type?.replace('_',' ')}
            {matter.court_name ? ` · ${matter.court_name}` : ''}
            {matter.case_number ? ` (${matter.case_number})` : ''}
          </div>
        </div>
        <div style={{ display:'flex', gap:10, flexShrink:0 }}>
          {[
            { label:'Hours', value:totalHours.toFixed(1), color:C.gold },
            { label:'Fees',  value:`$${totalBilled.toLocaleString()}`, color:'#34d399' },
            { label:'Unbilled', value:`$${unbilledAmt.toLocaleString()}`, color:'#a78bfa' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center', padding:'8px 16px',
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ color:s.color, fontSize:18, fontWeight:700,
                fontFamily:'"Crimson Pro",Georgia,serif' }}>{s.value}</div>
              <div style={{ color:C.muted, fontSize:10, textTransform:'uppercase',
                letterSpacing:'0.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Tabs tabs={[
        { id:'overview',  label:`Overview` },
        { id:'notes',     label:`Notes (${notes.length})` },
        { id:'hearings',  label:`Hearings (${hearings.length})` },
        { id:'documents', label:`Docs (${docs.length})` },
        { id:'time',      label:`Time (${timeEntries.length})` },
        { id:'ai',        label:`AI (${aiSessions.length})` },
      ]} active={tab} onChange={setTab} />

      {/* OVERVIEW */}
      {tab==='overview' && (
        <div style={{ display:'flex', gap:16 }}>
          <div style={{ flex:2, display:'flex', flexDirection:'column', gap:14 }}>
            <Card>
              <SectionTitle>Matter Details</SectionTitle>
              <Grid2>
                <Detail label="Matter Type" value={matter.matter_type?.replace('_',' ')} />
                <Detail label="Billing Type" value={matter.billing_type} />
                <Detail label="Hourly Rate" value={matter.hourly_rate?`$${matter.hourly_rate}/hr`:null} />
                <Detail label="Opened" value={fmtDate(matter.opened_date)} />
                <Detail label="Next Hearing" value={fmtDate(matter.next_hearing_date)} />
                <Detail label="Responsible Attorney" value={matter.responsible_attorney} />
              </Grid2>
            </Card>
            <Card>
              <SectionTitle>Litigation Details</SectionTitle>
              <Grid2>
                <Detail label="Opposing Party" value={matter.opposing_party} />
                <Detail label="Opposing Counsel" value={matter.opposing_counsel} />
                <Detail label="Judge / Magistrate" value={matter.judge_name} />
                <Detail label="Division / Region" value={matter.division} />
              </Grid2>
            </Card>
            {matter.description && (
              <Card>
                <SectionTitle>Description</SectionTitle>
                <p style={{ color:C.text2, fontSize:14, lineHeight:1.75, margin:0,
                  fontFamily:'"Crimson Pro",Georgia,serif' }}>{matter.description}</p>
              </Card>
            )}
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14 }}>
            <Card>
              <SectionTitle>Court Information</SectionTitle>
              <Detail label="Court" value={matter.court_name} />
              <div style={{ marginTop:10 }}>
                <Detail label="Case Number" value={matter.case_number} />
              </div>
            </Card>
            <Card>
              <SectionTitle>Financial Summary</SectionTitle>
              <Detail label="Total Hours Logged" value={`${totalHours.toFixed(1)} hrs`} />
              <div style={{ marginTop:10 }}>
                <Detail label="Total Fees" value={`$${totalBilled.toLocaleString()}`} />
              </div>
              <div style={{ marginTop:10 }}>
                <Detail label="Unbilled Amount" value={`$${unbilledAmt.toLocaleString()}`} />
              </div>
            </Card>
            {matter.internal_notes && (
              <Card>
                <SectionTitle>Internal Notes</SectionTitle>
                <p style={{ color:C.text3, fontSize:13, lineHeight:1.6 }}>{matter.internal_notes}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* NOTES */}
      {tab==='notes' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
            <Btn icon="plus" onClick={() => setShowNoteForm(true)}>Add Note</Btn>
          </div>
          {notes.length===0 && <Empty msg="No notes yet. Add your first attendance note." />}
          {notes.map(n => (
            <Card key={n.id} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', gap:8 }}>
                  <Badge color={n.note_type==='advice'?'gold':n.note_type==='instruction'?'blue':'gray'}>
                    {n.note_type}</Badge>
                  {n.is_privileged && <Badge color="gold">Privileged</Badge>}
                </div>
                <span style={{ color:C.muted, fontSize:11 }}>
                  {n.author} · {fmtDate(n.created_at)}</span>
              </div>
              <p style={{ color:C.text2, fontSize:14, lineHeight:1.8, margin:0,
                fontFamily:'"Crimson Pro",Georgia,serif' }}>{n.content}</p>
            </Card>
          ))}
          {showNoteForm && (
            <Modal title="Add Note" onClose={() => setShowNoteForm(false)}>
              <form onSubmit={addNote} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'flex', gap:12 }}>
                  <FormField label="Note Type" style={{ flex:1 }}>
                    <select style={sS} value={noteForm.note_type}
                      onChange={e => setNoteForm(f => ({ ...f, note_type:e.target.value }))}>
                      {['general','advice','instruction','attendance'].map(t =>
                        <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  </FormField>
                  <FormField label="&nbsp;" style={{ flex:1, display:'flex', alignItems:'flex-end' }}>
                    <label style={{ display:'flex', gap:8, alignItems:'center',
                      color:C.text3, fontSize:13, cursor:'pointer', paddingBottom:10 }}>
                      <input type="checkbox" checked={noteForm.is_privileged}
                        onChange={e => setNoteForm(f => ({ ...f, is_privileged:e.target.checked }))} />
                      Attorney-Client Privilege
                    </label>
                  </FormField>
                </div>
                <FormField label="Note Content">
                  <textarea rows={6} required style={{ ...iS, resize:'vertical' }}
                    value={noteForm.content}
                    onChange={e => setNoteForm(f => ({ ...f, content:e.target.value }))}
                    placeholder="Enter attendance note, advice given, or instructions received…" />
                </FormField>
                <ModalFooter onCancel={() => setShowNoteForm(false)} label="Add Note" />
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* HEARINGS */}
      {tab==='hearings' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
            <Btn icon="plus" onClick={() => setShowHearingForm(true)}>Add Hearing</Btn>
          </div>
          {hearings.length===0 && <Empty msg="No hearings scheduled." />}
          {hearings.map(h => (
            <Card key={h.id} style={{ marginBottom:10, padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:48, height:48, background:'#1e2d4a', borderRadius:8,
                  display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', flexShrink:0 }}>
                  <span style={{ color:C.gold, fontSize:18, fontWeight:700,
                    fontFamily:'"Crimson Pro",Georgia,serif', lineHeight:1 }}>
                    {new Date(h.date+'T12:00:00').getDate()}</span>
                  <span style={{ color:C.muted, fontSize:9, textTransform:'uppercase' }}>
                    {new Date(h.date+'T12:00:00').toLocaleString('en',{month:'short'})}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text2, fontSize:14, fontWeight:600 }}>{h.title}</div>
                  <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>
                    {h.court_name||h.location||'Location TBC'}
                    {h.time ? ` · ${h.time}` : ''}
                    {h.judge_name ? ` · Before ${h.judge_name}` : ''}</div>
                  {h.outcome && (
                    <div style={{ color:'#34d399', fontSize:12, marginTop:4 }}>
                      Outcome: {h.outcome}</div>
                  )}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <Badge color={h.hearing_type==='filing_deadline'?'red':'blue'}>
                    {h.hearing_type?.replace('_',' ')}</Badge>
                  {h.is_completed && <Badge color="green">Done</Badge>}
                </div>
              </div>
            </Card>
          ))}
          {showHearingForm && (
            <Modal title="Add Hearing / Deadline" onClose={() => setShowHearingForm(false)}>
              <form onSubmit={addHearing} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <FormField label="Title">
                  <input style={iS} required value={hearingForm.title}
                    onChange={e => setHearingForm(f => ({ ...f, title:e.target.value }))} />
                </FormField>
                <div style={{ display:'flex', gap:12 }}>
                  <FormField label="Type" style={{ flex:1 }}>
                    <select style={sS} value={hearingForm.hearing_type}
                      onChange={e => setHearingForm(f => ({ ...f, hearing_type:e.target.value }))}>
                      {['hearing','trial','mention','judgment','filing_deadline',
                        'meeting','arbitration','mediation']
                        .map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Date" style={{ flex:1 }}>
                    <input type="date" style={iS} required value={hearingForm.date}
                      onChange={e => setHearingForm(f => ({ ...f, date:e.target.value }))} />
                  </FormField>
                  <FormField label="Time" style={{ flex:1 }}>
                    <input type="time" style={iS} value={hearingForm.time||''}
                      onChange={e => setHearingForm(f => ({ ...f, time:e.target.value }))} />
                  </FormField>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <FormField label="Location / Court Room" style={{ flex:2 }}>
                    <input style={iS} value={hearingForm.location||''}
                      onChange={e => setHearingForm(f => ({ ...f, location:e.target.value }))} />
                  </FormField>
                  <FormField label="Reminder (days before)" style={{ flex:1 }}>
                    <input type="number" style={iS} value={hearingForm.reminder_days}
                      onChange={e => setHearingForm(f => ({ ...f, reminder_days:parseInt(e.target.value) }))} />
                  </FormField>
                </div>
                <FormField label="Description">
                  <textarea rows={3} style={{ ...iS, resize:'vertical' }}
                    value={hearingForm.description||''}
                    onChange={e => setHearingForm(f => ({ ...f, description:e.target.value }))} />
                </FormField>
                <ModalFooter onCancel={() => setShowHearingForm(false)} label="Add Hearing" />
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* DOCUMENTS */}
      {tab==='documents' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
            <label style={{ display:'inline-flex', alignItems:'center', gap:6,
              padding:'9px 18px', background:`linear-gradient(135deg,${C.gold},${C.goldL})`,
              borderRadius:8, color:'#0a0e1a', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <Icon name="upload" size={14} />
              {uploading ? 'Uploading…' : 'Upload Document'}
              <input type="file" accept=".pdf,.docx,.txt,.doc"
                style={{ display:'none' }} onChange={uploadDoc} />
            </label>
          </div>
          {docs.length===0 && <Empty msg="No documents attached to this matter." />}
          <Card style={{ padding:0 }}>
            <Table headers={['Filename','Type','Category','Size','Uploaded','']}>
              {docs.map((d,i) => (
                <tr key={d.id} style={{ borderBottom:`1px solid ${C.border2}`,
                  background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                  <td style={tdS}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Icon name="documents" size={14} />
                      <span style={{ color:C.text2, fontSize:13, maxWidth:200,
                        overflow:'hidden', textOverflow:'ellipsis',
                        whiteSpace:'nowrap' }}>{d.original_filename}</span>
                    </div>
                    {d.has_text && <div style={{ color:'#34d399', fontSize:10 }}>✓ Text extracted</div>}
                  </td>
                  <td style={tdS}><Badge color="gray">{d.file_type?.toUpperCase()}</Badge></td>
                  <td style={tdS}><Badge color="blue">{d.doc_category}</Badge></td>
                  <td style={tdS}><span style={{ color:C.muted, fontSize:12 }}>
                    {d.file_size ? `${Math.round(d.file_size/1024)} KB` : '—'}</span></td>
                  <td style={tdS}><span style={{ color:C.muted, fontSize:12 }}>{d.upload_date?.slice(0,10)}</span></td>
                  <td style={tdS}>
                    <Btn size="sm" variant="secondary" icon="download"
                      onClick={() => window.open(`/api/documents/${d.id}/download`)}>Get</Btn>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}

      {/* TIME */}
      {tab==='time' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <span style={{ color:C.text3, fontSize:13 }}>
              <strong style={{ color:C.gold }}>{totalHours.toFixed(1)} hrs</strong>
              {' · '}
              <strong style={{ color:'#34d399' }}>${totalBilled.toLocaleString()}</strong>
              {' · '}
              <strong style={{ color:'#a78bfa' }}>${unbilledAmt.toLocaleString()} unbilled</strong>
            </span>
            <Btn icon="plus" onClick={() => setShowTimeForm(true)}>Log Time</Btn>
          </div>
          {timeEntries.length===0 && <Empty msg="No time entries yet." />}
          <Card style={{ padding:0 }}>
            <Table headers={['Date','Description','Hours','Rate','Amount','Status']}>
              {timeEntries.map((e,i) => (
                <tr key={e.id} style={{ borderBottom:`1px solid ${C.border2}`,
                  background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                  <td style={tdS}><span style={{ color:C.muted, fontSize:12 }}>{e.date}</span></td>
                  <td style={{ ...tdS, maxWidth:240 }}>
                    <span style={{ color:C.text2, fontSize:13 }}>{e.description}</span></td>
                  <td style={tdS}><span style={{ color:C.gold, fontWeight:600 }}>{e.hours}h</span></td>
                  <td style={tdS}><span style={{ color:C.text3, fontSize:12 }}>${e.rate}/hr</span></td>
                  <td style={tdS}><span style={{ color:'#34d399', fontWeight:600 }}>
                    ${e.amount?.toLocaleString()}</span></td>
                  <td style={tdS}><Badge color={e.is_billed?'green':'gray'}>
                    {e.is_billed?'Billed':'Unbilled'}</Badge></td>
                </tr>
              ))}
            </Table>
          </Card>
          {showTimeForm && (
            <Modal title="Log Time" onClose={() => setShowTimeForm(false)}>
              <form onSubmit={addTime} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'flex', gap:12 }}>
                  <FormField label="Date" style={{ flex:1 }}>
                    <input type="date" style={iS} required value={timeForm.date}
                      onChange={e => setTimeForm(f => ({ ...f, date:e.target.value }))} />
                  </FormField>
                  <FormField label="Hours" style={{ flex:1 }}>
                    <input type="number" step="0.25" min="0.25" style={iS} required
                      value={timeForm.hours}
                      onChange={e => setTimeForm(f => ({ ...f, hours:parseFloat(e.target.value) }))} />
                  </FormField>
                  <FormField label="Rate (USD/hr)" style={{ flex:1 }}>
                    <input type="number" step="10" style={iS} required value={timeForm.rate}
                      onChange={e => setTimeForm(f => ({ ...f, rate:parseFloat(e.target.value) }))} />
                  </FormField>
                </div>
                <FormField label="Description of Work">
                  <textarea rows={3} required style={{ ...iS, resize:'vertical' }}
                    value={timeForm.description}
                    onChange={e => setTimeForm(f => ({ ...f, description:e.target.value }))}
                    placeholder="e.g. Attendance at High Court, drafting heads of argument…" />
                </FormField>
                <label style={{ display:'flex', gap:8, alignItems:'center',
                  color:C.text3, fontSize:13, cursor:'pointer' }}>
                  <input type="checkbox" checked={timeForm.is_billable}
                    onChange={e => setTimeForm(f => ({ ...f, is_billable:e.target.checked }))} />
                  Billable to client
                </label>
                <div style={{ background:'rgba(201,168,76,0.08)',
                  border:`1px solid rgba(201,168,76,0.2)`, borderRadius:8, padding:'10px 14px' }}>
                  <span style={{ color:C.gold, fontWeight:700 }}>
                    Total: ${(timeForm.hours * timeForm.rate).toFixed(2)}</span>
                </div>
                <ModalFooter onCancel={() => setShowTimeForm(false)} label="Log Time" />
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* AI SESSIONS */}
      {tab==='ai' && (
        <div>
          {aiSessions.length===0 && <Empty msg="No AI sessions for this matter yet." />}
          {aiSessions.map(s => (
            <Card key={s.id} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <Badge color="gold">{s.session_type?.replace('_',' ')}</Badge>
                <span style={{ color:C.muted, fontSize:11 }}>{fmtDate(s.created_at)}</span>
              </div>
              {s.input_prompt && (
                <div style={{ color:C.text3, fontSize:12, marginBottom:10,
                  fontStyle:'italic' }}>{s.input_prompt}</div>
              )}
              {s.output_content && (
                <div style={{ color:C.text2, fontSize:13, lineHeight:1.75,
                  whiteSpace:'pre-wrap', fontFamily:'"Crimson Pro",Georgia,serif',
                  maxHeight:220, overflow:'auto',
                  background:'rgba(255,255,255,0.02)', borderRadius:8, padding:12 }}>
                  {s.output_content.slice(0,600)}{s.output_content.length>600?'…':''}
                </div>
              )}
              <div style={{ marginTop:10 }}>
                <Btn size="sm" variant="ghost" icon="copy"
                  onClick={() => { navigator.clipboard.writeText(s.output_content||''); toast.success('Copied') }}>
                  Copy Full
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── BILLING ─────────────────────────────────────────────────────────────────
function Billing() {
  const [tab, setTab] = useState('invoices')
  const [summary, setSummary] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [showCreate, setShowCreate] = useState(false)

  const loadAll = () => {
    API.get('/billing/reports/summary').then(r => setSummary(r.data)).catch(() => {})
    API.get('/billing/invoices', { params:{ limit:50 } }).then(r => setInvoices(r.data.items||[])).catch(() => {})
  }
  useEffect(() => { loadAll() }, [])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {summary && (
        <div style={{ display:'flex', gap:14 }}>
          <StatCard label="Total Invoiced"  value={`$${(summary.total_invoiced||0).toLocaleString()}`}  icon="billing" color={C.gold} />
          <StatCard label="Total Received"  value={`$${(summary.total_received||0).toLocaleString()}`}  icon="check"   color="#34d399" />
          <StatCard label="Outstanding"     value={`$${(summary.outstanding||0).toLocaleString()}`}      icon="alert"   color="#f87171" />
          <StatCard label="Trust Balance"   value={`$${(summary.trust_total||0).toLocaleString()}`}      icon="trust"   color="#3b82f6" />
          <StatCard label="Unbilled Hours"  value={`${summary.unbilled_hours||0}h`}                      icon="clock"   color="#a78bfa" />
        </div>
      )}

      <Tabs tabs={[
        { id:'invoices', label:'Invoices' },
        { id:'time',     label:'Time Entries' },
      ]} active={tab} onChange={setTab} />

      {tab==='invoices' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <Btn icon="plus" onClick={() => setShowCreate(true)}>Create Invoice</Btn>
          </div>
          <Card style={{ padding:0 }}>
            <Table headers={['Invoice #','Client','Matter','Issued','Total','Paid','Balance','Status','']}>
              {invoices.map((inv,i) => (
                <tr key={inv.id} style={{ borderBottom:`1px solid ${C.border2}`,
                  background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                  <td style={tdS}><span style={{ color:C.gold, fontWeight:700, fontSize:12 }}>{inv.invoice_number}</span></td>
                  <td style={tdS}><span style={{ color:C.text2, fontSize:13 }}>{inv.client_name}</span></td>
                  <td style={{ ...tdS, maxWidth:160 }}>
                    <span style={{ color:C.text3, fontSize:12, overflow:'hidden',
                      textOverflow:'ellipsis', display:'block', whiteSpace:'nowrap' }}>
                      {inv.matter_title||'—'}</span></td>
                  <td style={tdS}><span style={{ color:C.muted, fontSize:12 }}>{inv.issue_date}</span></td>
                  <td style={tdS}><span style={{ color:C.text2, fontWeight:600 }}>${(inv.total||0).toLocaleString()}</span></td>
                  <td style={tdS}><span style={{ color:'#34d399' }}>${(inv.amount_paid||0).toLocaleString()}</span></td>
                  <td style={tdS}><span style={{ color:inv.balance_due>0?'#f87171':'#34d399', fontWeight:600 }}>
                    ${(inv.balance_due||0).toLocaleString()}</span></td>
                  <td style={tdS}><Badge color={statusColor(inv.status)}>{inv.status}</Badge></td>
                  <td style={tdS}>
                    <div style={{ display:'flex', gap:6 }}>
                      {inv.status==='draft' && (
                        <Btn size="sm" variant="success" onClick={async () => {
                          await API.post(`/billing/invoices/${inv.id}/send`)
                          toast.success('Invoice marked as sent'); loadAll()
                        }}>Send</Btn>
                      )}
                      {inv.status!=='paid' && inv.status!=='draft' && (
                        <RecordPaymentBtn invoiceId={inv.id} onDone={loadAll} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            {invoices.length===0 && <Empty msg="No invoices yet. Create your first invoice." />}
          </Card>
        </div>
      )}

      {tab==='time' && <TimeEntriesGlobal />}

      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); loadAll() }}
        />
      )}
    </div>
  )
}

function RecordPaymentBtn({ invoiceId, onDone }) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ amount:'', payment_date:todayStr(), payment_method:'transfer', reference:'' })
  const save = async e => {
    e.preventDefault()
    try {
      await API.post('/billing/payments', { ...form, invoice_id:invoiceId })
      toast.success('Payment recorded'); setShow(false); onDone()
    } catch(err) { toast.error(err.response?.data?.detail||'Error') }
  }
  return (
    <>
      <Btn size="sm" variant="secondary" onClick={() => setShow(true)}>Payment</Btn>
      {show && (
        <Modal title="Record Payment" onClose={() => setShow(false)}>
          <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Amount (USD)" style={{ flex:1 }}>
                <input type="number" step="0.01" style={iS} required value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} />
              </FormField>
              <FormField label="Date" style={{ flex:1 }}>
                <input type="date" style={iS} required value={form.payment_date}
                  onChange={e => setForm(f => ({ ...f, payment_date:e.target.value }))} />
              </FormField>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Method" style={{ flex:1 }}>
                <select style={sS} value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method:e.target.value }))}>
                  {['transfer','cash','cheque','mobile_money','card'].map(m =>
                    <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                </select>
              </FormField>
              <FormField label="Bank Reference" style={{ flex:1 }}>
                <input style={iS} value={form.reference}
                  onChange={e => setForm(f => ({ ...f, reference:e.target.value }))} />
              </FormField>
            </div>
            <ModalFooter onCancel={() => setShow(false)} label="Record Payment" />
          </form>
        </Modal>
      )}
    </>
  )
}

function CreateInvoiceModal({ onClose, onDone }) {
  const [clients, setClients] = useState([])
  const [matters, setMatters] = useState([])
  const [unbilledEntries, setUnbilledEntries] = useState([])
  const [selectedEntries, setSelectedEntries] = useState([])
  const [form, setForm] = useState({ client_id:'', matter_id:'', vat_rate:0.15, due_date:'', notes:'' })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  useEffect(() => {
    API.get('/clients', { params:{ limit:200 } }).then(r => setClients(r.data.items||[]))
  }, [])

  const loadMatterAndEntries = async clientId => {
    const [m, t] = await Promise.all([
      API.get('/matters', { params:{ client_id:clientId, status:'active', limit:50 } }),
      API.get('/billing/time-entries', { params:{ is_billed:false, limit:200 } }),
    ])
    setMatters(m.data.items||[])
    setUnbilledEntries(t.data.items||[])
  }

  const filteredEntries = unbilledEntries.filter(e =>
    !form.matter_id || e.matter_id === parseInt(form.matter_id))

  const toggleEntry = id => setSelectedEntries(s =>
    s.includes(id) ? s.filter(x => x!==id) : [...s, id])

  const selectedItems = filteredEntries.filter(e => selectedEntries.includes(e.id))
  const subtotal = selectedItems.reduce((s,e) => s+e.amount, 0)
  const vat = subtotal * form.vat_rate
  const total = subtotal + vat

  const save = async () => {
    if (!form.client_id) { toast.error('Select a client'); return }
    setLoading(true)
    try {
      await API.post('/billing/invoices', {
        client_id: parseInt(form.client_id),
        matter_id: form.matter_id ? parseInt(form.matter_id) : null,
        vat_rate: form.vat_rate,
        due_date: form.due_date || undefined,
        notes: form.notes || undefined,
        time_entry_ids: selectedEntries,
      })
      toast.success('Invoice created successfully'); onDone()
    } catch(err) { toast.error(err.response?.data?.detail||'Error creating invoice') }
    finally { setLoading(false) }
  }

  const stepBarStyle = active => ({
    flex:1, height:4, borderRadius:2,
    background: active ? C.gold : C.border,
    transition:'background 0.3s',
  })

  return (
    <Modal title="Create Invoice" onClose={onClose} width={700}>
      {/* Progress */}
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        {[1,2,3].map(s => <div key={s} style={stepBarStyle(s <= step)} />)}
      </div>
      <div style={{ display:'flex', gap:16, marginBottom:24 }}>
        {['Select Client','Choose Time Entries','Review & Create'].map((label,i) => (
          <span key={i} style={{ fontSize:11, color: step===i+1 ? C.gold : C.muted,
            fontWeight: step===i+1 ? 600 : 400 }}>
            {i+1}. {label}
          </span>
        ))}
      </div>

      {/* Step 1 */}
      {step===1 && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <FormField label="Client">
            <select style={sS} required value={form.client_id}
              onChange={e => {
                const v = e.target.value
                setForm(f => ({ ...f, client_id:v, matter_id:'' }))
                if (v) loadMatterAndEntries(v)
              }}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.display_name} ({c.client_number})</option>)}
            </select>
          </FormField>
          {matters.length > 0 && (
            <FormField label="Matter (optional — leave blank for general invoice)">
              <select style={sS} value={form.matter_id}
                onChange={e => setForm(f => ({ ...f, matter_id:e.target.value }))}>
                <option value="">All matters for this client</option>
                {matters.map(m => <option key={m.id} value={m.id}>{m.matter_number} — {m.title}</option>)}
              </select>
            </FormField>
          )}
          <div style={{ display:'flex', gap:12 }}>
            <FormField label="Due Date" style={{ flex:1 }}>
              <input type="date" style={iS} value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date:e.target.value }))} />
            </FormField>
            <FormField label="VAT Rate" style={{ flex:1 }}>
              <select style={sS} value={form.vat_rate}
                onChange={e => setForm(f => ({ ...f, vat_rate:parseFloat(e.target.value) }))}>
                <option value={0}>0% — No VAT</option>
                <option value={0.15}>15% — Standard VAT</option>
              </select>
            </FormField>
          </div>
          <FormField label="Invoice Notes (optional)">
            <textarea rows={2} style={{ ...iS, resize:'none' }} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes:e.target.value }))}
              placeholder="e.g. Payment terms: 30 days from invoice date" />
          </FormField>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
            <Btn variant="secondary" onClick={onClose} type="button">Cancel</Btn>
            <Btn onClick={() => setStep(2)} disabled={!form.client_id}>
              Next: Select Entries →
            </Btn>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step===2 && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ color:C.text3, fontSize:13 }}>
              {filteredEntries.length} unbilled time {filteredEntries.length===1?'entry':'entries'} found
              {selectedEntries.length > 0 && (
                <span style={{ color:C.gold, fontWeight:600 }}> · {selectedEntries.length} selected</span>
              )}
            </p>
            {filteredEntries.length > 0 && (
              <Btn size="sm" variant="ghost" onClick={() => {
                if (selectedEntries.length === filteredEntries.length) setSelectedEntries([])
                else setSelectedEntries(filteredEntries.map(e => e.id))
              }}>
                {selectedEntries.length === filteredEntries.length ? 'Deselect All' : 'Select All'}
              </Btn>
            )}
          </div>
          {filteredEntries.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:C.muted,
              border:`1px dashed ${C.border}`, borderRadius:8 }}>
              No unbilled time entries found. You can still create a manual invoice.
            </div>
          ) : (
            <div style={{ maxHeight:340, overflowY:'auto',
              border:`1px solid ${C.border}`, borderRadius:8, marginBottom:16 }}>
              {filteredEntries.map(e => (
                <div key={e.id} onClick={() => toggleEntry(e.id)} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                  borderBottom:`1px solid ${C.border2}`, cursor:'pointer',
                  background: selectedEntries.includes(e.id) ? 'rgba(201,168,76,0.08)' : 'transparent',
                  transition:'background 0.15s',
                }}>
                  <input type="checkbox" readOnly checked={selectedEntries.includes(e.id)}
                    style={{ cursor:'pointer', flexShrink:0, accentColor:C.gold }} />
                  <div style={{ flex:1 }}>
                    <div style={{ color:C.text2, fontSize:13, fontWeight:500 }}>{e.description}</div>
                    <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>
                      {e.date} · {e.hours}h @ ${e.rate}/hr
                      {e.matter_title ? ` · ${e.matter_title}` : ''}
                    </div>
                  </div>
                  <span style={{ color:'#34d399', fontWeight:700, fontSize:14 }}>
                    ${e.amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
            <Btn variant="secondary" onClick={() => setStep(1)} type="button">← Back</Btn>
            <Btn onClick={() => setStep(3)}>Preview Invoice →</Btn>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step===3 && (
        <div>
          <Card style={{ marginBottom:20 }}>
            <SectionTitle>Invoice Preview</SectionTitle>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                ['Client', clients.find(c => c.id===parseInt(form.client_id))?.display_name],
                ['Matter', matters.find(m => m.id===parseInt(form.matter_id))?.title || 'General (all matters)'],
                ['Time Entries Selected', selectedEntries.length],
                ['Due Date', form.due_date ? fmtDate(form.due_date) : '30 days from issue'],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between',
                  paddingBottom:10, borderBottom:`1px solid ${C.border2}` }}>
                  <span style={{ color:C.text3, fontSize:13 }}>{l}</span>
                  <span style={{ color:C.text2, fontWeight:500, fontSize:13 }}>{v}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:4 }}>
                <span style={{ color:C.text3, fontSize:13 }}>Subtotal (Professional Fees)</span>
                <span style={{ color:C.text2, fontSize:13 }}>${subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:C.text3, fontSize:13 }}>
                  VAT ({(form.vat_rate*100).toFixed(0)}%)</span>
                <span style={{ color:C.text2, fontSize:13 }}>${vat.toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between',
                borderTop:`2px solid ${C.border}`, paddingTop:12, marginTop:4 }}>
                <span style={{ color:C.text, fontWeight:700, fontSize:16 }}>Total Due</span>
                <span style={{ color:C.gold, fontWeight:700, fontSize:22,
                  fontFamily:'"Crimson Pro",Georgia,serif' }}>${total.toFixed(2)}</span>
              </div>
            </div>
          </Card>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <Btn variant="secondary" onClick={() => setStep(2)} type="button">← Back</Btn>
            <Btn disabled={loading} onClick={save} icon="invoice">
              {loading ? 'Creating Invoice…' : 'Create Invoice'}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}

function TimeEntriesGlobal() {
  const [entries, setEntries] = useState([])
  useEffect(() => {
    API.get('/billing/time-entries', { params:{ limit:100 } })
      .then(r => setEntries(r.data.items||[])).catch(() => {})
  }, [])
  return (
    <Card style={{ padding:0 }}>
      <Table headers={['Date','Matter','Description','Attorney','Hours','Amount','Billed']}>
        {entries.map((e,i) => (
          <tr key={e.id} style={{ borderBottom:`1px solid ${C.border2}`,
            background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
            <td style={tdS}><span style={{ color:C.muted, fontSize:12 }}>{e.date}</span></td>
            <td style={tdS}><span style={{ color:C.text3, fontSize:12 }}>{e.matter_title||'—'}</span></td>
            <td style={{ ...tdS, maxWidth:220 }}>
              <span style={{ color:C.text2, fontSize:13 }}>{e.description}</span></td>
            <td style={tdS}><span style={{ color:C.text3, fontSize:12 }}>{e.attorney}</span></td>
            <td style={tdS}><span style={{ color:C.gold, fontWeight:600 }}>{e.hours}h</span></td>
            <td style={tdS}><span style={{ color:'#34d399', fontWeight:600 }}>
              ${e.amount?.toLocaleString()}</span></td>
            <td style={tdS}><Badge color={e.is_billed?'green':'gray'}>
              {e.is_billed?'Billed':'Unbilled'}</Badge></td>
          </tr>
        ))}
      </Table>
      {entries.length===0 && <Empty msg="No time entries recorded yet." />}
    </Card>
  )
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
function AIAssistant() {
  const [taskType, setTaskType] = useState('general')
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [contractForm, setContractForm] = useState({
    contract_type:'', parties:'', key_terms:'', special_instructions:'' })
  const [letterForm, setLetterForm] = useState({
    letter_type:'', addressee:'', subject:'', key_points:'', tone:'formal' })

  const TASKS = [
    { id:'general',         label:'Legal Q&A',          icon:'ai'        },
    { id:'case_analysis',   label:'Case Analysis',      icon:'scale'     },
    { id:'legal_opinion',   label:'Legal Opinion',      icon:'note'      },
    { id:'draft_contract',  label:'Draft Contract',     icon:'documents' },
    { id:'draft_letter',    label:'Draft Legal Letter', icon:'edit'      },
    { id:'draft_affidavit', label:'Draft Affidavit',    icon:'documents' },
    { id:'issue_spotting',  label:'Issue Spotting',     icon:'alert'     },
    { id:'summarize',       label:'Summarise Document', icon:'search'    },
    { id:'research',        label:'Legal Research',     icon:'research'  },
    { id:'timeline',        label:'Extract Timeline',   icon:'clock'     },
  ]

  const placeholders = {
    general:         'Describe your legal question or issue in detail…',
    case_analysis:   'Describe the facts, parties, legal issues, and what outcome you need…',
    legal_opinion:   'State the legal question(s) you need a written opinion on…',
    issue_spotting:  'Paste document text or describe the situation to analyse for legal issues…',
    summarize:       'Paste the document text to summarise…',
    research:        'What legal question needs researching under Zimbabwean / SADC law?',
    timeline:        'Paste case facts or documents to extract a chronological timeline from…',
    draft_affidavit: 'Describe the facts and purpose of the affidavit, including the deponents details…',
	}

  const generate = async () => {
    setLoading(true); setOutput('')
    try {
      if (taskType === 'draft_contract') {
        const { data } = await API.post('/ai/draft-contract', contractForm)
        setOutput(data.content)
        setHistory(h => [{ taskType, prompt:contractForm.contract_type, output:data.content }, ...h.slice(0,9)])
      } else if (taskType === 'draft_letter') {
        const { data } = await API.post('/ai/draft-letter', letterForm)
        setOutput(data.content)
        setHistory(h => [{ taskType, prompt:letterForm.subject, output:data.content }, ...h.slice(0,9)])
      } else {
        const { data } = await API.post('/ai/generate', { task_type:taskType, prompt, max_tokens:3000 })
        setOutput(data.content)
        setHistory(h => [{ taskType, prompt:prompt.slice(0,80), output:data.content }, ...h.slice(0,9)])
      }
    } catch(err) {
      toast.error('AI generation failed: '+(err.response?.data?.detail||err.message))
    } finally { setLoading(false) }
  }

  const canGenerate = loading ? false
    : taskType==='draft_contract' ? Boolean(contractForm.contract_type && contractForm.parties)
    : taskType==='draft_letter'   ? Boolean(letterForm.addressee && letterForm.subject)
    : Boolean(prompt.trim())

  return (
    <div style={{ display:'flex', gap:16, height:'calc(100vh - 140px)' }}>
      {/* Left panel */}
      <div style={{ width:228, display:'flex', flexDirection:'column', gap:12, flexShrink:0 }}>
        <Card>
          <div style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
            letterSpacing:'0.1em', marginBottom:12 }}>AI Tasks</div>
          {TASKS.map(t => (
            <button key={t.id} onClick={() => { setTaskType(t.id); setOutput('') }} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left',
              padding:'8px 10px', borderRadius:6, border:'none', cursor:'pointer',
              background: taskType===t.id ? 'rgba(201,168,76,0.12)' : 'transparent',
              color: taskType===t.id ? C.gold : C.text3,
              fontSize:12, marginBottom:2, fontFamily:'inherit',
            }}>
              <Icon name={t.icon||'ai'} size={13} />{t.label}
            </button>
          ))}
        </Card>
        {history.length > 0 && (
          <Card>
            <div style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
              letterSpacing:'0.1em', marginBottom:10 }}>Recent</div>
            {history.slice(0,5).map((h,i) => (
              <div key={i} onClick={() => setOutput(h.output)} style={{
                padding:'8px 0', borderBottom:`1px solid ${C.border}`, cursor:'pointer' }}>
                <div style={{ color:C.text3, fontSize:11, textTransform:'capitalize', marginBottom:2 }}>
                  {h.taskType?.replace(/_/g,' ')}</div>
                <div style={{ color:C.muted, fontSize:10, overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {h.prompt?.slice(0,44)}…</div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Main panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12, minWidth:0, overflow:'hidden' }}>
        <Card>
          <div style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
            letterSpacing:'0.1em', marginBottom:14 }}>
            {TASKS.find(t => t.id===taskType)?.label}
          </div>

          {/* Contract Draft Form */}
          {taskType==='draft_contract' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 }}>
              <FormField label="Contract Type">
                <input style={iS}
                  placeholder="e.g. Sale of Immovable Property Agreement, Employment Contract, Loan Agreement"
                  value={contractForm.contract_type}
                  onChange={e => setContractForm(f => ({ ...f, contract_type:e.target.value }))} />
              </FormField>
              <FormField label="Parties">
                <textarea rows={2} style={{ ...iS, resize:'none' }}
                  placeholder="Party 1: John Doe (ID: 12-123456 P15), Seller&#10;Party 2: ABC Holdings (Pvt) Ltd (Reg: 123/2020), Purchaser"
                  value={contractForm.parties}
                  onChange={e => setContractForm(f => ({ ...f, parties:e.target.value }))} />
              </FormField>
              <FormField label="Key Terms & Conditions">
                <textarea rows={4} style={{ ...iS, resize:'none' }}
                  placeholder="Purchase price: USD 250,000&#10;Transfer date: 60 days from signature&#10;Subject to: mortgage approval from CBZ Bank&#10;Deposit: 10% payable on signing"
                  value={contractForm.key_terms}
                  onChange={e => setContractForm(f => ({ ...f, key_terms:e.target.value }))} />
              </FormField>
              <FormField label="Special Instructions (optional)">
                <input style={iS}
                  placeholder="e.g. Must include REBUZ clause, dispute resolution via UNCITRAL arbitration in Harare"
                  value={contractForm.special_instructions}
                  onChange={e => setContractForm(f => ({ ...f, special_instructions:e.target.value }))} />
              </FormField>
            </div>
          )}

          {/* Letter Draft Form */}
          {taskType==='draft_letter' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 }}>
              <div style={{ display:'flex', gap:12 }}>
                <FormField label="Letter Type" style={{ flex:2 }}>
                  <select style={sS} value={letterForm.letter_type}
                    onChange={e => setLetterForm(f => ({ ...f, letter_type:e.target.value }))}>
                    <option value="">Select letter type…</option>
                    {['Demand Letter','Letter of Demand','Without Prejudice Letter',
                      'Open Letter','Notice to Cure Breach','Letter of Advice',
                      'Cease and Desist Notice','Notice of Intention to Sue',
                      'Settlement Offer Letter','Letter of Intent'].map(t =>
                      <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField label="Tone" style={{ flex:1 }}>
                  <select style={sS} value={letterForm.tone}
                    onChange={e => setLetterForm(f => ({ ...f, tone:e.target.value }))}>
                    {['formal','firm','urgent','conciliatory','neutral'].map(t =>
                      <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Addressee">
                <input style={iS}
                  placeholder="e.g. The Managing Director, Acme Holdings (Pvt) Ltd, Harare"
                  value={letterForm.addressee}
                  onChange={e => setLetterForm(f => ({ ...f, addressee:e.target.value }))} />
              </FormField>
              <FormField label="Subject Line">
                <input style={iS}
                  placeholder="e.g. RE: Breach of Contract — Supply Agreement dated 1 January 2025"
                  value={letterForm.subject}
                  onChange={e => setLetterForm(f => ({ ...f, subject:e.target.value }))} />
              </FormField>
              <FormField label="Key Points to Cover">
                <textarea rows={4} style={{ ...iS, resize:'none' }}
                  placeholder="1. Client is owed USD 85,000 under supply agreement dated 1 Jan 2025&#10;2. Goods were delivered on 15 Feb 2025, accepted without objection&#10;3. Payment was due 30 days after delivery — now 90 days overdue&#10;4. Demand full settlement within 7 days failing which legal action will follow"
                  value={letterForm.key_points}
                  onChange={e => setLetterForm(f => ({ ...f, key_points:e.target.value }))} />
              </FormField>
            </div>
          )}

          {/* Default prompt textarea */}
          {!['draft_contract','draft_letter'].includes(taskType) && (
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder={placeholders[taskType] || placeholders.general}
              rows={6}
              style={{ ...iS, resize:'none', marginBottom:14, boxSizing:'border-box' }} />
          )}

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn onClick={generate} disabled={!canGenerate} icon="ai">
              {loading ? 'Generating…' : 'Generate'}
            </Btn>
          </div>
        </Card>

        {/* Output */}
        {(output || loading) && (
          <Card style={{ flex:1, overflow:'auto', minHeight:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
                letterSpacing:'0.1em' }}>AI Output</span>
              {output && (
                <Btn size="sm" variant="secondary" icon="copy"
                  onClick={() => { navigator.clipboard.writeText(output); toast.success('Copied to clipboard') }}>
                  Copy
                </Btn>
              )}
            </div>
            {loading ? (
              <div style={{ display:'flex', gap:12, alignItems:'center', color:C.muted, fontSize:14 }}>
                <div style={{ width:18, height:18, border:`2px solid ${C.gold}`,
                  borderTopColor:'transparent', borderRadius:'50%',
                  animation:'spin 0.8s linear infinite' }} />
                Generating legal content via AI…
              </div>
            ) : (
              <div style={{ color:C.text2, fontSize:14, lineHeight:1.9, whiteSpace:'pre-wrap',
                fontFamily:'"Crimson Pro",Georgia,serif' }}>
                {output}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────
function Documents() {
  const [docs, setDocs] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [summarising, setSummarising] = useState(null)

  const load = useCallback(async () => {
    const { data } = await API.get('/documents', { params:{ search, limit:50 } })
    setDocs(data.items||[]); setTotal(data.total)
  }, [search])
  useEffect(() => { load() }, [load])

  const upload = async e => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file); fd.append('doc_category','general')
    try {
      await API.post('/documents/upload', fd, { headers:{ 'Content-Type':'multipart/form-data' } })
      toast.success('Document uploaded'); load()
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); e.target.value='' }
  }

  const doSummarise = async doc => {
    setSummarising(doc.id); setSummary(null)
    try {
      const { data } = await API.post(`/ai/summarize-document/${doc.id}`)
      setSummary({ doc, text:data.summary })
    } catch(err) { toast.error(err.response?.data?.detail||'Summarise failed — no text extracted') }
    finally { setSummarising(null) }
  }

  const catColor = c => ({ pleading:'red', affidavit:'yellow', contract:'gold',
    correspondence:'blue', court_order:'red', evidence:'yellow', general:'gray' }[c]||'gray')

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ color:C.text, fontSize:20, margin:0, fontFamily:'"Crimson Pro",Georgia,serif' }}>Documents</h2>
          <p style={{ color:C.muted, fontSize:12, margin:'4px 0 0' }}>{total} documents on file</p>
        </div>
        <label style={{ display:'inline-flex', alignItems:'center', gap:6,
          padding:'9px 18px', background:`linear-gradient(135deg,${C.gold},${C.goldL})`,
          borderRadius:8, color:'#0a0e1a', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          <Icon name="upload" size={14} />
          {uploading ? 'Uploading…' : 'Upload Document'}
          <input type="file" accept=".pdf,.docx,.txt,.doc"
            style={{ display:'none' }} onChange={upload} />
        </label>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search documents…" />
      <Card style={{ padding:0, marginTop:12 }}>
        <Table headers={['Filename','Type','Category','Size','Uploaded','AI','']}>
          {docs.map((d,i) => (
            <tr key={d.id} style={{ borderBottom:`1px solid ${C.border2}`,
              background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
              <td style={tdS}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Icon name="documents" size={14} />
                  <span style={{ color:C.text2, fontSize:13, maxWidth:200,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {d.original_filename}</span>
                </div>
                {d.has_text && <div style={{ color:'#34d399', fontSize:10 }}>✓ Text extracted</div>}
              </td>
              <td style={tdS}><Badge color="gray">{d.file_type?.toUpperCase()}</Badge></td>
              <td style={tdS}><Badge color={catColor(d.doc_category)}>{d.doc_category}</Badge></td>
              <td style={tdS}><span style={{ color:C.muted, fontSize:12 }}>
                {d.file_size ? `${Math.round(d.file_size/1024)} KB` : '—'}</span></td>
              <td style={tdS}><span style={{ color:C.muted, fontSize:12 }}>{d.upload_date?.slice(0,10)}</span></td>
              <td style={tdS}>
                {d.has_text && (
                  <Btn size="sm" variant="secondary" icon="ai"
                    disabled={summarising===d.id}
                    onClick={() => doSummarise(d)}>
                    {summarising===d.id ? '…' : 'Summarise'}
                  </Btn>
                )}
              </td>
              <td style={tdS}>
                <Btn size="sm" variant="secondary" icon="download"
                  onClick={() => window.open(`/api/documents/${d.id}/download`)}>Get</Btn>
              </td>
            </tr>
          ))}
        </Table>
        {docs.length===0 && <Empty msg="No documents yet. Upload your first document." />}
      </Card>

      {summary && (
        <Modal title={`AI Summary — ${summary.doc.original_filename}`}
          onClose={() => setSummary(null)} width={700}>
          <div style={{ color:C.text2, fontSize:14, lineHeight:1.9,
            whiteSpace:'pre-wrap', fontFamily:'"Crimson Pro",Georgia,serif',
            maxHeight:480, overflowY:'auto' }}>
            {summary.text}
          </div>
          <div style={{ marginTop:18, display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn size="sm" variant="secondary" icon="copy"
              onClick={() => { navigator.clipboard.writeText(summary.text); toast.success('Copied') }}>
              Copy Summary
            </Btn>
            <Btn size="sm" variant="secondary" onClick={() => setSummary(null)}>Close</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
// ─── CALENDAR ────────────────────────────────────────────────────────────────
function Calendar() {
  const [hearings, setHearings] = useState([])
  useEffect(() => {
    const from = todayStr()
    const to = new Date(Date.now()+60*86400000).toISOString().slice(0,10)
    API.get('/calendar/hearings', { params:{ from_date:from, to_date:to } })
      .then(r => setHearings(r.data||[])).catch(() => {})
  }, [])

  const grouped = hearings.reduce((acc,h) => {
    acc[h.date] = acc[h.date]||[]; acc[h.date].push(h); return acc
  }, {})

  return (
    <div>
      <h2 style={{ color:C.text, fontSize:20, marginBottom:20,
        fontFamily:'"Crimson Pro",Georgia,serif' }}>
        Hearings & Deadlines — Next 60 Days</h2>
      {Object.keys(grouped).length===0
        ? <Card><p style={{ color:C.muted, fontSize:14 }}>No hearings or deadlines scheduled.</p></Card>
        : Object.keys(grouped).sort().map(dateStr => (
        <div key={dateStr} style={{ marginBottom:18 }}>
          <div style={{ color:C.gold, fontSize:12, fontWeight:600,
            textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
            {new Date(dateStr+'T12:00:00').toLocaleDateString('en-ZW',
              { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
          {grouped[dateStr].map(h => (
            <Card key={h.id} style={{ marginBottom:8, padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:8, background:'#1e2d4a',
                  display:'flex', alignItems:'center', justifyContent:'center', color:'#3b82f6', flexShrink:0 }}>
                  <Icon name="clock" size={18} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text2, fontSize:14, fontWeight:500 }}>{h.title}</div>
                  <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>
                    {h.court_name||h.location||'Location TBC'}
                    {h.time ? ` · ${h.time}` : ''}
                    {h.judge_name ? ` · ${h.judge_name}` : ''}
                  </div>
                </div>
                <Badge color={h.hearing_type==='filing_deadline'?'red':'blue'}>
                  {h.hearing_type?.replace('_',' ')}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
function Tasks() {
  const [tasks, setTasks] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ priority:'medium' })

  const load = useCallback(() => {
    API.get('/tasks', { params:{ status:statusFilter, limit:100 } })
      .then(r => setTasks(r.data||[])).catch(() => {})
  }, [statusFilter])
  useEffect(() => { load() }, [load])

  const complete = async id => {
    await API.put(`/tasks/${id}/complete`)
    toast.success('Task completed'); load()
  }

  const save = async e => {
    e.preventDefault()
    await API.post('/tasks', form)
    toast.success('Task created')
    setShowForm(false); setForm({ priority:'medium' }); load()
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ display:'flex', gap:4 }}>
          {['pending','in_progress','completed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer',
              background:statusFilter===s?'rgba(201,168,76,0.15)':'transparent',
              color:statusFilter===s?C.gold:C.muted, fontSize:12,
              fontWeight:600, fontFamily:'inherit',
            }}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</button>
          ))}
        </div>
        <Btn size="sm" icon="plus" onClick={() => setShowForm(true)}>New Task</Btn>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {tasks.map(t => (
          <Card key={t.id} style={{ padding:'14px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {t.status !== 'completed'
                ? <button onClick={() => complete(t.id)} title="Mark complete" style={{
                    width:22, height:22, borderRadius:'50%', border:`2px solid ${C.border}`,
                    background:'transparent', cursor:'pointer', flexShrink:0 }} />
                : <div style={{ width:22, height:22, borderRadius:'50%', background:'#34d399',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon name="check" size={12} />
                  </div>
              }
              <div style={{ flex:1 }}>
                <div style={{ color:t.status==='completed'?C.muted:C.text2, fontSize:13,
                  fontWeight:500, textDecoration:t.status==='completed'?'line-through':'none' }}>
                  {t.title}</div>
                {t.description && (
                  <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{t.description}</div>
                )}
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Badge color={statusColor(t.priority)}>{t.priority}</Badge>
                {t.due_date && (
                  <span style={{ color:new Date(t.due_date)<new Date()?'#f87171':C.muted, fontSize:11 }}>
                    Due {t.due_date}</span>
                )}
                {t.assignee && <span style={{ color:C.muted, fontSize:11 }}>{t.assignee}</span>}
              </div>
            </div>
          </Card>
        ))}
        {tasks.length===0 && <Empty msg="No tasks found." />}
      </div>

      {showForm && (
        <Modal title="New Task" onClose={() => setShowForm(false)}>
          <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <FormField label="Title">
              <input style={iS} required value={form.title||''}
                onChange={e => setForm(f => ({ ...f, title:e.target.value }))} />
            </FormField>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Priority" style={{ flex:1 }}>
                <select style={sS} value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority:e.target.value }))}>
                  {['low','medium','high','urgent'].map(p =>
                    <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </FormField>
              <FormField label="Due Date" style={{ flex:1 }}>
                <input type="date" style={iS} value={form.due_date||''}
                  onChange={e => setForm(f => ({ ...f, due_date:e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Description">
              <textarea rows={3} style={{ ...iS, resize:'vertical' }}
                value={form.description||''}
                onChange={e => setForm(f => ({ ...f, description:e.target.value }))} />
            </FormField>
            <ModalFooter onCancel={() => setShowForm(false)} label="Create Task" />
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── RESEARCH ────────────────────────────────────────────────────────────────
function Research() {
  const [query, setQuery] = useState('')
  const [jurisdiction, setJurisdiction] = useState('Zimbabwe')
  const [researchType, setResearchType] = useState('general')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    API.get('/research/sessions').then(r => setSessions(r.data||[])).catch(() => {})
  }, [])

  const search = async () => {
    if (!query.trim()) return
    setLoading(true); setResult('')
    try {
      const { data } = await API.post('/research/search',
        { query, jurisdiction, research_type:researchType })
      setResult(data.results)
      setSessions(s => [{ query, research_type:researchType, jurisdiction }, ...s.slice(0,9)])
    } catch(err) {
      toast.error('Research failed: '+(err.response?.data?.detail||err.message))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display:'flex', gap:16 }}>
      <div style={{ width:240, display:'flex', flexDirection:'column', gap:12, flexShrink:0 }}>
        <Card>
          <div style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
            letterSpacing:'0.1em', marginBottom:14 }}>Parameters</div>
          <FormField label="Jurisdiction" style={{ marginBottom:14 }}>
            <select style={sS} value={jurisdiction} onChange={e => setJurisdiction(e.target.value)}>
              {['Zimbabwe','South Africa','Zambia','Botswana','Mozambique','SADC','General'].map(j =>
                <option key={j} value={j}>{j}</option>)}
            </select>
          </FormField>
          <FormField label="Research Type">
            <select style={sS} value={researchType} onChange={e => setResearchType(e.target.value)}>
              {['general','statute','case_law','constitutional','regulatory'].map(t =>
                <option key={t} value={t}>
                  {t.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
                </option>)}
            </select>
          </FormField>
        </Card>
        {sessions.length > 0 && (
          <Card>
            <div style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
              letterSpacing:'0.1em', marginBottom:10 }}>Recent Research</div>
            {sessions.slice(0,6).map((s,i) => (
              <div key={i} onClick={() => setQuery(s.query)} style={{
                padding:'7px 0', borderBottom:`1px solid ${C.border}`,
                cursor:'pointer', color:C.muted, fontSize:11,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {s.query?.slice(0,44)}…
              </div>
            ))}
          </Card>
        )}
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
        <Card>
          <div style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
            letterSpacing:'0.1em', marginBottom:12 }}>Legal Research Query</div>
          <textarea value={query} onChange={e => setQuery(e.target.value)}
            placeholder="e.g. What are the requirements for valid service of process under the High Court Rules 2021?"
            rows={4} style={{ ...iS, resize:'none', marginBottom:14, boxSizing:'border-box' }} />
          <Btn onClick={search} disabled={loading||!query.trim()} icon="research">
            {loading ? 'Researching…' : 'Research'}
          </Btn>
        </Card>
        {(result||loading) && (
          <Card style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
                letterSpacing:'0.1em' }}>Research Results</span>
              {result && (
                <Btn size="sm" variant="secondary" icon="copy"
                  onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied') }}>
                  Copy
                </Btn>
              )}
            </div>
            {loading
              ? <div style={{ color:C.muted, fontSize:14 }}>
                  Researching {researchType} law in {jurisdiction}…</div>
              : <div style={{ color:C.text2, fontSize:14, lineHeight:1.9,
                  whiteSpace:'pre-wrap', fontFamily:'"Crimson Pro",Georgia,serif' }}>
                  {result}
                </div>
            }
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── TRUST ────────────────────────────────────────────────────────────────────
function Trust() {
  const [accounts, setAccounts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [txnSummary, setTxnSummary] = useState(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [form, setForm] = useState({
    transaction_type:'receipt', amount:'',
    date:todayStr(), description:'', reference:'', payment_method:'transfer'
  })

  const load = () => {
    API.get('/billing/trust').then(r => setAccounts(r.data||[])).catch(() => {})
  }

  const loadLedger = (accountId, startDate='', endDate='') => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    params.append('limit', 100)

    API.get(`/billing/trust/${accountId}/transactions`, { params })
      .then(r => {
        setTransactions(r.data.transactions || [])
        setTxnSummary(r.data.summary || {})
      })
      .catch(() => { toast.error('Failed to load transactions') })
  }

  useEffect(() => {
    load()
    API.get('/clients', { params:{ limit:200 } }).then(r => setClients(r.data.items||[])).catch(() => {})
  }, [])

  const save = async e => {
    e.preventDefault()
    try {
      await API.post('/billing/trust/transaction', form)
      toast.success('Transaction recorded')
      setShowForm(false)
      setForm({ transaction_type:'receipt', amount:'', date:todayStr(),
        description:'', reference:'', payment_method:'transfer' })
      load()
      if (selectedAccountId) loadLedger(selectedAccountId, dateRange.start, dateRange.end)
    } catch(err) { toast.error(err.response?.data?.detail||'Error') }
  }

  const exportCSV = () => {
    if (!transactions.length) return
    const headers = ['Date', 'Type', 'Description', 'Debit', 'Credit', 'Running Balance', 'Reference', 'GL Reference']
    const rows = transactions.map(t => [
      t.date,
      t.type,
      t.description,
      t.debit || '',
      t.credit || '',
      t.running_balance,
      t.reference || '',
      t.gl_reference || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trust-ledger-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const total = accounts.reduce((s,a) => s+(a.balance||0), 0)

  if (selectedAccountId) {
    const account = accounts.find(a => a.id === selectedAccountId)
    return (
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h2 style={{ color:C.text, fontSize:20, margin:0,
              fontFamily:'"Crimson Pro",Georgia,serif' }}>{account?.client_name} — Trust Ledger</h2>
            <p style={{ color:C.muted, fontSize:12, margin:'4px 0 0' }}>
              Balance: <strong style={{ color:'#34d399' }}>${(account?.balance||0).toLocaleString()}</strong>
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn onClick={exportCSV} icon="download">Export CSV</Btn>
            <Btn onClick={() => setSelectedAccountId(null)} icon="x">Back</Btn>
          </div>
        </div>

        <Card style={{ marginBottom:20 }}>
          <div style={{ display:'flex', gap:20, alignItems:'flex-end' }}>
            <FormField label="From" style={{ flex:1 }}>
              <input type="date" style={iS} value={dateRange.start}
                onChange={e => {
                  setDateRange(d => ({ ...d, start:e.target.value }))
                  loadLedger(selectedAccountId, e.target.value, dateRange.end)
                }} />
            </FormField>
            <FormField label="To" style={{ flex:1 }}>
              <input type="date" style={iS} value={dateRange.end}
                onChange={e => {
                  setDateRange(d => ({ ...d, end:e.target.value }))
                  loadLedger(selectedAccountId, dateRange.start, e.target.value)
                }} />
            </FormField>
            <Btn onClick={() => {
              setDateRange({ start:'', end:'' })
              loadLedger(selectedAccountId, '', '')
            }}>Clear Filters</Btn>
          </div>
        </Card>

        {transactions.length === 0
          ? <Card><p style={{ color:C.muted }}>No transactions in this period.</p></Card>
          : <Card>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                    <th style={{ padding:12, textAlign:'left', fontWeight:600, color:C.muted }}>Date</th>
                    <th style={{ padding:12, textAlign:'left', fontWeight:600, color:C.muted }}>Description</th>
                    <th style={{ padding:12, textAlign:'right', fontWeight:600, color:C.muted }}>Debit</th>
                    <th style={{ padding:12, textAlign:'right', fontWeight:600, color:C.muted }}>Credit</th>
                    <th style={{ padding:12, textAlign:'right', fontWeight:600, color:C.muted }}>Balance</th>
                    <th style={{ padding:12, textAlign:'left', fontWeight:600, color:C.muted }}>GL Reference</th>
                    <th style={{ padding:12, textAlign:'left', fontWeight:600, color:C.muted }}>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:12, color:C.text2 }}>{t.date}</td>
                      <td style={{ padding:12, color:C.text2 }}>
                        {t.description}
                        {t.reference && <div style={{ fontSize:11, color:C.muted }}>{t.reference}</div>}
                      </td>
                      <td style={{ padding:12, textAlign:'right', color:t.debit ? '#34d399' : C.muted }}>
                        {t.debit ? `$${t.debit.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding:12, textAlign:'right', color:t.credit ? '#f87171' : C.muted }}>
                        {t.credit ? `$${t.credit.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding:12, textAlign:'right', fontWeight:600, color:C.text2 }}>
                        ${t.running_balance.toFixed(2)}
                      </td>
                      <td style={{ padding:12, color:C.muted, fontSize:11 }}>
                        {t.gl_reference || '—'}
                      </td>
                      <td style={{ padding:12, color:C.muted, fontSize:11 }}>
                        {t.payment_method || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop:20, paddingTop:20, borderTop:`1px solid ${C.border}`,
                display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:20 }}>
                <div>
                  <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase' }}>Total Receipts</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#34d399', fontFamily:'"Crimson Pro",Georgia,serif' }}>
                    ${(txnSummary?.total_receipts||0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase' }}>Total Disbursements</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#f87171', fontFamily:'"Crimson Pro",Georgia,serif' }}>
                    ${(txnSummary?.total_disbursements||0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase' }}>Net Balance</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#60a5fa', fontFamily:'"Crimson Pro",Georgia,serif' }}>
                    ${(txnSummary?.net_balance||0).toFixed(2)}
                  </div>
                </div>
              </div>
            </Card>
        }

        {showForm && (
          <Modal title="Record Trust Transaction" onClose={() => setShowForm(false)}>
            <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <FormField label="Client">
                <select style={sS} required value={form.client_id||''}
                  onChange={e => setForm(f => ({ ...f, client_id:parseInt(e.target.value) }))}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                </select>
              </FormField>
              <div style={{ display:'flex', gap:12 }}>
                <FormField label="Type" style={{ flex:1 }}>
                  <select style={sS} value={form.transaction_type}
                    onChange={e => setForm(f => ({ ...f, transaction_type:e.target.value }))}>
                    {['receipt','disbursement','refund'].map(t =>
                      <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </FormField>
                <FormField label="Amount (USD)" style={{ flex:1 }}>
                  <input type="number" step="0.01" style={iS} required value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} />
                </FormField>
                <FormField label="Date" style={{ flex:1 }}>
                  <input type="date" style={iS} required value={form.date}
                    onChange={e => setForm(f => ({ ...f, date:e.target.value }))} />
                </FormField>
              </div>
              <FormField label="Description">
                <input style={iS} required value={form.description}
                  onChange={e => setForm(f => ({ ...f, description:e.target.value }))}
                  placeholder="e.g. Receipt of retainer per client letter dated 29 May 2026" />
              </FormField>
              <div style={{ display:'flex', gap:12 }}>
                <FormField label="Payment Method" style={{ flex:1 }}>
                  <select style={sS} value={form.payment_method}
                    onChange={e => setForm(f => ({ ...f, payment_method:e.target.value }))}>
                    {['transfer','cash','cheque','mobile_money','card'].map(m =>
                      <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                  </select>
                </FormField>
                <FormField label="Bank Reference" style={{ flex:1 }}>
                  <input style={iS} value={form.reference}
                    onChange={e => setForm(f => ({ ...f, reference:e.target.value }))} />
                </FormField>
              </div>
              <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)',
                borderRadius:8, padding:'10px 14px', fontSize:12, color:'#34d399' }}>
                ⚠ Trust account transactions are subject to Law Society regulations.
                Ensure proper authority before disbursing.
              </div>
              <ModalFooter onCancel={() => setShowForm(false)} label="Record Transaction" />
            </form>
          </Modal>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ color:C.text, fontSize:20, margin:0,
            fontFamily:'"Crimson Pro",Georgia,serif' }}>Trust Accounts</h2>
          <p style={{ color:C.muted, fontSize:12, margin:'4px 0 0' }}>
            Total held in trust: <strong style={{ color:'#34d399' }}>${total.toLocaleString()}</strong>
          </p>
        </div>
        <Btn icon="plus" onClick={() => setShowForm(true)}>Record Transaction</Btn>
      </div>

      {accounts.length===0
        ? <Card><p style={{ color:C.muted }}>No trust accounts yet. Record a trust receipt to open one.</p></Card>
        : <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            {accounts.map(a => (
              <Card key={a.id} style={{ width:240, cursor:'pointer' }}
                onClick={() => {
                  setSelectedAccountId(a.id)
                  setDateRange({ start:'', end:'' })
                  loadLedger(a.id, '', '')
                }}>
                <div style={{ color:C.muted, fontSize:11, textTransform:'uppercase',
                  letterSpacing:'0.08em', marginBottom:8 }}>Client Trust Account</div>
                <div style={{ color:C.text2, fontSize:15, fontWeight:600, marginBottom:6 }}>
                  {a.client_name}</div>
                <div style={{ color:'#34d399', fontSize:26, fontWeight:700,
                  fontFamily:'"Crimson Pro",Georgia,serif' }}>
                  ${(a.balance||0).toLocaleString()}</div>
                <div style={{ color:C.muted, fontSize:11, marginTop:6 }}>
                  {a.currency} · Opened {a.opened_date}</div>
              </Card>
            ))}
          </div>
      }

      {showForm && (
        <Modal title="Record Trust Transaction" onClose={() => setShowForm(false)}>
          <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <FormField label="Client">
              <select style={sS} required value={form.client_id||''}
                onChange={e => setForm(f => ({ ...f, client_id:parseInt(e.target.value) }))}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select>
            </FormField>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Type" style={{ flex:1 }}>
                <select style={sS} value={form.transaction_type}
                  onChange={e => setForm(f => ({ ...f, transaction_type:e.target.value }))}>
                  {['receipt','disbursement','refund'].map(t =>
                    <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </FormField>
              <FormField label="Amount (USD)" style={{ flex:1 }}>
                <input type="number" step="0.01" style={iS} required value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} />
              </FormField>
              <FormField label="Date" style={{ flex:1 }}>
                <input type="date" style={iS} required value={form.date}
                  onChange={e => setForm(f => ({ ...f, date:e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Description">
              <input style={iS} required value={form.description}
                onChange={e => setForm(f => ({ ...f, description:e.target.value }))}
                placeholder="e.g. Receipt of retainer per client letter dated 29 May 2026" />
            </FormField>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Payment Method" style={{ flex:1 }}>
                <select style={sS} value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method:e.target.value }))}>
                  {['transfer','cash','cheque','mobile_money','card'].map(m =>
                    <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                </select>
              </FormField>
              <FormField label="Bank Reference" style={{ flex:1 }}>
                <input style={iS} value={form.reference}
                  onChange={e => setForm(f => ({ ...f, reference:e.target.value }))} />
              </FormField>
            </div>
            <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)',
              borderRadius:8, padding:'10px 14px', fontSize:12, color:'#34d399' }}>
              ⚠ Trust account transactions are subject to Law Society regulations.
              Ensure proper authority before disbursing.
            </div>
            <ModalFooter onCancel={() => setShowForm(false)} label="Record Transaction" />
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── AUDIT LOG ──────────────────────────────────────────────────────────────
function AuditLog() {
  const { user: currentUser } = useApp()
  const [activities, setActivities] = useState([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    resource_type: '',
    start_date: '',
    end_date: '',
  })
  const [actionOptions, setActionOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const [isExporting, setIsExporting] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    params.append('skip', skip)
    params.append('limit', 50)
    if (filters.user_id) params.append('user_id', filters.user_id)
    if (filters.action) params.append('action', filters.action)
    if (filters.resource_type) params.append('resource_type', filters.resource_type)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)

    try {
      const { data } = await API.get('/admin/activity-log', { params })
      setActivities(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      toast.error('Failed to load audit log')
    }
  }, [skip, filters])

  const loadActionOptions = useCallback(async () => {
    try {
      const { data } = await API.get('/admin/activity-log/actions')
      setActionOptions(data.actions || [])
    } catch (err) {
      logger.warn('Failed to load action options')
    }
  }, [])

  const loadUserOptions = useCallback(async () => {
    try {
      const { data } = await API.get('/admin/users')
      setUserOptions(data || [])
    } catch (err) {
      logger.warn('Failed to load user options')
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadActionOptions() }, [loadActionOptions])
  useEffect(() => { loadUserOptions() }, [loadUserOptions])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.action) params.append('action', filters.action)
      if (filters.resource_type) params.append('resource_type', filters.resource_type)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)

      const response = await API.get('/admin/activity-log/export', { params })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Audit log exported')
    } catch (err) {
      toast.error('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleClearFilters = () => {
    setFilters({
      user_id: '',
      action: '',
      resource_type: '',
      start_date: '',
      end_date: '',
    })
    setSkip(0)
  }

  const tdS = { padding:'10px 14px', color:C.text2, fontSize:13 }
  const limit = 50

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ color:C.text, fontSize:20, margin:0, marginBottom:16,
          fontFamily:'"Crimson Pro",Georgia,serif' }}>Audit Log</h2>
        <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap',
          alignItems:'flex-end' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <label style={{ color:C.text3, fontSize:12, display:'block', marginBottom:6 }}>User</label>
            <select style={{ ...iS, width:'100%' }} value={filters.user_id}
              onChange={e => { setFilters(f => ({ ...f, user_id: e.target.value })); setSkip(0) }}>
              <option value="">All users</option>
              {userOptions.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
            </select>
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <label style={{ color:C.text3, fontSize:12, display:'block', marginBottom:6 }}>Action</label>
            <select style={{ ...iS, width:'100%' }} value={filters.action}
              onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setSkip(0) }}>
              <option value="">All actions</option>
              {actionOptions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ flex:1, minWidth:150 }}>
            <label style={{ color:C.text3, fontSize:12, display:'block', marginBottom:6 }}>From Date</label>
            <input type="date" style={{ ...iS, width:'100%' }} value={filters.start_date}
              onChange={e => { setFilters(f => ({ ...f, start_date: e.target.value })); setSkip(0) }} />
          </div>
          <div style={{ flex:1, minWidth:150 }}>
            <label style={{ color:C.text3, fontSize:12, display:'block', marginBottom:6 }}>To Date</label>
            <input type="date" style={{ ...iS, width:'100%' }} value={filters.end_date}
              onChange={e => { setFilters(f => ({ ...f, end_date: e.target.value })); setSkip(0) }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn onClick={handleClearFilters}>Clear Filters</Btn>
          <Btn icon="download" onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Btn>
        </div>
      </div>

      <Card style={{ padding:0 }}>
        <Table headers={['Timestamp', 'User', 'Action', 'Description', 'Resource']}>
          {activities.map((a, i) => (
            <tr key={a.id} style={{ borderBottom:`1px solid ${C.border2}` }}>
              <td style={tdS}>
                <span style={{ color:C.muted, fontSize:12 }}>
                  {new Date(a.timestamp).toLocaleDateString()} {new Date(a.timestamp).toLocaleTimeString()}
                </span>
              </td>
              <td style={tdS}>{a.user?.full_name || a.user?.username}</td>
              <td style={tdS}>
                <Badge color="blue">{a.action}</Badge>
              </td>
              <td style={tdS}>
                <span style={{ color:C.text2 }}>{a.description || '-'}</span>
              </td>
              <td style={tdS}>
                {a.resource_type ? <Badge color="gold">{a.resource_type}</Badge> : '-'}
              </td>
            </tr>
          ))}
        </Table>
        {activities.length === 0 && <Empty msg="No activities found." />}
      </Card>

      {activities.length > 0 && (
        <div style={{ marginTop:16, display:'flex', alignItems:'center', justifyContent:'space-between',
          color:C.muted, fontSize:13 }}>
          <span>Showing {skip + 1}-{Math.min(skip + limit, total)} of {total.toLocaleString()}</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setSkip(Math.max(0, skip - limit))} disabled={skip === 0}
              style={{ ...Btn.style, opacity: skip === 0 ? 0.5 : 1, cursor: skip === 0 ? 'default' : 'pointer' }}>
              Previous
            </button>
            <button onClick={() => setSkip(skip + limit)} disabled={skip + limit >= total}
              style={{ ...Btn.style, opacity: skip + limit >= total ? 0.5 : 1, cursor: skip + limit >= total ? 'default' : 'pointer' }}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────
function Users() {
  const { user: currentUser } = useApp()
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username:'', email:'', password:'',
    full_name:'', title:'', user_role:'attorney' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const load = () => {
    API.get('/admin/users').then(r => setUsers(r.data||[])).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const save = async e => {
    e.preventDefault(); setLoading(true)
    try {
      await API.post('/auth/register', form)
      toast.success(`User ${form.username} created`)
      setShowForm(false)
      setForm({ username:'', email:'', password:'', full_name:'', title:'', user_role:'attorney' })
      load()
    } catch(err) { toast.error(err.response?.data?.detail||'Error creating user') }
    finally { setLoading(false) }
  }

  const roleColor = r => ({ admin:'gold', attorney:'blue', paralegal:'green',
    billing:'purple', receptionist:'gray', readonly:'gray' }[r]||'gray')

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ color:C.text, fontSize:20, margin:0,
            fontFamily:'"Crimson Pro",Georgia,serif' }}>Users</h2>
          <p style={{ color:C.muted, fontSize:12, margin:'4px 0 0' }}>
            {users.length} system users</p>
        </div>
        {currentUser?.is_admin && (
          <Btn icon="plus" onClick={() => setShowForm(true)}>Add User</Btn>
        )}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {users.map(u => (
          <Card key={u.id} style={{ padding:'16px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:46, height:46, borderRadius:'50%',
                background:'linear-gradient(135deg,#1e3a5f,#2d5a8e)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#8bb4d8', fontSize:17, fontWeight:700, flexShrink:0 }}>
                {u.full_name?.[0]?.toUpperCase() || u.username?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ color:C.text, fontSize:15, fontWeight:600 }}>{u.full_name}</span>
                  {u.title && <span style={{ color:C.muted, fontSize:12 }}>{u.title}</span>}
                  {u.is_admin && <Badge color="gold">Admin</Badge>}
                  <Badge color={roleColor(u.user_role)}>{u.user_role}</Badge>
                  <Badge color={u.is_active?'green':'red'}>
                    {u.is_active?'Active':'Inactive'}</Badge>
                </div>
                <div style={{ color:C.text3, fontSize:12 }}>
                  @{u.username} · {u.email}</div>
                {u.last_activity && (
                  <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>
                    Last active: {fmtDate(u.last_activity)}</div>
                )}
              </div>
              {currentUser?.is_admin && u.id !== currentUser?.id && (
                <Btn size="sm" variant="secondary" icon="edit"
                  onClick={() => toast.info('Full user editing available in the Security phase')}>
                  Edit
                </Btn>
              )}
            </div>
          </Card>
        ))}
        {users.length===0 && <Empty msg="No users found." />}
      </div>

      {showForm && (
        <Modal title="Add New User" onClose={() => setShowForm(false)} width={560}>
          <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Full Name" style={{ flex:1 }}>
                <input style={iS} required value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name:e.target.value }))} />
              </FormField>
              <FormField label="Professional Title" style={{ flex:1 }}>
                <select style={sS} value={form.title}
                  onChange={e => setForm(f => ({ ...f, title:e.target.value }))}>
                  <option value="">None</option>
                  {['Attorney','Advocate','Paralegal','Conveyancer','Notary',
                    'Senior Associate','Partner','Director','Billing Officer','Receptionist']
                    .map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <FormField label="Username" style={{ flex:1 }}>
                <input style={iS} required value={form.username}
                  onChange={e => setForm(f => ({
                    ...f, username:e.target.value.toLowerCase().replace(/\s/g,'') }))} />
              </FormField>
              <FormField label="System Role" style={{ flex:1 }}>
                <select style={sS} value={form.user_role}
                  onChange={e => setForm(f => ({ ...f, user_role:e.target.value }))}>
                  {['attorney','paralegal','billing','receptionist','readonly'].map(r =>
                    <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Email Address">
              <input type="email" style={iS} required value={form.email}
                onChange={e => setForm(f => ({ ...f, email:e.target.value }))} />
            </FormField>
            <FormField label="Password">
              <div style={{ position:'relative' }}>
                <input style={{ ...iS, paddingRight:44 }}
                  type={showPw?'text':'password'} required minLength={8} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password:e.target.value }))}
                  placeholder="Minimum 8 characters" />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:C.muted, cursor:'pointer', display:'flex' }}>
                  <Icon name="eye" size={16} />
                </button>
              </div>
            </FormField>
            <div style={{ background:'rgba(201,168,76,0.08)',
              border:`1px solid rgba(201,168,76,0.2)`, borderRadius:8,
              padding:'10px 14px', fontSize:12, color:C.text3 }}>
              The user will sign in with their username and this initial password.
              They should change it after first login.
            </div>
            <ModalFooter onCancel={() => setShowForm(false)} loading={loading} label="Create User" />
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── SECURITY SETTINGS ────────────────────────────────────────────────────────
function SecuritySettings() {
  const { user } = useApp()
  const [mfaSetup, setMFASetup] = useState(null)
  const [mfaCode, setMFACode] = useState('')
  const [showMFAModal, setShowMFAModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSetupMFA = async () => {
    setLoading(true)
    try {
      const { data } = await API.post('/auth/mfa/setup')
      setMFASetup(data)
      setShowMFAModal(true)
      setMFACode('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to setup MFA')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyMFA = async () => {
    if (mfaCode.length !== 6 || !/^\d+$/.test(mfaCode)) {
      toast.error('Enter a 6-digit code')
      return
    }
    setLoading(true)
    try {
      await API.post('/auth/mfa/verify-setup', { totp_code: mfaCode })
      toast.success('MFA enabled successfully!')
      setShowMFAModal(false)
      setMFASetup(null)
      setMFACode('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('Copied!')
  }

  return (
    <>
      <Card>
        <SectionTitle>Multi-Factor Authentication</SectionTitle>
        <p style={{ color: C.text3, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          Protect your account with MFA. You'll need a code from your authenticator app when signing in.
        </p>
        <Btn onClick={handleSetupMFA} disabled={loading}>
          {loading ? 'Setting up...' : 'Enable MFA'}
        </Btn>
      </Card>

      {showMFAModal && (
        <Modal title="Enable Two-Factor Authentication" onClose={() => setShowMFAModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h4 style={{ color: C.text2, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                Step 1: Scan QR Code
              </h4>
              <p style={{ color: C.text3, fontSize: 12, marginBottom: 12 }}>
                Use Google Authenticator, Authy, or Microsoft Authenticator to scan:
              </p>
              {mfaSetup?.qr_code && (
                <img src={mfaSetup.qr_code} alt="QR" style={{ maxWidth: 200 }} />
              )}
            </div>

            <div>
              <h4 style={{ color: C.text2, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                Step 2: Enter Code
              </h4>
              <input
                type="text"
                placeholder="000000"
                value={mfaCode}
                onChange={e => setMFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
                style={{ ...iS, width: '100px', textAlign: 'center', fontSize: 20, letterSpacing: '4px' }}
                autoFocus
              />
            </div>

            <div>
              <h4 style={{ color: C.text2, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                Step 3: Save Backup Codes
              </h4>
              <p style={{ color: C.text3, fontSize: 12, marginBottom: 10 }}>
                Store these codes safely. Use if you lose your device:
              </p>
              <div style={{ background: C.bg, padding: 10, borderRadius: 6, border: `1px solid ${C.border}`, maxHeight: 150, overflowY: 'auto' }}>
                {mfaSetup?.backup_codes?.map((code, i) => (
                  <div
                    key={i}
                    onClick={() => handleCopyCode(code)}
                    style={{
                      fontSize: 11,
                      fontFamily: 'monospace',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      color: C.gold,
                      marginBottom: i < mfaSetup.backup_codes.length - 1 ? 4 : 0,
                      borderRadius: 3,
                      background: C.surface,
                      border: `1px solid ${C.border2}`,
                    }}
                  >
                    {code} <span style={{ color: C.text3, fontSize: 10 }}>← click to copy</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={handleVerifyMFA} disabled={loading || mfaCode.length !== 6} style={{ flex: 1 }}>
                {loading ? 'Enabling...' : 'Enable MFA'}
              </Btn>
              <Btn onClick={() => setShowMFAModal(false)} variant="secondary" style={{ flex: 1 }}>
                Close
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings() {
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('firm')
  const [aiStatus, setAiStatus] = useState(null)

  useEffect(() => {
    API.get('/settings').then(r => setSettings(r.data||{})).catch(() => {})
    API.get('/ai/status').then(r => setAiStatus(r.data)).catch(() => {})
  }, [])

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await API.put('/settings', settings)
      toast.success('Settings saved')
    } catch { toast.error('Error saving settings') }
    finally { setSaving(false) }
  }

  const firmFields = [
    { key:'firm_name',      label:'Firm Name',           required:true },
    { key:'firm_address',   label:'Physical Address',    multiline:true },
    { key:'firm_phone',     label:'Phone Number' },
    { key:'firm_email',     label:'Firm Email Address' },
    { key:'firm_website',   label:'Website (optional)' },
    { key:'vat_number',     label:'VAT Registration Number' },
    { key:'law_society_no', label:'Law Society Number' },
  ]
  const finFields = [
    { key:'default_hourly_rate', label:'Default Hourly Rate (USD)', type:'number' },
    { key:'vat_rate',            label:'VAT Rate (e.g. 0.15 = 15%)', type:'number' },
    { key:'invoice_prefix',      label:'Invoice Prefix (e.g. INV)' },
    { key:'default_currency',    label:'Default Currency (USD/ZWL)' },
  ]
  const bankFields = [
    { key:'trust_bank_name',          label:'Trust Account Bank Name' },
    { key:'trust_account_number',     label:'Trust Account Number' },
    { key:'operating_bank_name',      label:'Operating Account Bank Name' },
    { key:'operating_account_number', label:'Operating Account Number' },
  ]

  return (
    <div style={{ maxWidth:740 }}>
      <h2 style={{ color:C.text, fontSize:20, marginBottom:20,
        fontFamily:'"Crimson Pro",Georgia,serif' }}>Firm Settings</h2>

      <Tabs tabs={[
        { id:'firm',      label:'Firm Details' },
        { id:'financial', label:'Financial' },
        { id:'banking',   label:'Bank Accounts' },
        { id:'system',    label:'System' },
        { id:'security',  label:'Security' },
      ]} active={tab} onChange={setTab} />

      <form onSubmit={save}>
        {tab==='firm' && (
          <Card>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {firmFields.map(f => (
                <FormField key={f.key} label={f.label}>
                  {f.multiline
                    ? <textarea rows={3} style={{ ...iS, resize:'vertical' }}
                        value={settings[f.key]||''}
                        onChange={e => setSettings(s => ({ ...s, [f.key]:e.target.value }))} />
                    : <input type={f.type||'text'} required={f.required} style={iS}
                        value={settings[f.key]||''}
                        onChange={e => setSettings(s => ({ ...s, [f.key]:e.target.value }))} />
                  }
                </FormField>
              ))}
            </div>
          </Card>
        )}

        {tab==='financial' && (
          <Card>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {finFields.map(f => (
                <FormField key={f.key} label={f.label}>
                  <input type={f.type||'text'} style={iS}
                    value={settings[f.key]||''}
                    onChange={e => setSettings(s => ({ ...s, [f.key]:e.target.value }))} />
                </FormField>
              ))}
            </div>
          </Card>
        )}

        {tab==='banking' && (
          <Card>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ padding:'10px 14px', background:'rgba(52,211,153,0.08)',
                border:'1px solid rgba(52,211,153,0.2)', borderRadius:8,
                color:'#34d399', fontSize:12 }}>
                Trust account details appear on all invoices and client correspondence.
              </div>
              {bankFields.map(f => (
                <FormField key={f.key} label={f.label}>
                  <input style={iS} value={settings[f.key]||''}
                    onChange={e => setSettings(s => ({ ...s, [f.key]:e.target.value }))} />
                </FormField>
              ))}
            </div>
          </Card>
        )}

        {tab==='system' && (
          <Card>
            <SectionTitle>AI & System Status</SectionTitle>
            {aiStatus && (
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                {[
                  ['AI Mode', aiStatus.mode],
                  ['AI Available', aiStatus.available ? 'Yes ✓' : 'No'],
                  ['Provider', aiStatus.mode==='demo' ? 'Anthropic Claude (Cloud)' : 'Local GGUF Model'],
                  ['Demo Mode', aiStatus.demo?.demo_mode_enabled ? 'Enabled' : 'Disabled'],
                ].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between',
                    padding:'8px 0', borderBottom:`1px solid ${C.border2}` }}>
                    <span style={{ color:C.text3, fontSize:13 }}>{l}</span>
                    <span style={{ color:C.text2, fontSize:13, fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            <SectionTitle>Database</SectionTitle>
            <div style={{ color:C.text3, fontSize:13, lineHeight:1.8 }}>
              <div>Data stored at: <code style={{ color:C.gold, fontSize:12 }}>~/IntelliLaw/firms/default/</code></div>
              <div style={{ marginTop:8, color:C.muted, fontSize:12 }}>
                Backup functionality available in the Security phase.</div>
            </div>
          </Card>
        )}

        {tab==='security' && (
          <SecuritySettings />
        )}

        {tab !== 'system' && (
          <div style={{ marginTop:20 }}>
            <Btn type="submit" disabled={saving} icon="check">
              {saving ? 'Saving…' : 'Save Settings'}
            </Btn>
          </div>
        )}
      </form>
    </div>
  )
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html, body, #root { height:100%; width:100%; }
  body { background:${C.bg}; color:${C.text2};
    font-family:system-ui,-apple-system,sans-serif;
    -webkit-font-smoothing:antialiased; overflow:hidden; }
  ::-webkit-scrollbar { width:6px; height:6px; }
  ::-webkit-scrollbar-track { background:${C.bg}; }
  ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
  ::-webkit-scrollbar-thumb:hover { background:#2a3d5e; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  input, textarea, select, button { font-family:inherit; }
  input[type=date]::-webkit-calendar-picker-indicator,
  input[type=time]::-webkit-calendar-picker-indicator { filter:invert(0.5); cursor:pointer; }
  input:focus, textarea:focus, select:focus {
    border-color:${C.gold}!important;
    box-shadow:0 0 0 3px ${C.gold}20; }
  button:hover:not(:disabled) { opacity:0.88; }
  button:active:not(:disabled) { opacity:0.76; }
  select option { background:${C.bg}; color:${C.text2}; }
  table { border-collapse:collapse; }
`

// ─── VIEW MAP ─────────────────────────────────────────────────────────────────

// ─── CONFLICT CHECK MODAL ─────────────────────────────────────────────────────
function ConflictCheckModal({ onClose, onProceed }) {
  const [step, setStep] = useState(1)  // 1: select client & search | 2: results | 3: done
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [opposingParty, setOpposingParty] = useState('')
  const [opposingCounsel, setOpposingCounsel] = useState('')
  const [potentialConflicts, setPotentialConflicts] = useState([])
  const [existingUncleared, setExistingUncleared] = useState([])
  const [loading, setLoading] = useState(false)
  const [raisedConflicts, setRaisedConflicts] = useState([])
  const [selectedForRaising, setSelectedForRaising] = useState({})

  useEffect(() => {
    API.get('/clients', { params: { limit: 200 } })
      .then(r => setClients(r.data.items || []))
  }, [])

  const search = async () => {
    if (!clientId) {
      toast.error('Select a client')
      return
    }
    if (!opposingParty && !opposingCounsel) {
      toast.error('Enter opposing party or counsel name')
      return
    }
    setLoading(true)
    try {
      const { data } = await API.post('/conflicts/check', {
        client_id: parseInt(clientId),
        opposing_party_name: opposingParty,
        opposing_counsel_name: opposingCounsel,
      })
      setPotentialConflicts(data.potential_conflicts || [])
      setExistingUncleared(data.existing_uncleared || [])
      setStep(2)
    } catch(err) {
      toast.error(err.response?.data?.detail || 'Error checking conflicts')
    } finally {
      setLoading(false)
    }
  }

  const toggleForRaising = idx => {
    setSelectedForRaising(m => ({
      ...m,
      [idx]: !m[idx]
    }))
  }

  const raiseSelectedConflicts = async () => {
    const toRaise = potentialConflicts.filter((_, i) => selectedForRaising[i])
    if (toRaise.length === 0) {
      toast.warning('Select at least one conflict to raise or proceed without raising')
      return
    }
    setLoading(true)
    try {
      for (const conflict of toRaise) {
        await API.post('/conflicts', {
          client_id: parseInt(clientId),
          opposing_name: conflict.name,
          opposing_counsel_name: opposingCounsel || null,
          reason: `Detected from matter: ${opposingParty}`,
          risk_level: 'medium',
        })
      }
      toast.success(`${toRaise.length} conflict(s) raised`)
      setRaisedConflicts(prev => [...prev, ...toRaise])
      setStep(3)
    } catch(err) {
      toast.error(err.response?.data?.detail || 'Error raising conflicts')
    } finally {
      setLoading(false)
    }
  }

  const proceedWithoutRaising = () => {
    if (existingUncleared.length > 0) {
      toast.error(`Cannot proceed: ${existingUncleared.length} existing uncleared conflicts`)
      return
    }
    setStep(3)
  }

  const finish = () => {
    // Pass client_id back to Matters via onProceed
    onProceed(parseInt(clientId))
  }

  const stepBarStyle = active => ({
    flex: 1, height: 4, borderRadius: 2,
    background: active ? C.gold : C.border,
    transition: 'background 0.3s',
  })

  return (
    <Modal title="Conflict Check" onClose={onClose} width={700}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {[1, 2, 3].map(s => <div key={s} style={stepBarStyle(s <= step)} />)}
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {['Select & Search', 'Review', 'Done'].map((label, i) => (
          <span key={i} style={{
            fontSize: 11, color: step === i + 1 ? C.gold : C.muted,
            fontWeight: step === i + 1 ? 600 : 400
          }}>
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {/* Step 1: Select Client & Search */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Client">
            <select style={sS} value={clientId}
              onChange={e => setClientId(e.target.value)}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>
                {c.display_name} ({c.client_number})
              </option>)}
            </select>
          </FormField>
          <FormField label="Opposing Party Name">
            <input style={iS} value={opposingParty}
              onChange={e => setOpposingParty(e.target.value)}
              placeholder="Enter opposing party name" />
          </FormField>
          <FormField label="Opposing Counsel (optional)">
            <input style={iS} value={opposingCounsel}
              onChange={e => setOpposingCounsel(e.target.value)}
              placeholder="Enter opposing counsel name" />
          </FormField>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={onClose} variant="secondary">Cancel</Btn>
            <Btn onClick={search} loading={loading} style={{ flex: 1 }}>Search for Conflicts</Btn>
          </div>
        </div>
      )}

      {/* Step 2: Review Results */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {existingUncleared.length > 0 && (
            <Card style={{ background: 'rgba(248,113,113,0.1)', border: `1px solid rgba(248,113,113,0.3)` }}>
              <p style={{ color: '#f87171', fontSize: 13, margin: '0 0 8px' }}>⚠️ Existing Uncleared Conflicts</p>
              {existingUncleared.map(c => (
                <div key={c.id} style={{ color: C.text3, fontSize: 12, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{c.opposing_name}</span>
                  <span style={{ color: C.muted }}> — {c.status}</span>
                </div>
              ))}
            </Card>
          )}

          {potentialConflicts.length > 0 ? (
            <div>
              <p style={{ color: C.text2, fontSize: 13, marginBottom: 10 }}>Potential Conflicts Found:</p>
              {potentialConflicts.map((conflict, idx) => (
                <div key={idx} style={{
                  display: 'flex', gap: 12, padding: 10, border: `1px solid ${C.border}`,
                  borderRadius: 6, marginBottom: 8, alignItems: 'flex-start'
                }}>
                  <input type="checkbox" checked={selectedForRaising[idx] || false}
                    onChange={() => toggleForRaising(idx)} style={{ marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
                      {conflict.name}
                      <span style={{ color: C.gold, marginLeft: 8, fontSize: 12 }}>
                        {Math.round(conflict.similarity * 100)}% match
                      </span>
                    </div>
                    <div style={{ color: C.text3, fontSize: 11, marginTop: 2 }}>
                      {conflict.type === 'client_match' && 'Found as existing client'}
                      {conflict.type === 'opposing_counsel_match' && 'Found as opposing counsel in other matters'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: C.text3, fontSize: 13 }}>No potential conflicts found.</p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={() => setStep(1)} variant="secondary">Back</Btn>
            {potentialConflicts.length > 0 && (
              <Btn onClick={raiseSelectedConflicts} loading={loading} style={{ flex: 1 }}>
                Raise Selected
              </Btn>
            )}
            <Btn onClick={proceedWithoutRaising} variant="success" style={{ flex: 1 }}>
              Proceed
            </Btn>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ background: 'rgba(52,211,153,0.1)', border: `1px solid rgba(52,211,153,0.3)` }}>
            <p style={{ color: '#34d399', fontSize: 13, margin: 0 }}>✓ Ready to create matter</p>
          </Card>
          {raisedConflicts.length > 0 && (
            <div>
              <p style={{ color: C.text2, fontSize: 13, marginBottom: 8 }}>Raised Conflicts:</p>
              {raisedConflicts.map((c, i) => (
                <div key={i} style={{ color: C.text3, fontSize: 12, paddingLeft: 16, marginBottom: 4 }}>
                  • {c.name}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={onClose} variant="secondary" style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={finish} style={{ flex: 1 }}>Create Matter</Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}

const VIEWS = {
  dashboard: Dashboard, clients: Clients,   matters: Matters,
  documents: Documents, calendar: Calendar, tasks: Tasks,
  billing: Billing,     trust: Trust,       research: Research,
  ai: AIAssistant,      users: Users,       audit_log: AuditLog,
  settings: Settings,
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('il_user')||'null') } catch { return null }
  })
  const [activeTab, setActiveTab] = useState('dashboard')

  // Session timeout tracking
  const [lastActivityTime, setLastActivityTime] = useState(Date.now())
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000  // 15 minutes
  const WARNING_THRESHOLD_MS = 2 * 60 * 1000  // 2 minutes

  const handleLogin = u => {
    setUser(u)
    localStorage.setItem('il_user', JSON.stringify(u))
    setLastActivityTime(Date.now())
    setShowTimeoutWarning(false)
  }
  const handleLogout = () => {
    localStorage.removeItem('il_token')
    localStorage.removeItem('il_user')
    setUser(null)
    setShowTimeoutWarning(false)
  }

  // Record user activity (mouse, keyboard, click)
  const recordActivity = useCallback(() => {
    if (user) {
      setLastActivityTime(Date.now())
      setShowTimeoutWarning(false)
    }
  }, [user])

  // Listen for user activity events
  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'keydown', 'click', 'touchstart', 'scroll']
    events.forEach(e => document.addEventListener(e, recordActivity))

    return () => events.forEach(e => document.removeEventListener(e, recordActivity))
  }, [user, recordActivity])

  // Check for idle timeout every 30 seconds
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime
      const timeUntilLogout = IDLE_TIMEOUT_MS - timeSinceActivity

      if (timeUntilLogout <= 0) {
        handleLogout()
      } else if (timeUntilLogout <= WARNING_THRESHOLD_MS && !showTimeoutWarning) {
        setShowTimeoutWarning(true)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [user, lastActivityTime, showTimeoutWarning, IDLE_TIMEOUT_MS, WARNING_THRESHOLD_MS])

  useEffect(() => {
    if (user) API.get('/auth/me').catch(() => handleLogout())
  }, [])

  const ActiveView = VIEWS[activeTab] || Dashboard

  if (!user) return (
    <><style>{globalStyle}</style><Login onLogin={handleLogin} /></>
  )

  return (
    <>
      <style>{globalStyle}</style>
      {showTimeoutWarning && (
        <Modal title="Session Timeout Warning" onClose={() => {}}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: C.text2, fontSize: 14, lineHeight: 1.6 }}>
              Your session will expire in 2 minutes due to inactivity. Click below to continue working.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn onClick={recordActivity} style={{ flex: 1 }}>Continue Working</Btn>
            <Btn onClick={handleLogout} variant="danger" style={{ flex: 1 }}>Logout Now</Btn>
          </div>
        </Modal>
      )}
      <AppCtx.Provider value={{ user, activeTab, setActiveTab }}>
        <Layout user={user} onLogout={handleLogout}
          activeTab={activeTab} setActiveTab={setActiveTab}>
          <ActiveView />
        </Layout>
      </AppCtx.Provider>
    </>
  )
}