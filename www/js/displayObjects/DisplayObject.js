export class DisplayObject {
    static nextId = 0;
    id = DisplayObject.nextId++;

    constructor(type) {
        this.type = type;
    }

    fromJson(json) {
        Object.assign(this, json);
    }
    toJson() {
        const {id, ...json} = this;
        return json;
    }

    formatHex(val, length) {
        return '0x'+val.toString(16).toUpperCase().padStart(length, '0');
    }
    formatMethod(instanceName, methodName, args) {
        args = args.map(arg => `<span class="hl-arg">${arg}</span>`).join(', ');
        let instance = instanceName != null ? `<span class="hl-instance">${instanceName}</span>.` : '';
        return instance+`<span class="hl-method">${methodName}</span>(${args});`;
    }
    escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    filenameToVarname(name) {
        return name.replace(/\..+$/, '').replace(/[^\w_]/g, '_');
    }
}
