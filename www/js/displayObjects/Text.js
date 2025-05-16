import { DisplayObject } from './DisplayObject.js';

export class Text extends DisplayObject {
    static lastProperties = {};

    constructor(x, y, fontSize, font, content, color) {
        super('text');
        this.x = x || 0;
        this.y = y || 10;
        this.fontSize = fontSize || 1;
        this.font = font || '';
        this.content = content || 'New Text';
        this.color = color || 0xF800;
    }

    draw(gfx) {
        gfx.setFont(window.GFX_FONTS[this.f]);
        gfx.setTextSize(this.fontSize);
        gfx.setTextColor(this.color);
        gfx.setCursor(this.x, this.y);
        gfx.printText(this.content);
    }

    toCode(gfxName) {
        let code = '';

        // Try optimizing the code and leaving out parameters that has not changed
        if(this.font != Text.lastProperties.font) {
            Text.lastProperties.font = this.font;
            code += this.formatMethod(gfxName, 'setFont', [this.font ? '&'+this.font : 'NULL'])+'<br>';
        }
        if(this.fontSize != Text.lastProperties.size) {
            Text.lastProperties.size = this.fontSize;
            code += this.formatMethod(gfxName, 'setTextSize', [this.fontSize])+'<br>';
        }
        if(this.color != Text.lastProperties.color) {
            Text.lastProperties.color = this.color;
            code += this.formatMethod(gfxName, 'setTextColor', [this.formatHex(this.color, 4)])+'<br>';
        }

        code += this.formatMethod(gfxName, 'setCursor', [this.x, this.y])+'<br>';
        code += this.formatMethod(gfxName, 'printText', [`"${this.escapeHTML(this.content)}"`]);
        return code;
    }

    toDisplayCommand() {
        const cmd = {
            t: this.type,
            x: this.x,
            y: this.y,
            co: this.content
        };

        // Try optimizing the code and leaving out parameters that has not changed
        if(this.font != Text.lastProperties.font) {
            Text.lastProperties.font = this.font;
            cmd.f = this.font;
        }
        if(this.fontSize != Text.lastProperties.size) {
            Text.lastProperties.size = this.fontSize;
            cmd.s = this.fontSize;
        }
        if(this.color != Text.lastProperties.color) {
            Text.lastProperties.color = this.color;
            cmd.c = this.color;
        }

        return cmd;
    }
}
