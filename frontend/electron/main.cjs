const { app, BrowserWindow, Menu, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

// Keep the client profile in Application Support when possible; fall back to
// a temp directory when the host environment cannot write there.
const RUNTIME_ROOT = (() => {
    if (process.env.NW_DESKTOP_DATA) return process.env.NW_DESKTOP_DATA;
    // eslint-disable-next-line no-undef
    const preferred = path.join(app.getPath('appData'), 'New World');
    try {
        fs.mkdirSync(path.join(preferred, 'profile'), { recursive: true });
        return preferred;
    } catch {
        return path.join(os.tmpdir(), 'new-world-desktop');
    }
})();
fs.mkdirSync(path.join(RUNTIME_ROOT, 'profile'), { recursive: true });
fs.mkdirSync(path.join(RUNTIME_ROOT, 'session'), { recursive: true });
fs.mkdirSync(path.join(RUNTIME_ROOT, 'logs'), { recursive: true });
app.setPath('userData', path.join(RUNTIME_ROOT, 'profile'));
app.setPath('sessionData', path.join(RUNTIME_ROOT, 'session'));
app.setPath('logs', path.join(RUNTIME_ROOT, 'logs'));
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');

const PACKAGED_CONFIG = (() => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'desktop.config.json'), 'utf8'));
    } catch {
        return {};
    }
})();
const FRONTEND_DIR = PACKAGED_CONFIG.frontend || path.join(__dirname, '..');
const PROJECT_DIR = PACKAGED_CONFIG.projectRoot || path.join(FRONTEND_DIR, '..');
const FRONTEND_PORT = 3100;
// The cover stays up until the user clicks "进入工作台". This is the minimum
// time it stays in the loading state before the enter prompt appears, so the
// cover is never a single-frame flash when services are already warm.
const MIN_SPLASH_MS = Number(process.env.NW_MIN_SPLASH_MS || 900);
let splashStartedAt = 0;
const BACKEND_HEALTH = 'http://127.0.0.1:8000/api/health';
const DEV_HEALTH = 'http://127.0.0.1:3000';
const DESKTOP_CSS = fs.readFileSync(path.join(__dirname, 'desktop.css'), 'utf8');

let mainWindow = null;
let appUrl = '';
let backendProcess = null;
let frontendProcess = null;
let logFd = null;

function log(...parts) {
    const line = `[${new Date().toISOString()}] ${parts.join(' ')}\n`;
    try {
        if (logFd) fs.writeSync(logFd, line);
        else process.stdout.write(line);
    } catch {
        /* ignore logging failures */
    }
}

function initLogging() {
    try {
        const logDir = app.getPath('logs');
        fs.mkdirSync(logDir, { recursive: true });
        logFd = fs.openSync(path.join(logDir, 'new-world-desktop.log'), 'a');
    } catch {
        logFd = null;
    }
}

async function isHealthy(url, timeout = 1200) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
        return response.ok;
    } catch {
        return false;
    }
}

async function waitFor(url, timeoutMs = 60000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        if (await isHealthy(url)) return true;
        await new Promise(resolve => setTimeout(resolve, 450));
    }
    return false;
}

function findUv() {
    const candidates = [
        process.env.UV_BIN,
    ].filter(Boolean);
    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) return candidate;
        } catch {
            /* ignore */
        }
    }
    return 'uv';
}

function spawnService(name, command, args, options) {
    log(`starting ${name}:`, command, args.join(' '));
    const child = spawn(command, args, {
        ...options,
        detached: true,
        stdio: ['ignore', logFd || 'ignore', logFd || 'ignore'],
    });
    child.on('exit', (code, signal) => log(`${name} exited code=${code} signal=${signal}`));
    child.on('error', error => log(`${name} spawn error: ${error.message}`));
    child.unref();
    return child;
}

async function ensureBackend() {
    if (await isHealthy(BACKEND_HEALTH)) {
        log('reusing running backend on 8000');
        return;
    }
    const backendDir = path.join(PROJECT_DIR, 'backend');
    if (!fs.existsSync(path.join(backendDir, 'api_server.py'))) {
        throw new Error(`后端目录不存在：${backendDir}`);
    }
    const uv = findUv();
    backendProcess = spawnService('backend', uv, ['run', 'python', 'api_server.py'], {
        cwd: backendDir,
        env: {
            ...process.env,
            SFA_HOST: '127.0.0.1',
            SFA_PORT: '8000',
            UV_CACHE_DIR: process.env.UV_CACHE_DIR || '/tmp/nw-uv-cache',
        },
    });
    if (!(await waitFor(BACKEND_HEALTH, 70000))) {
        throw new Error('后端服务启动超时，请检查 New World 客户端日志。');
    }
    log('backend ready on 8000');
}

async function ensureFrontend() {
    if (process.env.NW_USE_DEV === '1' && await isHealthy(DEV_HEALTH)) {
        log('reusing frontend dev server on 3000');
        return DEV_HEALTH;
    }
    const frontendUrl = `http://127.0.0.1:${FRONTEND_PORT}`;
    if (await isHealthy(frontendUrl)) {
        log(`reusing frontend on ${FRONTEND_PORT}`);
        return frontendUrl;
    }
    const frontendDir = FRONTEND_DIR;
    const nextBin = path.join(frontendDir, 'node_modules', 'next', 'dist', 'bin', 'next');
    const buildDir = path.join(frontendDir, '.next');
    if (!fs.existsSync(nextBin)) {
        throw new Error('缺少 Next.js 运行文件，请先在 frontend 目录安装依赖。');
    }
    if (!fs.existsSync(buildDir)) {
        throw new Error('缺少前端构建产物，请先在 frontend 目录运行 npm run build。');
    }
    frontendProcess = spawnService('frontend', process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', String(FRONTEND_PORT)], {
        cwd: frontendDir,
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1',
            NODE_ENV: 'production',
            NEXT_TELEMETRY_DISABLED: '1',
        },
    });
    if (!(await waitFor(frontendUrl, 70000))) {
        throw new Error('前端服务启动超时，请检查 New World 客户端日志。');
    }
    log(`frontend ready on ${FRONTEND_PORT}`);
    return frontendUrl;
}

