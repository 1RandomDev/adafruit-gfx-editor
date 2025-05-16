export class GFX {
    constructor(ctx, screenWidth, screenHeight, scale = 1) {
        this.ctx = ctx;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.scale = scale;
        this.lastColor = 0;
        this.textOptions = {
            cursor_x: 0,
            cursor_y: 0,
            textcolor: 0xFFFF,
            textbgcolor: 0xFFFF,
            textsize_x: 1,
            textsize_y: 1,
            wrap: false,
            cp437: false,
            gfxFont: null
        };
    }
    setScale(scale) {
        this.scale = scale;
    }
    setDimensions(screenWidth, screenHeight) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
    }

    // Pixel
    drawPixel(x, y, color) {
        if(this.lastColor != color) {
            this.lastColor = color;
            this.ctx.fillStyle = this.rgb565toRGB888(color);
        }
        this.ctx.fillRect(x*this.scale, y*this.scale, this.scale, this.scale);
    }
    rgb565toRGB888(color) {
        let r5 = (color >> 11) & 0x1F;
        let g6 = (color >> 5)  & 0x3F;
        let b5 =  color        & 0x1F;
    
        let r8 = (r5 << 3) | (r5 >> 2);
        let g8 = (g6 << 2) | (g6 >> 4);
        let b8 = (b5 << 3) | (b5 >> 2);
    
        return `rgb(${r8}, ${g8}, ${b8})`;
    }

    // Line
    drawLine(x0, y0, x1, y1, color) {
        let steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
        if(steep) {
            [x0, y0] = [y0, x0];
            [x1, y1] = [y1, x1];
        }
        if(x0 > x1) {
            [x0, x1] = [x1, x0];
            [y0, y1] = [y1, y0];
        }
    
        let dx = x1 - x0,
            dy = Math.abs(y1 - y0);
    
        let err = dx / 2,
            ystep = y0 < y1 ? 1 : -1;
    
        for(; x0 <= x1; x0++) {
            if(steep) {
                this.drawPixel(y0, x0, color);
            } else {
                this.drawPixel(x0, y0, color);
            }
            err -= dy;
            if(err < 0) {
                y0 += ystep;
                err += dx;
            }
        }
    }
    drawFastVLine(x, y, h, color) {
        for(let curY = y; curY < h+y; curY++) {
            this.drawPixel(x, curY, color);
        }
    }
    drawFastHLine(x, y, w, color) {
        for(let curX = x; curX < w+x; curX++) {
            this.drawPixel(curX, y, color);
        }
    }

    // Rect
    drawRect(x, y, w, h, color) {
        this.drawFastHLine(x, y, w, color);
        this.drawFastHLine(x, y + h - 1, w, color);
        this.drawFastVLine(x, y, h, color);
        this.drawFastVLine(x + w - 1, y, h, color);
    }
    fillRect(x, y, w, h, color) {
        for(let i = x; i < x + w; i++) {
            this.drawFastVLine(i, y, h, color);
        }
    }
    drawRoundRect(x, y, w, h, r, color) {
        let max_radius = ((w < h) ? w : h) / 2;
        if(r > max_radius)
            r = max_radius;
    
        this.drawFastHLine(x + r, y, w - 2 * r, color);
        this.drawFastHLine(x + r, y + h - 1, w - 2 * r, color);
        this.drawFastVLine(x, y + r, h - 2 * r, color);
        this.drawFastVLine(x + w - 1, y + r, h - 2 * r, color);
    
        this.drawCircleHelper(x + r, y + r, r, 1, color);
        this.drawCircleHelper(x + w - r - 1, y + r, r, 2, color);
        this.drawCircleHelper(x + w - r - 1, y + h - r - 1, r, 4, color);
        this.drawCircleHelper(x + r, y + h - r - 1, r, 8, color);
    }
    fillRoundRect(x, y, w, h, r, color) {
        let max_radius = ((w < h) ? w : h) / 2;
        if(r > max_radius)
            r = max_radius;
    
        this.fillRect(x + r, y, w - 2 * r, h, color);
    
        this.fillCircleHelper(x + w - r - 1, y + r, r, 1, h - 2 * r - 1, color);
        this.fillCircleHelper(x + r, y + r, r, 2, h - 2 * r - 1, color);
    }
    fillScreen(color) {
        this.fillRect(0, 0, this.screenWidth, this.screenHeight, color);
    }

    // Circle
    drawCircle(x0, y0, r, color) {
        let f = 1 - r,
            ddF_x = 1,
            ddF_y = -2 * r,
            x = 0,
            y = r;
    
        this.drawPixel(x0, y0 + r, color);
        this.drawPixel(x0, y0 - r, color);
        this.drawPixel(x0 + r, y0, color);
        this.drawPixel(x0 - r, y0, color);
    
        while(x < y) {
            if(f >= 0) {
                y--;
                ddF_y += 2;
                f += ddF_y;
            }
            x++;
            ddF_x += 2;
            f += ddF_x;
    
            this.drawPixel(x0 + x, y0 + y, color);
            this.drawPixel(x0 - x, y0 + y, color);
            this.drawPixel(x0 + x, y0 - y, color);
            this.drawPixel(x0 - x, y0 - y, color);
            this.drawPixel(x0 + y, y0 + x, color);
            this.drawPixel(x0 - y, y0 + x, color);
            this.drawPixel(x0 + y, y0 - x, color);
            this.drawPixel(x0 - y, y0 - x, color);
        }
    }
    drawCircleHelper(x0, y0, r, corners, color) {
        let f = 1 - r,
            ddF_x = 1,
            ddF_y = -2 * r,
            x = 0,
            y = r;
    
        while(x < y) {
            if(f >= 0) {
                y--;
                ddF_y += 2;
                f += ddF_y;
            }
            x++;
            ddF_x += 2;
            f += ddF_x;
    
            if(corners & 0x4) {
                this.drawPixel(x0 + x, y0 + y, color);
                this.drawPixel(x0 + y, y0 + x, color);
            }
            if(corners & 0x2) {
                this.drawPixel(x0 + x, y0 - y, color);
                this.drawPixel(x0 + y, y0 - x, color);
            }
            if(corners & 0x8) {
                this.drawPixel(x0 - y, y0 + x, color);
                this.drawPixel(x0 - x, y0 + y, color);
            }
            if(corners & 0x1) {
                this.drawPixel(x0 - y, y0 - x, color);
                this.drawPixel(x0 - x, y0 - y, color);
            }
        }
    }
    fillCircle(x0, y0, r, color) {
        this.drawFastVLine(x0, y0 - r, 2 * r + 1, color);
        this.fillCircleHelper(x0, y0, r, 3, 0, color);
    }
    fillCircleHelper(x0, y0, r, corners, delta, color) {
        let f = 1 - r,
            ddF_x = 1,
            ddF_y = -2 * r,
            x = 0,
            y = r,
            px = x,
            py = y;
    
        delta++;
    
        while(x < y) {
            if(f >= 0) {
                y--;
                ddF_y += 2;
                f += ddF_y;
            }
            x++;
            ddF_x += 2;
            f += ddF_x;
    
            if(x < (y + 1)) {
                if(corners & 1)
                    this.drawFastVLine(x0 + x, y0 - y, 2 * y + delta, color);
                if(corners & 2)
                    this.drawFastVLine(x0 - x, y0 - y, 2 * y + delta, color);
            }
            if(y != py) {
                if(corners & 1)
                    this.drawFastVLine(x0 + py, y0 - px, 2 * px + delta, color);
                if(corners & 2)
                    this.drawFastVLine(x0 - py, y0 - px, 2 * px + delta, color);
                py = y;
            }
            px = x;
        }
    }

    // Triangle
    drawTriangle(x0, y0, x1, y1, x2, y2, color) {
        this.drawLine(x0, y0, x1, y1, color);
        this.drawLine(x1, y1, x2, y2, color);
        this.drawLine(x2, y2, x0, y0, color);
    }
    fillTriangle(x0, y0, x1, y1, x2, y2, color) { // Missing pixel on tip
        let a, b, y;
    
        if(y0 > y1) {
            [y0, y1] = [y1, y0];
            [x0, x1] = [x1, x0];
        }
        if(y1 > y2) {
            [y2, y1] = [y1, y2];
            [x2, x1] = [x1, x2];
        }
        if(y0 > y1) {
            [y0, y1] = [y1, y0];
            [x0, x1] = [x1, x0];
        }
    
        if(y0 == y2) {
            a = b = x0;
            if(x1 < a)
                a = x1;
            else if(x1 > b)
                b = x1;
    
            if(x2 < a)
                a = x2;
            else if(x2 > b)
                b = x2;
    
            this.drawFastHLine(a, y0, b - a + 1, color);
            return;
        }
      
        let dx01 = x1 - x0, dy01 = y1 - y0, dx02 = x2 - x0, dy02 = y2 - y0,
            dx12 = x2 - x1, dy12 = y2 - y1;
        let sa = 0, sb = 0,
            last = (y1 == y2) ? y1 : (y - 1);
    
        for(y = y0; y <= last; y++) {
            a = Math.floor(x0 + sa / dy01);
            b = Math.floor(x0 + sb / dy02);
            sa += dx01;
            sb += dx02;
            if (a > b)
                [a, b] = [b, a];
            this.drawFastHLine(a, y, b - a + 1, color);
        }
    
        sa = dx12 * (y - y1);
        sb = dx02 * (y - y0);
        for(; y <= y2; y++) {
            a = Math.floor(x1 + sa / dy12);
            b = Math.floor(x0 + sb / dy02);
            sa += dx12;
            sb += dx02;
    
            if (a > b)
                [a, b] = [b, a];
            this.drawFastHLine(a, y, b - a + 1, color);
        }
    }

    // Text
    drawChar(x, y, c, color, bg, size_x, size_y) {
        if(!this.textOptions.gfxFont) {
            if(!DEFAULT_FONT) return;
            if((x >= this.screenWidth) ||
                (y >= this.screenHeight) ||
                ((x + 6 * size_x - 1) < 0) ||
                ((y + 8 * size_y - 1) < 0))
              return;
        
            if(!this.textOptions.cp437 && (c >= 176))
              c++;
    
            for(let i = 0; i < 5; i++) {
                let line = DEFAULT_FONT[c * 5 + i];
                for(let j = 0; j < 8; j++, line >>= 1) {
                    if(line & 1) {
                        if(size_x == 1 && size_y == 1)
                            this.drawPixel(x + i, y + j, color);
                        else
                            this.fillRect(x + i * size_x, y + j * size_y, size_x, size_y, color);
                    } else if(bg != color) {
                        if(size_x == 1 && size_y == 1)
                            this.drawPixel(x + i, y + j, bg);
                        else
                            this.fillRect(x + i * size_x, y + j * size_y, size_x, size_y, bg);
                    }
              }
            }
            if(bg != color) {
                if(size_x == 1 && size_y == 1)
                    this.drawFastVLine(x + 5, y, 8, bg);
                else
                    this.fillRect(x + 5 * size_x, y, size_x, 8 * size_y, bg);
            }
        } else {
            c -= this.textOptions.gfxFont.first;
            let glyph = this.textOptions.gfxFont.glyph[c];
            let bitmap = this.textOptions.gfxFont.bitmap;
    
            let bo = glyph[0]; // glyph.bitmapOffset
            let  w = glyph[1], // glyph.width
                 h = glyph[2]; // glyph.height
            let xo = glyph[4], // glyph.xOffset
                yo = glyph[5]; // glyph.yOffset
            let xx, yy, bits = 0, bit = 0;
            let xo16 = 0, yo16 = 0;
    
            if(size_x > 1 || size_y > 1) {
                xo16 = xo;
                yo16 = yo;
            }
    
            for(yy = 0; yy < h; yy++) {
                for(xx = 0; xx < w; xx++) {
                    if(!(bit++ & 7)) {
                        bits = bitmap[bo++];
                    }
                    if(bits & 0x80) {
                        if(size_x == 1 && size_y == 1) {
                            this.drawPixel(x + xo + xx, y + yo + yy, color);
                        } else {
                            this.fillRect(x + (xo16 + xx) * size_x, y + (yo16 + yy) * size_y,
                                        size_x, size_y, color);
                        }
                    }
                    bits <<= 1;
                }
            }
        }
    }
    printChar(c) {
        c = c.charCodeAt(0);
        if(!this.textOptions.gfxFont) {
            if(c == 10) { // '\n'
                this.textOptions.cursor_x = 0;
                this.textOptions.cursor_y += this.textOptions.textsize_y * 8;
            } else if(c != 13) { // '\r'
                if(this.textOptions.wrap && ((this.textOptions.cursor_x + this.textOptions.textsize_x * 6) > this.screenWidth)) {
                    this.textOptions.cursor_x = 0;
                    this.textOptions.cursor_y += this.textOptions.textsize_y * 8;
                }
                this.drawChar(this.textOptions.cursor_x, this.textOptions.cursor_y, c, this.textOptions.textcolor,
                    this.textOptions.textbgcolor, this.textOptions.textsize_x, this.textOptions.textsize_y);
                    this.textOptions.cursor_x += this.textOptions.textsize_x * 6;
            }
        
        } else {
            if(c == 10) { // '\n'
                cursor_x = 0;
                cursor_y += this.textOptions.textsize_y * this.textOptions.gfxFont.yAdvance;
            } else if(c != 13) { // '\r'
                let first = this.textOptions.gfxFont.first;
                if((c >= first) && (c <= this.textOptions.gfxFont.last)) {
                    let glyph = this.textOptions.gfxFont.glyph[c - first];
                    let w = glyph[1], // glyph.width
                        h = glyph[2]; // glyph.height
                    if((w > 0) && (h > 0)) {
                        let xo = glyph[4]; // glyph.xOffset
                        if(this.textOptions.wrap && ((this.textOptions.cursor_x + this.textOptions.textsize_x * (xo + w)) > this.screenWidth)) {
                            this.textOptions.cursor_x = 0;
                            this.textOptions.cursor_y += this.textOptions.textsize_y * this.textOptions.gfxFont.yAdvance;
                        }
                        this.drawChar(this.textOptions.cursor_x, this.textOptions.cursor_y, c, this.textOptions.textcolor,
                            this.textOptions.textbgcolor, this.textOptions.textsize_x, this.textOptions.textsize_y);
                    }
                    this.textOptions.cursor_x += glyph[3] /* glyph.xAdvance */ * this.textOptions.textsize_x;
                }
            }
        }
    }
    printText(text) {
        for(let c of Array.from(text)) {
            this.printChar(c);
        }
    }
    setCursor(x, y) {
        this.textOptions.cursor_x = x;
        this.textOptions.cursor_y = y;
    }
    setTextSize(s_x, s_y) {
        if(s_y === undefined) s_y = s_x;
        this.textOptions.textsize_x = (s_x > 0) ? s_x : 1;
        this.textOptions.textsize_y = (s_y > 0) ? s_y : 1;
    }
    setTextColor(c, bg) {
        if(bg === undefined) bg = c;
        this.textOptions.textcolor = c;
        this.textOptions.textbgcolor = bg;
    }
    setTextWrap(w) {
        this.textOptions.wrap = w;
    }
    setFont(f) {
        if(f) {
            if(!this.textOptions.gfxFont) {
                this.textOptions.cursor_y += 6;
            }
        } else if(this.textOptions.gfxFont) {
            this.textOptions.cursor_y -= 6;
        }
        this.textOptions.gfxFont = f;
    }
    cp437(x) {
        this.textOptions.cp437 = x;
    }
    charBounds(c, res) {
        c = c.charCodeAt(0);
        if(this.textOptions.gfxFont) {
            if(c == 10) { // '\n'
                res.x = 0;
                res.y += this.textOptions.textsize_y * this.textOptions.gfxFont.yAdvance;
            } else if(c != 13) { // '\r'
                let first = this.textOptions.gfxFont.first,
                    last  = this.textOptions.gfxFont.last;
                if((c >= first) && (c <= last)) {
                    let glyph = this.textOptions.gfxFont.glyph[c - first];;
                    let gw = glyph[1], // glyph.width
                        gh = glyph[2], // glyph.height
                        xa = glyph[3]; // glyph.xAdvance
                    let xo = glyph[4], // glyph.xOffset
                        yo = glyph[5]; // glyph.yOffset
                    if(this.textOptions.wrap && ((res.x + ((xo + gw) * this.textOptions.textsize_x)) > this.screenWidth)) {
                        res.x = 0;
                        res.y += this.textOptions.textsize_y * this.textOptions.gfxFont.yAdvance;
                    }
                    let tsx = this.textOptions.textsize_x, tsy = this.textOptions.textsize_y,
                        x1 = res.x + xo * tsx, y1 = res.y + yo * tsy, x2 = x1 + gw * tsx - 1,
                        y2 = y1 + gh * tsy - 1;
                    if(x1 < res.minx)
                        res.minx = x1;
                    if(y1 < res.miny)
                        res.miny = y1;
                    if(x2 > res.maxx)
                        res.maxx = x2;
                    if(y2 > res.maxy)
                        res.maxy = y2;
                    res.x += xa * tsx;
                }
            }
        } else {
            if(c == 10) { // '\n'
                res.x = 0;
                res.y += this.textOptions.textsize_y * 8;
            } else if(c != 13) { // '\r'
                if(this.textOptions.wrap && ((res.x + this.textOptions.textsize_x * 6) > this.screenWidth)) {
                  res.x = 0;
                  res.y += textsize_y * 8;
                }
                let x2 = res.x + this.textOptions.textsize_x * 6 - 1,
                    y2 = res.y + this.textOptions.textsize_y * 8 - 1;
                if(x2 > res.maxx)
                    res.maxx = x2;
                if(y2 > res.maxy)
                    res.maxy = y2;
                if(res.x < res.minx)
                    res.minx = res.x;
                if(res.y < res.miny)
                    res.miny = res.y;
                res.x += this.textOptions.textsize_x * 6;
            }
        }
    }
    getTextBounds(text, x, y) {
        let res = {
            x, y,
            minx: 0x7FFF,
            miny: 0x7FFF,
            maxx: -1,
            maxy: -1
        };
        let ret = {
            x, y,
            w: 0,
            h: 0
        };
        for(let c of Array.from(text)) {
            this.charBounds(c, res);
        }
    
        if(res.maxx >= res.minx) {
            ret.x = res.minx;
            ret.w = res.maxx - res.minx + 1;
        }
        if(res.maxy >= res.miny) {
            ret.y = res.miny;
            ret.h = res.maxy - res.miny + 1;
        }
        return ret;
    }
    printCenteredText(text, x, y, wc, hc) {
        const bounds = this.getTextBounds(text, x, y);
        if(wc) x += (wc - bounds.w)/2;
        if(hc) {
            if(this.textOptions.gfxFont) {
                y -= (hc - bounds.h)/2;
            } else {
                y += (hc - bounds.h)/2;
            }
        }
        this.setCursor(x, y);
        this.printText(text);
    }

    // Bitmap
    drawBitmap(x, y, bitmap, w, h, color, bg) {
        let byteWidth = Math.floor((w + 7) / 8);
        let b = 0;

        for(let j = 0; j < h; j++, y++) {
            for(let i = 0; i < w; i++) {
                if(i & 7)
                    b <<= 1;
                else 
                    b = bitmap[j * byteWidth + i / 8];
                
                let bit = b & 0x80;
                if(bit || bg)
                    this.drawPixel(x + i, y, bit ? color : bg);
            }
        }
    }
    drawRGBBitmap(x, y, bitmap, w, h) {
        for(let j = 0; j < h; j++, y++) {
            for(let i = 0; i < w; i++) {
                this.drawPixel(x + i, y, bitmap[j * w + i]);
            }
        }
    }
}

