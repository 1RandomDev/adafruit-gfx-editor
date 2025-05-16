import { DisplayObject } from './DisplayObject.js';

export class Rectangle extends DisplayObject {
    constructor(x, y, width, height, radius, color, fill) {
        super('rect');
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 40;
        this.height = height || 40;
        this.radius = radius || 0;
        this.fill = fill || false;
        this.color = color || 0xF800;
    }

    draw(gfx) {
        if(this.radius > 0) {
            const drawMethod = this.fill ? gfx.fillRoundRect.bind(gfx) : gfx.drawRoundRect.bind(gfx);
            drawMethod(this.x, this.y, this.width, this.height, this.radius, this.color);
        } else {
            const drawMethod = this.fill ? gfx.fillRect.bind(gfx) : gfx.drawRect.bind(gfx);
            drawMethod(this.x, this.y, this.width, this.height, this.color);
        }
    }

    toCode(gfxName) {
        const color = this.formatHex(this.color, 4);
        const type = this.fill ? 'fill' : 'draw';
        if(this.radius > 0) {
            return this.formatMethod(gfxName, type+'RoundRect', [this.x, this.y, this.width, this.height, this.radius, color]);
        } else {
            return this.formatMethod(gfxName, type+'Rect', [this.x, this.y, this.width, this.height, color]);
        }
    }
}
