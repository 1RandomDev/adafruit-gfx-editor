import { DisplayObject } from './DisplayObject.js';

export class Circle extends DisplayObject {
    constructor(x, y, radius, color, fill, corners) {
        super('circle');
        this.x = x || 20;
        this.y = y || 20;
        this.radius = radius || 20;
        this.color = color || 0xF800;
        this.fill = fill || false;
        this.corners = corners || 0b1111;
    }

    draw(gfx) {
        if(this.corners == 0b1111) {
            const drawMethod = this.fill ? gfx.fillCircle.bind(gfx) : gfx.drawCircle.bind(gfx);
            drawMethod(this.x, this.y, this.radius, this.color);
        } else {
            const drawMethod = this.fill ? gfx.fillCircleHelper2.bind(gfx) : gfx.drawCircleHelper.bind(gfx);
            drawMethod(this.x, this.y, this.radius, this.corners, this.color);
        }
    }

    toCode(gfxName) {
        const color = this.formatHex(this.color, 4);
        if(this.corners == 0b1111) {
            const type = this.fill ? 'fill' : 'draw';
            return this.formatMethod(gfxName, type+'Circle', [this.x, this.y, this.radius, color]);
        } else {
            const corners = '0b'+this.corners.toString(2).padStart(4, '0');
            if(this.fill) {
                let code = this.formatMethod(null, 'fillCircleHelper2', [gfxName, this.x, this.y, this.radius, corners, color]);
                code += ' <span class="hl-comment">// Custom Method</span>'; // TODO: Add link
                return code;
            } else {
                return this.formatMethod(gfxName, 'drawCircleHelper', [this.x, this.y, this.radius, corners, color]);
            }
        }
    }

    toDisplayCommand() {
        return {
            t: this.type,
            x: this.x,
            y: this.y,
            r: this.radius,
            c: this.color,
            f: this.fill,
            co: this.corners
        };
    }
}
