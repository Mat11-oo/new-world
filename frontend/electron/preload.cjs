const { contextBridge, ipcRenderer } = require('electron');

// Bridge for the launch cover (loading.html): the cover stays up until the
// user clicks "进入工作台" (or presses Enter), then main loads /workbench.
let coverReady = false;
const readyCallbacks = [];

ipcRenderer.on('nw:cover-ready', () => {
    coverReady = true;
    while (readyCallbacks.length) {
        try {
            readyCallbacks.shift()();
        } catch {
            /* ignore */
        }
    }
});

contextBridge.exposeInMainWorld('nwDesktop', {
    onCoverReady(callback) {
        if (typeof callback !== 'function') return;
        if (coverReady) callback();
        else readyCallbacks.push(callback);
    },
    enter() {
        ipcRenderer.send('nw:enter');
    },
});
