import { DisplayObject } from './DisplayObject.js';

export class Line extends DisplayObject {
    constructor(x0, y0, x1, y1, color) {
        super('line');
        this.x0 = x0 || 0;
        this.y0 = y0 || 0;
        this.x1 = x1 || 40;
        this.y1 = y1 || 40;
        this.color = color || 0xF800;
    }

    draw(gfx) {
        gfx.drawLine(this.x0, this.y0, this.x1, this.y1, this.color);
    }

    toCode(gfxName) {
        const color = this.formatHex(this.color, 4);
        return this.formatMethod(gfxName, 'drawLine', [this.x0, this.y0, this.x1, this.y1, color]);
    }

    toDisplayCommand() {
        return {
            t: this.type,
            x0: this.x0,
            y0: this.y0,
            x1: this.x1,
            y1: this.y1,
            c: this.color
        };
    }
}
