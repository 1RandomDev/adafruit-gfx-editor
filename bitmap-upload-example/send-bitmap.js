require('dotenv').config();
const mqtt = require('mqtt');
const img2bin = require('./img-to-binary.js');

const MAX_BYTES_PER_MESSAGE = parseInt(process.env.MAX_BYTES_PER_MESSAGE) || 2000;
const SCREEN_WIDTH  = parseInt(process.env.SCREEN_WIDTH)
      SCREEN_HEIGHT = parseInt(process.env.SCREEN_HEIGHT);

let client;

(async () => {
    if(process.argv.length < 4) {
        console.log('Usage: node send-bitmap.js <image_file> <rgb|color> [resizeStrategy]');
        process.exit(2);
    }

    let imagePath = process.argv[2],
        rgb = process.argv[3] == 'rgb',
        resizeStrategy = process.argv[4],
        color = undefined;
    
    if(!rgb) {
        color = parseInt(process.argv[3].replace('0x', ''), 16);
        if(isNaN(color)) color = 0xFFFF;
    }
    let image = await img2bin.convertToBitmap(imagePath, resizeStrategy, rgb);

    client = mqtt.connect(`mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`, {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD
    });
    client.on('connect', () => {
        startUpload(process.env.DEV_ID, image.width, image.height, color);
        uploadBitmap(process.env.DEV_ID, image.bitmap, image.width, image.height, rgb);
        client.end();
    });
})();

function startUpload(devId, width, height, color) {
    let x = 0, y = 0;
    if(width == SCREEN_WIDTH) {
        y = Math.floor((SCREEN_HEIGHT - height) / 2);
    } else {
        x = Math.floor((SCREEN_WIDTH - width) / 2);
    }

    const drawCommands = [
        { t: 'fill', c: 0x0000 },
        { t: 'bitmap', x, y, w: width, h: height, c: color }
    ];
    client.publish(`display/${devId}/draw`, JSON.stringify(drawCommands));
}

function uploadBitmap(devId, bitmap, width, height, rgb) {
    if(width == 0 || height == 0) throw new Error('width and height cannot be zero');
    const bytesPerRow = rgb ? width * 2 : Math.ceil(width / 8);
    if(bytesPerRow > MAX_BYTES_PER_MESSAGE) throw new Error('bytesPerRow > MAX_BYTES_PER_MESSAGE, cannot split single row');
    const rowsPerMessage = Math.floor(MAX_BYTES_PER_MESSAGE / bytesPerRow);
    const messagesTotal = Math.ceil(height / rowsPerMessage);
    console.log(`Bytes per row ${bytesPerRow}, bytes total ${bitmap.length}`);
    console.log(`We need ${messagesTotal} messages with max ${rowsPerMessage} rows`);

    for(let i=0; i<messagesTotal; i++) {
        const startRow = i * rowsPerMessage;
        const endRow = Math.min(startRow + rowsPerMessage, height);
        const startByte = startRow * bytesPerRow;
        const endByte = endRow * bytesPerRow;

        const buffer = Buffer.alloc(endByte - startByte);
        bitmap.copy(buffer, 0, startByte, endByte);
        client.publish(`display/${devId}/upload`, buffer, {qos: 1});
    }
}
