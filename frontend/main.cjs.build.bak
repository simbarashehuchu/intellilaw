/**
 * IntelliLaw — Electron Main Process  v1.1
 * Fix: INTELLISCHOOL_SERVER_ONLY → INTELLILAW_SERVER_ONLY
 */

const { app, BrowserWindow, shell, dialog, Menu } = require('electron')
const path     = require('path')
const { spawn, execSync } = require('child_process')
const http     = require('http')
const net      = require('net')
const fs       = require('fs')

// Stability flags
app.commandLine.appendSwitch('disable-features', 'NetworkServiceInProcess')
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')

const IS_DEV = !app.isPackaged
const IS_WIN = process.platform === 'win32'

const BACKEND_EXE = IS_WIN
  ? path.join(process.resourcesPath, 'backend', 'IntelliLaw-backend.exe')
  : path.join(process.resourcesPath, 'backend', 'IntelliLaw-backend')

const ICON_PATH = path.join(__dirname, 'assets', 'icon.ico')

let mainWindow   = null
let backendProc  = null
let backendPort  = 8000
let backendReady = false

// ── Logging ───────────────────────────────────────────────────────
const logDir = path.join(
  process.env.USERPROFILE || process.env.HOME || app.getPath('userData'),
  'IntelliLaw', 'logs'
)
fs.mkdirSync(logDir, { recursive: true })
const logFile = path.join(logDir, 'electron.log')

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  try { fs.appendFileSync(logFile, line + '\n') } catch (_) {}
}

// ── Port helpers ──────────────────────────────────────────────────
function isPortFree(port) {
  return new Promise(resolve => {
    const s = net.createServer()
    s.once('error', () => resolve(false))
    s.once('listening', () => { s.close(); resolve(true) })
    s.listen(port, '0.0.0.0')
  })
}

async function findFreePort(start = 8000, end = 8100) {
  for (let p = start; p <= end; p++) {
    if (await isPortFree(p)) return p
  }
  throw new Error(`No free port found in range ${start}-${end}`)
}

function waitForBackend(port, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const check = () => {
      if (Date.now() > deadline)
        return reject(new Error(`Backend did not respond within ${timeoutMs / 1000}s`))
      const req = http.get(
        `http://127.0.0.1:${port}/api/health`,
        { timeout: 2000 },
        res => {
          if (res.statusCode === 200) { log(`Backend healthy on :${port}`); resolve(port) }
          else setTimeout(check, 1000)
          res.resume()
        }
      )
      req.on('error',   () => setTimeout(check, 1000))
      req.on('timeout', () => { req.destroy(); setTimeout(check, 1000) })
    }
    check()
  })
}

// ── Backend ───────────────────────────────────────────────────────
async function startBackend() {
  if (IS_DEV) {
    log('[DEV] Waiting for FastAPI dev server on :8000')
    backendPort = 8000
    try { await waitForBackend(8000, 20000) } catch { log('[DEV] Backend not ready — opening UI anyway') }
    backendReady = true
    return
  }

  if (!fs.existsSync(BACKEND_EXE)) {
    dialog.showErrorBox(
      'IntelliLaw — Launch Error',
      `Backend executable not found:\n${BACKEND_EXE}\n\nPlease reinstall IntelliLaw.`
    )
    app.quit(); return
  }

  backendPort = await findFreePort(8000, 8100)
  log(`Starting backend on port ${backendPort}`)

  backendProc = spawn(BACKEND_EXE, [], {
    env: {
      ...process.env,
      HOST: '0.0.0.0',
      PORT: String(backendPort),
      CORS_ORIGINS: '*',
      INTELLILAW_SERVER_ONLY: '1',   // ← fixed (was INTELLISCHOOL_SERVER_ONLY)
    },
    detached: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  backendProc.stdout.on('data', d => log(`[py] ${d.toString().trim()}`))
  backendProc.stderr.on('data', d => log(`[py:err] ${d.toString().trim()}`))

  backendProc.on('error', err => {
    dialog.showErrorBox('IntelliLaw Error', `Could not start backend:\n${err.message}`)
    app.quit()
  })
  backendProc.on('exit', (code, signal) => {
    log(`[py] exited code=${code} signal=${signal}`)
    if (backendReady && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        'IntelliLaw — Backend Stopped',
        `The backend exited unexpectedly (code ${code}).\n\nLog: ${logFile}`
      )
    }
  })

  log('Waiting for backend to be ready...')
  await waitForBackend(backendPort, 60000)
  backendReady = true
}

function stopBackend() {
  if (!backendProc || IS_DEV) return
  try {
    if (IS_WIN) execSync(`taskkill /PID ${backendProc.pid} /T /F`, { stdio: 'ignore' })
    else        backendProc.kill('SIGTERM')
  } catch (e) { log(`stopBackend: ${e.message}`) }
  backendProc = null
}

// ── Window ────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900,
    minWidth: 1100, minHeight: 700,
    backgroundColor: '#0a0e1a',
    show: false,
    icon: fs.existsSync(ICON_PATH) ? ICON_PATH : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: fs.existsSync(path.join(__dirname, 'preload.js'))
        ? path.join(__dirname, 'preload.js')
        : undefined,
    },
    title: 'IntelliLaw',
  })

  Menu.setApplicationMenu(null)

  const url = IS_DEV
    ? 'http://localhost:5174'
    : `http://127.0.0.1:${backendPort}`

  log(`Loading ${url}`)
  mainWindow.loadURL(url)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    log('Window shown')
  })

  mainWindow.webContents.setWindowOpenHandler(({ url: u }) => {
    if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost'))
      return { action: 'allow' }
    shell.openExternal(u)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── App lifecycle ─────────────────────────────────────────────────
app.whenReady().then(async () => {
  log('='.repeat(50))
  log('  IntelliLaw Desktop v1.0.0')
  log(`  Mode: ${IS_DEV ? 'DEVELOPMENT' : 'PRODUCTION'}`)
  log(`  Log:  ${logFile}`)
  log('='.repeat(50))
  try {
    await startBackend()
    createWindow()
  } catch (err) {
    log(`FATAL: ${err.message}`)
    dialog.showErrorBox(
      'IntelliLaw — Startup Failed',
      `${err.message}\n\nFull log:\n${logFile}`
    )
    app.quit()
  }
})

app.on('window-all-closed', () => { stopBackend(); app.quit() })
app.on('before-quit',        stopBackend)
process.on('exit',  stopBackend)
process.on('SIGINT',  () => { stopBackend(); process.exit(0) })
process.on('SIGTERM', () => { stopBackend(); process.exit(0) })

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && backendReady) createWindow()
})