const DEFAULT_FONT = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x3E, 0x5B, 0x4F, 0x5B, 0x3E, 0x3E, 0x6B,
    0x4F, 0x6B, 0x3E, 0x1C, 0x3E, 0x7C, 0x3E, 0x1C, 0x18, 0x3C, 0x7E, 0x3C,
    0x18, 0x1C, 0x57, 0x7D, 0x57, 0x1C, 0x1C, 0x5E, 0x7F, 0x5E, 0x1C, 0x00,
    0x18, 0x3C, 0x18, 0x00, 0xFF, 0xE7, 0xC3, 0xE7, 0xFF, 0x00, 0x18, 0x24,
    0x18, 0x00, 0xFF, 0xE7, 0xDB, 0xE7, 0xFF, 0x30, 0x48, 0x3A, 0x06, 0x0E,
    0x26, 0x29, 0x79, 0x29, 0x26, 0x40, 0x7F, 0x05, 0x05, 0x07, 0x40, 0x7F,
    0x05, 0x25, 0x3F, 0x5A, 0x3C, 0xE7, 0x3C, 0x5A, 0x7F, 0x3E, 0x1C, 0x1C,
    0x08, 0x08, 0x1C, 0x1C, 0x3E, 0x7F, 0x14, 0x22, 0x7F, 0x22, 0x14, 0x5F,
    0x5F, 0x00, 0x5F, 0x5F, 0x06, 0x09, 0x7F, 0x01, 0x7F, 0x00, 0x66, 0x89,
    0x95, 0x6A, 0x60, 0x60, 0x60, 0x60, 0x60, 0x94, 0xA2, 0xFF, 0xA2, 0x94,
    0x08, 0x04, 0x7E, 0x04, 0x08, 0x10, 0x20, 0x7E, 0x20, 0x10, 0x08, 0x08,
    0x2A, 0x1C, 0x08, 0x08, 0x1C, 0x2A, 0x08, 0x08, 0x1E, 0x10, 0x10, 0x10,
    0x10, 0x0C, 0x1E, 0x0C, 0x1E, 0x0C, 0x30, 0x38, 0x3E, 0x38, 0x30, 0x06,
    0x0E, 0x3E, 0x0E, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x5F,
    0x00, 0x00, 0x00, 0x07, 0x00, 0x07, 0x00, 0x14, 0x7F, 0x14, 0x7F, 0x14,
    0x24, 0x2A, 0x7F, 0x2A, 0x12, 0x23, 0x13, 0x08, 0x64, 0x62, 0x36, 0x49,
    0x56, 0x20, 0x50, 0x00, 0x08, 0x07, 0x03, 0x00, 0x00, 0x1C, 0x22, 0x41,
    0x00, 0x00, 0x41, 0x22, 0x1C, 0x00, 0x2A, 0x1C, 0x7F, 0x1C, 0x2A, 0x08,
    0x08, 0x3E, 0x08, 0x08, 0x00, 0x80, 0x70, 0x30, 0x00, 0x08, 0x08, 0x08,
    0x08, 0x08, 0x00, 0x00, 0x60, 0x60, 0x00, 0x20, 0x10, 0x08, 0x04, 0x02,
    0x3E, 0x51, 0x49, 0x45, 0x3E, 0x00, 0x42, 0x7F, 0x40, 0x00, 0x72, 0x49,
    0x49, 0x49, 0x46, 0x21, 0x41, 0x49, 0x4D, 0x33, 0x18, 0x14, 0x12, 0x7F,
    0x10, 0x27, 0x45, 0x45, 0x45, 0x39, 0x3C, 0x4A, 0x49, 0x49, 0x31, 0x41,
    0x21, 0x11, 0x09, 0x07, 0x36, 0x49, 0x49, 0x49, 0x36, 0x46, 0x49, 0x49,
    0x29, 0x1E, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x40, 0x34, 0x00, 0x00,
    0x00, 0x08, 0x14, 0x22, 0x41, 0x14, 0x14, 0x14, 0x14, 0x14, 0x00, 0x41,
    0x22, 0x14, 0x08, 0x02, 0x01, 0x59, 0x09, 0x06, 0x3E, 0x41, 0x5D, 0x59,
    0x4E, 0x7C, 0x12, 0x11, 0x12, 0x7C, 0x7F, 0x49, 0x49, 0x49, 0x36, 0x3E,
    0x41, 0x41, 0x41, 0x22, 0x7F, 0x41, 0x41, 0x41, 0x3E, 0x7F, 0x49, 0x49,
    0x49, 0x41, 0x7F, 0x09, 0x09, 0x09, 0x01, 0x3E, 0x41, 0x41, 0x51, 0x73,
    0x7F, 0x08, 0x08, 0x08, 0x7F, 0x00, 0x41, 0x7F, 0x41, 0x00, 0x20, 0x40,
    0x41, 0x3F, 0x01, 0x7F, 0x08, 0x14, 0x22, 0x41, 0x7F, 0x40, 0x40, 0x40,
    0x40, 0x7F, 0x02, 0x1C, 0x02, 0x7F, 0x7F, 0x04, 0x08, 0x10, 0x7F, 0x3E,
    0x41, 0x41, 0x41, 0x3E, 0x7F, 0x09, 0x09, 0x09, 0x06, 0x3E, 0x41, 0x51,
    0x21, 0x5E, 0x7F, 0x09, 0x19, 0x29, 0x46, 0x26, 0x49, 0x49, 0x49, 0x32,
    0x03, 0x01, 0x7F, 0x01, 0x03, 0x3F, 0x40, 0x40, 0x40, 0x3F, 0x1F, 0x20,
    0x40, 0x20, 0x1F, 0x3F, 0x40, 0x38, 0x40, 0x3F, 0x63, 0x14, 0x08, 0x14,
    0x63, 0x03, 0x04, 0x78, 0x04, 0x03, 0x61, 0x59, 0x49, 0x4D, 0x43, 0x00,
    0x7F, 0x41, 0x41, 0x41, 0x02, 0x04, 0x08, 0x10, 0x20, 0x00, 0x41, 0x41,
    0x41, 0x7F, 0x04, 0x02, 0x01, 0x02, 0x04, 0x40, 0x40, 0x40, 0x40, 0x40,
    0x00, 0x03, 0x07, 0x08, 0x00, 0x20, 0x54, 0x54, 0x78, 0x40, 0x7F, 0x28,
    0x44, 0x44, 0x38, 0x38, 0x44, 0x44, 0x44, 0x28, 0x38, 0x44, 0x44, 0x28,
    0x7F, 0x38, 0x54, 0x54, 0x54, 0x18, 0x00, 0x08, 0x7E, 0x09, 0x02, 0x18,
    0xA4, 0xA4, 0x9C, 0x78, 0x7F, 0x08, 0x04, 0x04, 0x78, 0x00, 0x44, 0x7D,
    0x40, 0x00, 0x20, 0x40, 0x40, 0x3D, 0x00, 0x7F, 0x10, 0x28, 0x44, 0x00,
    0x00, 0x41, 0x7F, 0x40, 0x00, 0x7C, 0x04, 0x78, 0x04, 0x78, 0x7C, 0x08,
    0x04, 0x04, 0x78, 0x38, 0x44, 0x44, 0x44, 0x38, 0xFC, 0x18, 0x24, 0x24,
    0x18, 0x18, 0x24, 0x24, 0x18, 0xFC, 0x7C, 0x08, 0x04, 0x04, 0x08, 0x48,
    0x54, 0x54, 0x54, 0x24, 0x04, 0x04, 0x3F, 0x44, 0x24, 0x3C, 0x40, 0x40,
    0x20, 0x7C, 0x1C, 0x20, 0x40, 0x20, 0x1C, 0x3C, 0x40, 0x30, 0x40, 0x3C,
    0x44, 0x28, 0x10, 0x28, 0x44, 0x4C, 0x90, 0x90, 0x90, 0x7C, 0x44, 0x64,
    0x54, 0x4C, 0x44, 0x00, 0x08, 0x36, 0x41, 0x00, 0x00, 0x00, 0x77, 0x00,
    0x00, 0x00, 0x41, 0x36, 0x08, 0x00, 0x02, 0x01, 0x02, 0x04, 0x02, 0x3C,
    0x26, 0x23, 0x26, 0x3C, 0x1E, 0xA1, 0xA1, 0x61, 0x12, 0x3A, 0x40, 0x40,
    0x20, 0x7A, 0x38, 0x54, 0x54, 0x55, 0x59, 0x21, 0x55, 0x55, 0x79, 0x41,
    0x22, 0x54, 0x54, 0x78, 0x42, // a-umlaut
    0x21, 0x55, 0x54, 0x78, 0x40, 0x20, 0x54, 0x55, 0x79, 0x40, 0x0C, 0x1E,
    0x52, 0x72, 0x12, 0x39, 0x55, 0x55, 0x55, 0x59, 0x39, 0x54, 0x54, 0x54,
    0x59, 0x39, 0x55, 0x54, 0x54, 0x58, 0x00, 0x00, 0x45, 0x7C, 0x41, 0x00,
    0x02, 0x45, 0x7D, 0x42, 0x00, 0x01, 0x45, 0x7C, 0x40, 0x7D, 0x12, 0x11,
    0x12, 0x7D, // A-umlaut
    0xF0, 0x28, 0x25, 0x28, 0xF0, 0x7C, 0x54, 0x55, 0x45, 0x00, 0x20, 0x54,
    0x54, 0x7C, 0x54, 0x7C, 0x0A, 0x09, 0x7F, 0x49, 0x32, 0x49, 0x49, 0x49,
    0x32, 0x3A, 0x44, 0x44, 0x44, 0x3A, // o-umlaut
    0x32, 0x4A, 0x48, 0x48, 0x30, 0x3A, 0x41, 0x41, 0x21, 0x7A, 0x3A, 0x42,
    0x40, 0x20, 0x78, 0x00, 0x9D, 0xA0, 0xA0, 0x7D, 0x3D, 0x42, 0x42, 0x42,
    0x3D, // O-umlaut
    0x3D, 0x40, 0x40, 0x40, 0x3D, 0x3C, 0x24, 0xFF, 0x24, 0x24, 0x48, 0x7E,
    0x49, 0x43, 0x66, 0x2B, 0x2F, 0xFC, 0x2F, 0x2B, 0xFF, 0x09, 0x29, 0xF6,
    0x20, 0xC0, 0x88, 0x7E, 0x09, 0x03, 0x20, 0x54, 0x54, 0x79, 0x41, 0x00,
    0x00, 0x44, 0x7D, 0x41, 0x30, 0x48, 0x48, 0x4A, 0x32, 0x38, 0x40, 0x40,
    0x22, 0x7A, 0x00, 0x7A, 0x0A, 0x0A, 0x72, 0x7D, 0x0D, 0x19, 0x31, 0x7D,
    0x26, 0x29, 0x29, 0x2F, 0x28, 0x26, 0x29, 0x29, 0x29, 0x26, 0x30, 0x48,
    0x4D, 0x40, 0x20, 0x38, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08,
    0x38, 0x2F, 0x10, 0xC8, 0xAC, 0xBA, 0x2F, 0x10, 0x28, 0x34, 0xFA, 0x00,
    0x00, 0x7B, 0x00, 0x00, 0x08, 0x14, 0x2A, 0x14, 0x22, 0x22, 0x14, 0x2A,
    0x14, 0x08, 0x55, 0x00, 0x55, 0x00, 0x55, // #176 (25% block) missing in old
                                              // code
    0xAA, 0x55, 0xAA, 0x55, 0xAA,             // 50% block
    0xFF, 0x55, 0xFF, 0x55, 0xFF,             // 75% block
    0x00, 0x00, 0x00, 0xFF, 0x00, 0x10, 0x10, 0x10, 0xFF, 0x00, 0x14, 0x14,
    0x14, 0xFF, 0x00, 0x10, 0x10, 0xFF, 0x00, 0xFF, 0x10, 0x10, 0xF0, 0x10,
    0xF0, 0x14, 0x14, 0x14, 0xFC, 0x00, 0x14, 0x14, 0xF7, 0x00, 0xFF, 0x00,
    0x00, 0xFF, 0x00, 0xFF, 0x14, 0x14, 0xF4, 0x04, 0xFC, 0x14, 0x14, 0x17,
    0x10, 0x1F, 0x10, 0x10, 0x1F, 0x10, 0x1F, 0x14, 0x14, 0x14, 0x1F, 0x00,
    0x10, 0x10, 0x10, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x1F, 0x10, 0x10, 0x10,
    0x10, 0x1F, 0x10, 0x10, 0x10, 0x10, 0xF0, 0x10, 0x00, 0x00, 0x00, 0xFF,
    0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0xFF, 0x10, 0x00,
    0x00, 0x00, 0xFF, 0x14, 0x00, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0x00, 0x1F,
    0x10, 0x17, 0x00, 0x00, 0xFC, 0x04, 0xF4, 0x14, 0x14, 0x17, 0x10, 0x17,
    0x14, 0x14, 0xF4, 0x04, 0xF4, 0x00, 0x00, 0xFF, 0x00, 0xF7, 0x14, 0x14,
    0x14, 0x14, 0x14, 0x14, 0x14, 0xF7, 0x00, 0xF7, 0x14, 0x14, 0x14, 0x17,
    0x14, 0x10, 0x10, 0x1F, 0x10, 0x1F, 0x14, 0x14, 0x14, 0xF4, 0x14, 0x10,
    0x10, 0xF0, 0x10, 0xF0, 0x00, 0x00, 0x1F, 0x10, 0x1F, 0x00, 0x00, 0x00,
    0x1F, 0x14, 0x00, 0x00, 0x00, 0xFC, 0x14, 0x00, 0x00, 0xF0, 0x10, 0xF0,
    0x10, 0x10, 0xFF, 0x10, 0xFF, 0x14, 0x14, 0x14, 0xFF, 0x14, 0x10, 0x10,
    0x10, 0x1F, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x10, 0xFF, 0xFF, 0xFF, 0xFF,
    0xFF, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xFF, 0xFF, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x38, 0x44, 0x44,
    0x38, 0x44, 0xFC, 0x4A, 0x4A, 0x4A, 0x34, // sharp-s or beta
    0x7E, 0x02, 0x02, 0x06, 0x06, 0x02, 0x7E, 0x02, 0x7E, 0x02, 0x63, 0x55,
    0x49, 0x41, 0x63, 0x38, 0x44, 0x44, 0x3C, 0x04, 0x40, 0x7E, 0x20, 0x1E,
    0x20, 0x06, 0x02, 0x7E, 0x02, 0x02, 0x99, 0xA5, 0xE7, 0xA5, 0x99, 0x1C,
    0x2A, 0x49, 0x2A, 0x1C, 0x4C, 0x72, 0x01, 0x72, 0x4C, 0x30, 0x4A, 0x4D,
    0x4D, 0x30, 0x30, 0x48, 0x78, 0x48, 0x30, 0xBC, 0x62, 0x5A, 0x46, 0x3D,
    0x3E, 0x49, 0x49, 0x49, 0x00, 0x7E, 0x01, 0x01, 0x01, 0x7E, 0x2A, 0x2A,
    0x2A, 0x2A, 0x2A, 0x44, 0x44, 0x5F, 0x44, 0x44, 0x40, 0x51, 0x4A, 0x44,
    0x40, 0x40, 0x44, 0x4A, 0x51, 0x40, 0x00, 0x00, 0xFF, 0x01, 0x03, 0xE0,
    0x80, 0xFF, 0x00, 0x00, 0x08, 0x08, 0x6B, 0x6B, 0x08, 0x36, 0x12, 0x36,
    0x24, 0x36, 0x06, 0x0F, 0x09, 0x0F, 0x06, 0x00, 0x00, 0x18, 0x18, 0x00,
    0x00, 0x00, 0x10, 0x10, 0x00, 0x30, 0x40, 0xFF, 0x01, 0x01, 0x00, 0x1F,
    0x01, 0x01, 0x1E, 0x00, 0x19, 0x1D, 0x17, 0x12, 0x00, 0x3C, 0x3C, 0x3C,
    0x3C, 0x00, 0x00, 0x00, 0x00, 0x00 // #255 NBSP
];
Object.freeze(DEFAULT_FONT);
