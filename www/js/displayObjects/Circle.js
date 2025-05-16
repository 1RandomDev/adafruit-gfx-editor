import { DisplayObject } from './DisplayObject.js';

export class Circle extends DisplayObject {
    constructor(x, y, radius, color, fill) {
        super('circle');
        this.x = x || 20;
        this.y = y || 20;
        this.radius = radius || 20;
        this.color = color || 0xF800;
        this.fill = fill || false;
    }

    draw(gfx) {
        if(this.corners) {
            if(this.fill) {
                gfx.fillCircleHelper(this.x, this.y, this.radius, this.corners, this.delta || 0, this.color);
            } else {
                gfx.drawCircleHelper(this.x, this.y, this.radius, this.corners, this.color);
            }
        } else {
            const drawMethod = this.fill ? gfx.fillCircle.bind(gfx) : gfx.drawCircle.bind(gfx);
            drawMethod(this.x, this.y, this.radius, this.color);
        }
    }

    toCode(gfxName) {
        const color = this.formatHex(this.color, 4);
        if (this.corners) {
            if(this.fill) {
                return this.formatMethod(gfxName, 'fillCircleHelper', [this.x, this.y, this.radius, this.corners, this.delta, color]);
            } else {
                return this.formatMethod(gfxName, 'drawCircleHelper', [this.x, this.y, this.radius, this.corners, color]);
            }
        } else {
            const type = this.fill ? 'fill' : 'draw';
            return this.formatMethod(gfxName, type+'Circle', [this.x, this.y, this.radius, color]);
        }
    }
}
