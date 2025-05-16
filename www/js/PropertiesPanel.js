import { OBJECT_TYPES } from './displayObjects/ObjectTypes.js';
import { Utils } from './Utils.js';

const objectSelect = document.getElementById('pp_objectSelect');
const objectAddBtn = document.getElementById('pp_objectAddBtn');
const objectClearBtn = document.getElementById('pp_objectClearBtn');
const objectList = document.getElementById('pp_objectList');

export class PropertiesPanel {
    displayObjects = [];
    
    constructor(app) {
        this.app = app;
        Object.entries(OBJECT_TYPES).forEach(([id, object]) => {
            const option = document.createElement('option');
            option.innerText = object.name;
            option.value = id;
            objectSelect.appendChild(option);
        });
        objectSelect.addEventListener('change', () => {
            objectAddBtn.disabled = objectSelect.value == '';
        });

        objectAddBtn.addEventListener('click', () => {
            const object = new OBJECT_TYPES[objectSelect.value].class();
            this.addDisplayObject(object);
            this.app.renderPreview();

            const lastElement = objectList.querySelector('.accordion-item:last-of-type .collapse');
            lastElement.addEventListener('shown.bs.collapse', () => {
                objectList.scrollTop = objectList.scrollHeight;
            });
            new bootstrap.Collapse(lastElement).show();
        });

        objectList.addEventListener('change', event => this.handleObjectUpdate(event));
        objectList.addEventListener('keyup', event => this.handleObjectUpdate(event));
        objectList.addEventListener('click', event => {
            const button = event.target;
            if(button.classList.contains('deleteBtn')) {
                const htmlElement = button.parentElement.parentElement.parentElement;
                const objectIndex = this.displayObjects.findIndex(object => object.id == htmlElement.dataset.objId);
                this.displayObjects.splice(objectIndex, 1);
                htmlElement.remove();
                this.app.renderPreview();
            }
        });
        objectClearBtn.addEventListener('click', () => {
            this.clearScreen();
            this.app.renderPreview();
        });

        new Sortable(objectList, {
            animation: 150,
            handle: '.accordion-header',
            draggable: '.accordion-item',
            onEnd: event => {
                const oldIndex = event.oldIndex, newIndex = event.newIndex;
                if(oldIndex == newIndex) return;
                const object = this.displayObjects[oldIndex];
                this.displayObjects.splice(oldIndex, 1);
                this.displayObjects.splice(newIndex, 0, object);
                this.app.renderPreview();
            }
        });
    }

