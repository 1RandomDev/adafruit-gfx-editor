import { app, ipcMain, BrowserWindow } from 'electron/main';
import path from 'node:path';
import mqtt from 'mqtt';
import fs from 'node:fs';

const MAX_BYTES_PER_MESSAGE = 2000;

let appSettings = {
    mqttHost: '',
    mqttPort: 1883,
    mqttUsername: '',
    mqttPassword: '',
    mqttDeviceTopic: 'display/minidisplay01'
};
const confDir = (process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"))+'/adafruit-gfx-editor';
if(!fs.existsSync(confDir)) {
    fs.mkdirSync(confDir, { recursive: true });
}
const confFile = confDir+'/config.json';
if(!fs.existsSync(confFile)) {
    fs.writeFileSync(confFile, '{}');
} else {
    Object.assign(appSettings, JSON.parse(fs.readFileSync(confFile)));
}
function saveSettings() {
    fs.writeFileSync(confFile, JSON.stringify(appSettings));
}

function createWindow () {
    const win = new BrowserWindow({
        title: 'Adafruit GFX Editor',
        webPreferences: {
            preload: path.join(import.meta.dirname, 'preload.js')
        },
        sandbox: true,
        contextIsolation: true
    });
    win.maximize();
    win.loadFile(path.join(import.meta.dirname, '../www/index.html'));
}

app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('getSettings', (event) => {
        return appSettings;
    });
    ipcMain.handle('saveSettings', (event, newSettings) => {
        Object.assign(appSettings, newSettings);
        saveSettings();
    });
    ipcMain.handle('sendDisplayCommands', async (event, cmds) => {
        try {
            await processCommands(cmds);
            return {success: true};
        } catch(err) {
            return {success: false, error: err.message};
        }
    });

    app.on('activate', () => {
        if(BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    client.end();
    client = null;
    if(process.platform !== 'darwin') app.quit();
});

async function testMqttConnection() {
    try {
        let client = await mqtt.connectAsync({
            host: appSettings.mqttHost,
            port: appSettings.mqttPort,
            username: appSettings.mqttUsername || undefined,
            password: appSettings.mqttPassword || undefined
        });
        client.end();
        return {success: true};
    } catch(err) {
        return {success: false, error: err};
    }
}
async function processCommands(cmds) {
    let client = await mqtt.connectAsync({
        host: appSettings.mqttHost,
        port: appSettings.mqttPort,
        username: appSettings.mqttUsername || undefined,
        password: appSettings.mqttPassword || undefined
    });
    
    let cmdBuffer = [];
    for(let cmd of cmds) {
        cmdBuffer.push(cmd);
        if(cmd.t == 'bitmap') {
            const bitmap = bitmapToBuffer(cmd.bitmap, !!cmd.c);
            delete cmd.bitmap;
            sendCommands(client, cmdBuffer);
            uploadBitmap(client, bitmap, cmd.w, cmd.h, !!cmd.c)
            cmdBuffer = [];
        } 
    }
    if(cmdBuffer.length > 0) sendCommands(client, cmdBuffer);

    client.end();
}
function bitmapToBuffer(bmp, monochrome) {
    if(monochrome) {
        return Buffer.from(bmp);
    } else {
        const buffer = Buffer.alloc(2 * bmp.length);
        for(let i = 0; i < bmp.length; i++) {
            buffer[i * 2]     = bmp[i] >> 8;
            buffer[i * 2 + 1] = bmp[i] & 0xFF;
        }
        return buffer;
    }
}
function sendCommands(client, cmds) {
    client.publish(path.join(appSettings.mqttDeviceTopic, 'draw'), JSON.stringify(cmds), {qos: 1});
}
function uploadBitmap(client, bitmap, width, height, monochrome) {
    if(width == 0 || height == 0) throw new Error('width and height cannot be zero');
    const bytesPerRow = monochrome ? Math.ceil(width / 8) : width * 2;
    if(bytesPerRow > MAX_BYTES_PER_MESSAGE) throw new Error('bytesPerRow > MAX_BYTES_PER_MESSAGE, cannot split single row');
    const rowsPerMessage = Math.floor(MAX_BYTES_PER_MESSAGE / bytesPerRow);
    const messagesTotal = Math.ceil(height / rowsPerMessage);
    //console.log(`Bytes per row ${bytesPerRow}, bytes total ${bitmap.length}`);
    //console.log(`We need ${messagesTotal} messages with max ${rowsPerMessage} rows`);

    for(let i=0; i<messagesTotal; i++) {
        const startRow = i * rowsPerMessage;
        const endRow = Math.min(startRow + rowsPerMessage, height);
        const startByte = startRow * bytesPerRow;
        const endByte = endRow * bytesPerRow;

        const buffer = Buffer.alloc(endByte - startByte);
        bitmap.copy(buffer, 0, startByte, endByte);
        client.publish(path.join(appSettings.mqttDeviceTopic, 'upload'), buffer, {qos: 1});
    }
}
