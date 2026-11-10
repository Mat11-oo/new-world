# New World Desktop Client

New World is delivered as a native Electron window, not as a browser page.

## Launch

- Double-click `release/New World-darwin-arm64/New World.app`
- Or from this directory:

```bash
npm run desktop:app   # use the existing production build
npm run desktop       # rebuild the frontend, then open the client window
```

The client automatically starts:

- FastAPI backend on port `8000`
- Next.js production renderer on port `3100`

The renderer is internal; the product is the Electron window. It opens at `/` (the New World boot cover), then the cover’s “进入工作台” button opens `/workbench`. It does not open Safari, Chrome, or any browser chrome.

## Launch cover

启动时由 Electron 加载 `/` 开机封面；后端与渲染进程在后台就绪后，由用户点击「进入工作台」进入 `/workbench`，不会自动打开浏览器。

- `NW_MIN_SPLASH_MS`（默认 `2200`）：封面处于加载态的最短时长，服务已预热时也不会一闪而过。
- `NW_AUTO_ENTER=1`：跳过点击，用于截图/自动化（`NW_CAPTURE_PATH` 隐含此行为）。
- 封面与主窗口之间的桥接在 `electron/preload.cjs`（`contextBridge` + `ipcRenderer`，`nw:cover-ready` / `nw:enter`）。

## Window

- macOS native traffic lights
- Custom HUD title bar: `NEW WORLD · AI FILM STUDIO · CLIENT · LOCAL`
- Draggable title bar
- Native window frame, no address bar or browser tabs

## Packaging

The packaged app is generated with `@electron/packager`:

```bash
npm run desktop:package
```

Copy `desktop.config.example.json` to local `desktop.config.json` and adjust the paths before packaging. `desktop.config.json` is git-ignored. The current packaging target is macOS arm64.