function createWindow() {
    const workArea = screen.getPrimaryDisplay().workAreaSize;
    const width = Math.min(1600, Math.max(1060, workArea.width - 24));
    const height = Math.min(1000, Math.max(720, workArea.height - 24));

    mainWindow = new BrowserWindow({
        width,
        height,
        minWidth: 1060,
        minHeight: 720,
        show: false,
        title: 'New World',
        backgroundColor: '#08080a',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        trafficLightPosition: { x: 18, y: 18 },
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            spellcheck: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'loading.html'));
    splashStartedAt = Date.now();
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http://127.0.0.1:3000') || url.startsWith('http://127.0.0.1:3100') || url.startsWith('http://localhost:3000')) {
            return { action: 'allow' };
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });
    mainWindow.webContents.on('did-finish-load', () => {
        if (appUrl && mainWindow && mainWindow.webContents.getURL().startsWith(appUrl)) {
            injectDesktopChrome();
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function injectDesktopChrome() {
    if (!mainWindow) return;
    try {
        log('injecting desktop chrome');
        await mainWindow.webContents.insertCSS(DESKTOP_CSS);
        await mainWindow.webContents.executeJavaScript(`
            (() => {
                document.body.classList.add('nw-desktop');
                if (document.querySelector('.nw-desktop-titlebar')) return;
                const bar = document.createElement('div');
                bar.className = 'nw-desktop-titlebar';
                bar.innerHTML = [
                    '<span class="nw-desktop-brand">NEW WORLD</span>',
                    '<span class="nw-desktop-sub">AI FILM STUDIO</span>',
                    '<span class="nw-desktop-status">CLIENT · LOCAL</span>'
                ].join('');
                document.body.appendChild(bar);
            })();
        `);
        log('desktop chrome injected');
    } catch (error) {
        log('desktop chrome injection failed:', error.message);
    }
}

function showError(message) {
    const safe = String(message)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    const logPath = (() => {
        try { return path.join(app.getPath('logs'), 'new-world-desktop.log'); } catch { return ''; }
    })();
    if (!mainWindow) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        html,body{height:100%;margin:0;background:#08080a;color:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
        body{display:flex;align-items:center;justify-content:center;padding:60px}
        .box{max-width:620px;border:1px solid rgba(247,244,236,.14);border-radius:18px;padding:28px;background:rgba(20,20,24,.7)}
        h1{font-size:22px;font-weight:500;margin:0 0 10px} p{color:rgba(245,242,234,.62);line-height:1.75;font-size:13px}
        code{display:block;margin-top:16px;padding:10px;border-radius:8px;background:rgba(255,255,255,.05);color:rgba(245,242,234,.5);font-size:11px;word-break:break-all}
    </style></head><body><div class="box"><h1>New World 启动失败</h1><p>${safe}</p><p>请确认后端与前端依赖已安装，并查看客户端日志。</p><code>${logPath}</code></div></body></html>`;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function buildMenu() {
    const template = [
        { role: 'appMenu' },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function stopServices() {
    for (const child of [frontendProcess, backendProcess]) {
        if (!child || !child.pid) continue;
        try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch { /* ignore */ } }
    }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(async () => {
        app.setName('New World');
        initLogging();
        buildMenu();
        app.setAboutPanelOptions({
            applicationName: 'New World',
            applicationVersion: '0.1.0',
            version: '0.1.0',
            copyright: 'AI Film Studio',
            credits: 'New World client',
        });
        const iconPath = path.join(__dirname, 'icon.png');
        if (process.platform === 'darwin' && fs.existsSync(iconPath)) {
            try { app.dock.setIcon(iconPath); } catch { /* ignore */ }
        }
        createWindow();
        try {
            await ensureBackend();
            appUrl = await ensureFrontend();
            const splashRemaining = MIN_SPLASH_MS - (Date.now() - splashStartedAt);
            if (splashRemaining > 0) {
                await new Promise(resolve => setTimeout(resolve, splashRemaining));
            }
            log('loading boot cover:', `${appUrl}/`);
            await mainWindow.loadURL(`${appUrl}/`);
            await injectDesktopChrome();
            mainWindow.show();
            if (process.env.NW_CAPTURE_PATH) {
                await new Promise(resolve => setTimeout(resolve, 1800));
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    mainWindow.webContents.invalidate();
                    const image = await mainWindow.webContents.capturePage();
                    const target = path.resolve(process.env.NW_CAPTURE_PATH);
                    fs.mkdirSync(path.dirname(target), { recursive: true });
                    fs.writeFileSync(target, image.toPNG());
                    log('captured client window to', target);
                } catch (error) {
                    log('capture failed:', error.message);
                }
                app.quit();
            }
        } catch (error) {
            log('startup failed:', error.stack || error.message);
            showError(error.message || '未知错误');
            mainWindow.show();
        }
    });

    app.on('activate', () => {
        if (mainWindow) mainWindow.show();
        else createWindow();
    });

    app.on('window-all-closed', () => {
        app.quit();
    });

    app.on('before-quit', () => {
        stopServices();
    });
}