    async handleObjectUpdate(event) {
        // Find associated object
        let propElement = event.target;
        if(event.type == 'keyup' && propElement.type != 'text') return;
        let objectElement = propElement.parentElement.parentElement.parentElement.parentElement;
        if(!objectElement.dataset.objId) objectElement = objectElement.parentElement;
        
        const objectId = objectElement.dataset.objId;
        const propKey = propElement.dataset.key;
        if(objectId == null || propKey == null) return;
        const object = this.displayObjects.find(object => object.id == objectId);

        // Inputs
        let val = null;
        switch(propElement.type) {
            case 'number':
                val = parseInt(propElement.value);
                if(val > propElement.max) propElement.value = propElement.max;
                if(val < propElement.min) propElement.value = propElement.min;
                break;
            case 'checkbox':
                if(propKey == 'corners') {
                    val = 0;
                    for(let element of objectElement.querySelectorAll(`[data-key='${propKey}']`)) {
                        const i = parseInt(element.dataset.bit);
                        val |= (element.checked & 1) << i;
                    }
                } else {
                    val = propElement.checked;
                }
                break;
            case 'color':
                const rgb888 = parseInt(propElement.value.slice(1), 16);
                val = Utils.rgb888ToRgb565(rgb888);
                objectElement.querySelector(`[data-key='${propKey}'][type='text']`).value = '0x'+Utils.formatHex(val, 4);
                break;
            default:
                val = propElement.value;
        }

        // Color code input
        if(propElement.classList.contains('colorCode')) {
            val = parseInt(propElement.value)
            if(val >= 0 && val <= 65535) {
                propElement.classList.remove('is-invalid');
            } else {
                propElement.classList.add('is-invalid');
                return;
            }
            const hexColor = '#'+Utils.formatHex(Utils.rgb565ToRgb888(val), 6);
            objectElement.querySelector(`[data-key='${propKey}'][type='color']`).value = hexColor;
        }
        object[propKey] = val;

        // Bitmaps
        if(object.type == 'bitmap') {
            if(propKey == 'file') {
                const file = event.target.files[0];
                if(!file) return;
                object.filename = file.name;

                await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = async event => {
                        try {
                            const newDimensions = await object.loadImage(event.target.result);
                            objectElement.querySelector('[data-key="width"]').value = newDimensions.width;
                            objectElement.querySelector('[data-key="height"]').value = newDimensions.height;
                        } catch(err) {
                            console.error('Error loading image:', err);
                        }
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
            } else if(object.image && ['height', 'width', 'monochrome'].includes(propKey)) {
                try {
                    const preserveDimension = propKey != 'monochrome' ? propKey : null;
                    const newDimensions = await object.loadImage(null, preserveDimension);
                    if(propKey == 'height') objectElement.querySelector('[data-key="width"]').value = newDimensions.width;
                    if(propKey == 'width') objectElement.querySelector('[data-key="height"]').value = newDimensions.height;
                } catch(err) {
                    console.error('Error loading image:', err);
                }
            }
        }

        // Update title and render
        objectElement.querySelector('.title').setAttribute('style', this.getObjectTitleStyle(object));
        objectElement.querySelector('.title [data-lucide]').style.fill = object.fill ? 'currentColor' : null;
        this.app.renderPreview();
    }

    addDisplayObject(object) {
        this.displayObjects.push(object);
        const objectType = OBJECT_TYPES[object.type];
        let html =
            `<h2 class="accordion-header">
                <button class="accordion-button collapsed title" type="button" data-bs-toggle="collapse" data-bs-target="#displayObj-${object.id}" style="${this.getObjectTitleStyle(object)}">
                    <i data-lucide="${objectType.icon}" ${object.fill ? 'style="fill: currentColor;"' : ''}></i>&nbsp;${objectType.name}
                </button>
            </h2>
            <div id="displayObj-${object.id}" class="accordion-collapse collapse" data-bs-parent="#objectList">
                <div class="accordion-body">`;
        objectType.properties.forEach(prop => {
            html +=
                `<div class="input-group">
                    <div class="input-group-text paramName">${prop.name}</div>
                    ${this.getPropertyHtml(prop, object[prop.key])}
                </div>`;
        });
        html += '<button class="btn btn-sm btn-danger mt-2 deleteBtn"><i data-lucide="trash-2"></i> Delete</button></div></div>';

        const htmlElement = document.createElement('div');
        htmlElement.classList.add('accordion-item');
        htmlElement.dataset.objId = object.id;
        htmlElement.innerHTML = html;
        objectList.appendChild(htmlElement);
        lucide.createIcons({}, htmlElement);
        return object;
    }

    getPropertyHtml(prop, value) {
        switch(prop.type) {
            case 'posX':
            case 'width':
                const maxX = prop.type == 'posX' ? this.app.screenSettings.width-1 : this.app.screenSettings.width;
                return `<input data-key="${prop.key}" class="form-control" type="number" min="0" max="${maxX}" value="${value}">`;
            case 'posY':
            case 'height':
                const maxY = prop.type == 'posY' ? this.app.screenSettings.height-1 : this.app.screenSettings.height;
                return `<input data-key="${prop.key}" class="form-control" type="number" min="0" max="${maxY}" value="${value}">`;
            case 'color':
                const rgb888 = Utils.formatHex(Utils.rgb565ToRgb888(value), 6);
                const rgb565 = Utils.formatHex(value, 4);
                return `<input data-key="${prop.key}" class="form-control form-control-color" type="color" value="#${rgb888}">
                        <input data-key="${prop.key}" class="form-control colorCode" type="text" placeholder="0xFFFF" value="0x${rgb565}" title="16bit RGB565 color, to enter regular 24bit color codes use the color picker">`;
            case 'int':
                return `<input data-key="${prop.key}" class="form-control" type="number" min="0" max="100" value="${value}">`;
            case 'bool':
                return `<div class="input-group-text bg-white flex-grow-1"><input data-key="${prop.key}" class="form-check-input" type="checkbox" ${value ? 'checked' : ''}></div>`;
            case 'font':
                const options = Object.keys(window.GFX_FONTS).map(font =>
                    `<option value="${font}" ${font == value ? 'selected' : ''}>${font}</option>`
                ).join('');
                return `<select data-key="${prop.key}" class="form-select"><option value="">Default</option>${options}</select>`;
            case 'text':
                return `<input data-key="${prop.key}" class="form-control" type="text" value="${value}">`;
            case 'image':
                return `<input data-key="${prop.key}" class="form-control hide-button" type="file" value="${value}">`;
            case 'corners':
                return `<div class="input-group-text bg-white flex-grow-1">
                            <i data-lucide="circle-arrow-out-up-left" class="icon-default me-1"></i><input data-key="${prop.key}" data-bit="0" class="form-check-input me-4" title="Top Left" type="checkbox" ${((value >> 0) & 1) ? 'checked' : ''}>
                            <i data-lucide="circle-arrow-out-up-right" class="icon-default me-1"></i><input data-key="${prop.key}" data-bit="1" class="form-check-input me-4" title="Top Right" type="checkbox" ${((value >> 1) & 1) ? 'checked' : ''}>
                            <i data-lucide="circle-arrow-out-down-left" class="icon-default me-1"></i><input data-key="${prop.key}" data-bit="3" class="form-check-input me-4" title="Bottom Left" type="checkbox" ${((value >> 3) & 1) ? 'checked' : ''}>
                            <i data-lucide="circle-arrow-out-down-right" class="icon-default me-1"></i><input data-key="${prop.key}" data-bit="2" class="form-check-input" title="Bottom Right" type="checkbox" ${((value >> 2) & 1) ? 'checked' : ''}>
                        </div>`;
        }
    }

    getObjectTitleStyle(object) {
        let style = '';
        if(object.color) style += `color: #${Utils.formatHex(Utils.rgb565ToRgb888(object.color), 6)};`;
        if(object.fill) style += 'font-weight: bold;';
        return style;
    }

    clearScreen() {
        this.displayObjects = [];
        objectList.innerHTML = '';
    }
}
