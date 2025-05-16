import { app, ipcMain, BrowserWindow } from 'electron/main';
import path from 'node:path';
import mqtt from 'mqtt';
import fs from 'node:fs';

const MAX_BYTES_PER_MESSAGE = 2000;

let config = JSON.parse(fs.readFileSync('config.json'));
let client;

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

    if(config.mqtt) {
        if(client) client.end();
        client = mqtt.connect(config.mqtt);
        client.on('connect', () => {
            console.log('MQTT connected');
        });
    }
}

app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('sendDisplayCommands', (event, cmds) => {
        processCommands(cmds);
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

function processCommands(cmds) {
    let cmdBuffer = [];
    for(let cmd of cmds) {
        cmdBuffer.push(cmd);
        if(cmd.t == 'bitmap') {
            const bitmap = bitmapToBuffer(cmd.bitmap, !!cmd.c);
            delete cmd.bitmap;
            sendCommands(cmdBuffer);
            uploadBitmap(bitmap, cmd.w, cmd.h, !!cmd.c)
            cmdBuffer = [];
        } 
    }
    if(cmdBuffer.length > 0) sendCommands(cmdBuffer);
}
function bitmapToBuffer(bmp, monochrome) {
    console.log(monochrome)
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
function sendCommands(cmds) {
    client.publish(path.join(config.deviceTopic, 'draw'), JSON.stringify(cmds), {qos: 1});
}
function uploadBitmap(bitmap, width, height, monochrome) {
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
        client.publish(path.join(config.deviceTopic, 'upload'), buffer, {qos: 1});
    }
}
