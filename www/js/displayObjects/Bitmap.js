import { DisplayObject } from './DisplayObject.js';

export class Bitmap extends DisplayObject {
    constructor(x, y, width, height, filename, image, bitmap, color, monochrome) {
        super('bitmap');
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 60;
        this.height = height || 60;
        this.filename = filename || '';
        this.image = image;
        this.bitmap = bitmap;
        this.color = color || 0xF800;
        this.monochrome = monochrome || false;
    }

    fromJson(json) {
        if(json.bitmap) json.bitmap = json.monochrome ? Uint8Array.from(json.bitmap) : Uint16Array.from(json.bitmap);
        super.fromJson(json);
    }
    toJson() {
        const json = super.toJson();
        if(json.bitmap) json.bitmap = Array.from(json.bitmap);
        return json;
    }
    
    draw(gfx) {
        console.log(this.bitmap)
        if(!this.bitmap) {
            gfx.drawRect(this.x, this.y, this.width, this.height, this.color);
            gfx.drawLine(this.x, this.y, this.x+this.width-1, this.y+this.height-1, this.color);
            gfx.drawLine(this.x+this.width-1, this.y, this.x, this.y+this.height-1, this.color);
            return;
        }

        if(this.monochrome) {
            gfx.drawBitmap(this.x, this.y, this.bitmap, this.width, this.height, this.color);
        } else {
            gfx.drawRGBBitmap(this.x, this.y, this.bitmap, this.width, this.height);
        }
    }

    toCode(gfxName) {
        if(!this.bitmap) return '';
        const codeSnippets = {};
        const varname = 'bmp_'+this.filenameToVarname(this.filename);

        const valuesPerLine = this.monochrome ? 18 : 14;
        codeSnippets.header = `<span class="hl-datatype">const ${this.monochrome ? 'uint8_t' : 'uint16_t'}</span> <span class="hl-varname">${varname}</span>[] <span class="hl-instance">PROGMEM</span> = {`;
        for(let i = 0; i < this.bitmap.length; i++) {
            const pixelVal = this.formatHex(this.bitmap[i], this.monochrome ? 2 : 4);
            if(i % valuesPerLine == 0) codeSnippets.header += '<br>&nbsp;&nbsp;&nbsp;&nbsp;';
            codeSnippets.header += `<span class="hl-val">${pixelVal}</span>`;
            if(i != this.bitmap.length-1) codeSnippets.header += ', ';
        }
        codeSnippets.header += '<br>};';

        if(this.monochrome) {
            const color = this.formatHex(this.color, 4);
            codeSnippets.code = this.formatMethod(gfxName, 'drawBitmap', [this.x, this.y, varname, this.width, this.height, color]);
        } else {
            codeSnippets.code = this.formatMethod(gfxName, 'drawRGBBitmap', [this.x, this.y, varname, this.width, this.height]);
        }
        return codeSnippets;
    }

    loadImage(image, preserve) {
        if(image) this.image = image;
        return new Promise((resolve, reject) => {
            const dimensions = { width: this.width, height: this.height};
            const img = new Image();
            img.onload = () => {
                dimensions.width = Math.min(dimensions.width, img.width);
                dimensions.height = Math.min(dimensions.height, img.height);

                const aspectRatio = img.width / img.height;
                if((preserve == 'width') || (!preserve && aspectRatio > 1)) {
                    dimensions.height = Math.floor(dimensions.width / aspectRatio);
                } else {
                    dimensions.width = Math.floor(dimensions.height * aspectRatio);
                }

                this.bitmap = this.imageToBitmap(img, dimensions);
                this.width = dimensions.width;
                this.height = dimensions.height;
                resolve(dimensions);
            };
            img.onerror = reject;
            img.src = image || this.image;
        });
    }
    imageToBitmap(img, dimensions) {
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const context = canvas.getContext('2d');
        context.drawImage(img, 0, 0, dimensions.width, dimensions.height);
        const imgData = context.getImageData(0, 0, dimensions.width, dimensions.height).data;
        
        let bitmap;
        if(this.monochrome) {
            const bytesPerRow = Math.ceil(dimensions.width / 8);
            bitmap = new Uint8Array(bytesPerRow * dimensions.height);
            for(let y = 0; y < dimensions.height; y++) {
                for(let x = 0; x < dimensions.width; x++) {
                    const pixelIndex = y * dimensions.width + x;
                    const byteIndex = y * bytesPerRow + Math.floor(x / 8);
                    const bitIndex = 7 - (x % 8);

                    const r = imgData[pixelIndex*4];
                    const g = imgData[pixelIndex*4 + 1];
                    const b = imgData[pixelIndex*4 + 2];
                    const a = imgData[pixelIndex*4 + 3];

                    const bit = r > 50 && g > 50 && b > 50 && a > 50;
                    if(bit) {
                        bitmap[byteIndex] |= (1 << bitIndex);
                    }
                }
            }
        } else {
            const pixelCount = imgData.length / 4;
            bitmap = new Uint16Array(pixelCount);
            for(let i = 0; i < pixelCount; i++) {
                const r = imgData[i*4];
                const g = imgData[i*4 + 1];
                const b = imgData[i*4 + 2];
                const rgb565 =
                    ((r >> 3) << 11) |
                    ((g >> 2) << 5)  |
                    (b >> 3);

                bitmap[i] = rgb565;
                /*bitmap[i*2] = (rgb565 >> 8) & 0xFF;
                bitmap[i*2 + 1] = rgb565 & 0xFF;*/
            }
        }
        return bitmap;
    }
}
