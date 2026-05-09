const { Jimp } = require('jimp');

const SCREEN_WIDTH  = parseInt(process.env.SCREEN_WIDTH)
      SCREEN_HEIGHT = parseInt(process.env.SCREEN_HEIGHT);

function rgbaToRgb565(color) {
    const r = (color >> 24) & 0xFF;
    const g = (color >> 16) & 0xFF;
    const b = (color >>  8) & 0xFF;

    return ((r & 0xF8) << 8) | 
           ((g & 0xFC) << 3) | 
           (b >> 3);
}

function rgbaTo1Bit(color) {
    const r = (color >> 24) & 0xFF;
    const g = (color >> 16) & 0xFF;
    const b = (color >>  8) & 0xFF;
    const a = color & 0xFF;

    return r > 50 && g > 50 && b > 50 && a > 50;
}

async function convertToBitmap(imagePath, resizeStrategy = 'scale', rgb) {
    const image = await Jimp.read(imagePath);
    if(image.width != SCREEN_WIDTH || image.height != SCREEN_HEIGHT) {
        if(!['scale', 'crop'].includes(resizeStrategy)) throw new Error(`"${resizeStrategy}" is not a supported resize strategy`);
        switch(resizeStrategy) {
            case 'scale':
                image.scaleToFit({ w: SCREEN_WIDTH, h: SCREEN_HEIGHT });
                break;
            case 'crop':
                const newSize = Math.min(image.width, image.height);
                const x = (image.width - newSize) / 2;
                const y = (image.height - newSize) / 2;
                image.crop({ x, y, w: newSize, h: newSize });
                image.resize({ w: SCREEN_WIDTH, h: SCREEN_HEIGHT });
                break;
        }
    }
    
    let bitmap;
    if(rgb) {
        bitmap = Buffer.alloc(image.height*image.width*2);
        for (let y=0; y<image.height; y++) {
            for (let x=0; x<image.width; x++) {
                const index = (y * image.width + x) * 2;
                const rgba = image.getPixelColor(x, y);
                const rgb565 = rgbaToRgb565(rgba);
                bitmap.writeUInt16BE(rgb565, index);
            }
        }
    } else {
        const bytesPerRow = Math.ceil(image.width / 8);
        bitmap = Buffer.alloc(bytesPerRow * image.height);
        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                const byteIndex = y * bytesPerRow + Math.floor(x / 8);
                const bitIndex = 7 - (x % 8);
            
                const rgba = image.getPixelColor(x, y);
                const bit = rgbaTo1Bit(rgba);
            
                if (bit) {
                    bitmap[byteIndex] |= (1 << bitIndex);
                }
            }
        }
    }

    return { bitmap, height: image.height, width: image.width};
}

module.exports = { convertToBitmap };
