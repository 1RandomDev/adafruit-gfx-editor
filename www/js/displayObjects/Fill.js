import { DisplayObject } from './DisplayObject.js';

export class Fill extends DisplayObject {
    constructor(color) {
        super('fill');
        this.color = color || 0x0000;
    }

    draw(gfx) {
        gfx.fillScreen(this.color);
    }

    toCode(gfxName) {
        const color = this.formatHex(this.color, 4);
        return this.formatMethod(gfxName, 'fillScreen', [color]);
    }
}
