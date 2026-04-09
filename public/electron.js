const { app, BrowserWindow, ipcMain } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');

let mainWindow;
let keystrokeData = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    icon: path.join(__dirname, 'favicon.ico')
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Inject keystroke tracking script when page loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      let keystrokeBuffer = [];
      let lastKeyTime = Date.now();
      let sessionId = null;

      // Track keyboard events
      document.addEventListener('keydown', (e) => {
        const currentTime = Date.now();
        const keyInterval = currentTime - lastKeyTime;
        
        // Only track printable characters and editing keys
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter') {
          keystrokeBuffer.push({
            interval: keyInterval,
            timestamp: currentTime
          });
          
          lastKeyTime = currentTime;
          
          // Send to main process periodically
          if (keystrokeBuffer.length >= 10) {
            if (window.electronAPI && window.electronAPI.sendKeystrokes) {
              window.electronAPI.sendKeystrokes(sessionId, keystrokeBuffer);
            }
            keystrokeBuffer = [];
          }
        }
      });

      // Track paste events
      document.addEventListener('paste', (e) => {
        const pastedText = e.clipboardData.getData('text');
        if (window.electronAPI && window.electronAPI.sendPasteEvent) {
          window.electronAPI.sendPasteEvent(sessionId, {
            pasteLength: pastedText.length,
            timestamp: Date.now()
          });
        }
      });

      // Expose electron API to window
      window.electronAPI = {
        sendKeystrokes: (id, data) => {
          if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('send-keystrokes', id, data);
          }
        },
        sendPasteEvent: (id, data) => {
          if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('send-paste-event', id, data);
          }
        },
        onSessionSet: (callback) => {
          sessionId = callback;
        }
      };
    `);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for keystroke tracking
ipcMain.handle('send-keystrokes', (event, sessionId, keystrokes) => {
  keystrokeData.push(...keystrokes);
  console.log('Keystrokes captured:', keystrokes.length);
  return true;
});

ipcMain.handle('send-paste-event', (event, sessionId, pasteEvent) => {
  console.log('Paste event detected:', pasteEvent);
  return true;
});

ipcMain.handle('get-keystroke-data', () => {
  return keystrokeData;
});

ipcMain.handle('clear-keystroke-data', () => {
  keystrokeData = [];
  return true;
});
