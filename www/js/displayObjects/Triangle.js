import { DisplayObject } from './DisplayObject.js';

export class Triangle extends DisplayObject {
    constructor(x0, y0, x1, y1, x2, y2, color, fill) {
        super('triangle');
        this.x0 = x0 || 20;
        this.y0 = y0 || 0;
        this.x1 = x1 || 0;
        this.y1 = y1 || 40;
        this.x2 = x2 || 40;
        this.y2 = y2 || 40;
        this.color = color || 0xF800;
        this.fill = fill || false;
    }

    draw(gfx) {
        const drawMethod = this.fill ? gfx.fillTriangle.bind(gfx) : gfx.drawTriangle.bind(gfx);
        drawMethod(this.x0, this.y0, this.x1, this.y1, this.x2, this.y2, this.color);
    }

    toCode(gfxName) {
        const color = this.formatHex(this.color, 4);
        const type = this.fill ? 'fill' : 'draw';
        return this.formatMethod(gfxName, type+'Triangle', [this.x0, this.y0, this.x1, this.y1, this.x2, this.y2, color]);
    }
}
