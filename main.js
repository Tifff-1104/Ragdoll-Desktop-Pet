const { app, BrowserWindow, ipcMain, Menu, screen } = require('electron');
const path = require('node:path');

const { getNextCalendarEvent } = require('./calendar-query');

let petWindow;

function createPet() {
  const width = 196;
  const height = 168;
  const area = screen.getPrimaryDisplay().workArea;
  petWindow = new BrowserWindow({
    width,
    height,
    x: area.x + area.width - width - 16,
    y: area.y + area.height - height - 16,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    title: '布偶猫桌宠',
    webPreferences: {
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  const modeMenu = Menu.buildFromTemplate([
    ['喂小鱼', 'feed'],
    ['问候', 'greet'],
    ['猜法语', 'quiz'],
    ['提醒事项', 'reminders'],
    ['日历（工作、个人）', 'calendar']
  ].map(([label, mode]) => ({
    label,
    type: 'radio',
    checked: mode === 'greet',
    click: () => {
      if (!petWindow || petWindow.isDestroyed() || petWindow.webContents.isDestroyed()) return;
      petWindow.webContents.send('pet-mode', mode);
    }
  })));

  petWindow.webContents.on('context-menu', () => {
    modeMenu.popup({ window: petWindow });
  });

  petWindow.once('ready-to-show', () => petWindow.showInactive());
  petWindow.on('closed', () => { petWindow = null; });
  petWindow.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('pet-calendar', (event, source) => {
  if (!petWindow || event.sender !== petWindow.webContents) throw new Error('未知窗口');
  if (!['reminders', 'calendar'].includes(source)) throw new Error('未知查询来源');
  return getNextCalendarEvent(source);
});

ipcMain.on('pet-drag', (event, offsetX, offsetY) => {
  if (!petWindow || event.sender !== petWindow.webContents) return;
  const [width, height] = petWindow.getContentSize();
  if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY) ||
      offsetX < 0 || offsetX > width || offsetY < 0 || offsetY > height) return;

  const cursor = screen.getCursorScreenPoint();
  petWindow.setPosition(Math.round(cursor.x - offsetX), Math.round(cursor.y - offsetY));
});

app.whenReady().then(createPet);
app.on('window-all-closed', () => app.quit());
