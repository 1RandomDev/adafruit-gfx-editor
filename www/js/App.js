import { OBJECT_TYPES } from './displayObjects/ObjectTypes.js';
import { PropertiesPanel } from './PropertiesPanel.js';
import { ScreenSettings } from './ScreenSettings.js';
import { Text } from './displayObjects/Text.js';
import { GFX } from './GFX.js';
import { Utils } from './Utils.js';

// Init Bootstrap tooltips and Lucide icons
lucide.createIcons();
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
[...tooltipTriggerList].forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
        
const previewScreen = document.getElementById('previewScreen');

class App {
    constructor() {
        this.propPanel = new PropertiesPanel(this);
        this.screenSettings = new ScreenSettings(this);
        this.ctx = previewScreen.getContext("2d");
        this.gfx = new GFX(this.ctx, this.screenSettings.width, this.screenSettings.height);

        if(window.electronAPI) this.initDesktopAppFeatures();
        Utils.makeDraggable(previewScreen);
        this.initCodeGeneration();
        this.initSaveAndRestore();
        this.scalePreview()
        this.renderPreview();
    }

    renderPreview() {
        this.gfx.fillScreen(0x0000);
        for(let object of this.propPanel.displayObjects) {
            object.draw(this.gfx);
        }
    }
    scalePreview() {
        this.gfx.setDimensions(this.screenSettings.width, this.screenSettings.height);
        this.gfx.setScale(this.screenSettings.previewScale);
        this.ctx.canvas.width = this.screenSettings.width * this.screenSettings.previewScale;
        this.ctx.canvas.height = this.screenSettings.height * this.screenSettings.previewScale;
    }

    initSaveAndRestore() {
        document.getElementById('saveViewBtn').addEventListener('click', () => {
            const time = new Date().toISOString().substring(11, 19).replace(/:/g, '_');
            Utils.downloadFile(this.exportState(), `gfx-editor-${time}.json`, 'application/json');
        });
        document.getElementById('loadViewBtn').addEventListener('click', () => {
            Utils.requestFileUpload(content => {
                try {
                    this.importState(content);
                    this.renderPreview();
                    Utils.showToast({ message: 'Settings successfully loaded', type: 'success' });
                } catch(err) {
                    Utils.showToast({ message: 'Settings could not be loaded', type: 'danger' });
                }
            }, 'application/json');
        });
        document.getElementById('saveSessionModal').addEventListener('show.bs.modal', event => {
            if(localStorage.getItem('gfx_editor-hideSaveWarning') == 'true') {
                event.preventDefault();
                localStorage.setItem('gfx_editor-save', this.exportState());
                Utils.showToast({ message: 'Settings saved in browser storage', type: 'success' });
            }
        });
        document.getElementById('saveSessionBtn').addEventListener('click', () => {
            if(document.getElementById('saveSessionHideWarning').checked) {
                localStorage.setItem('gfx_editor-hideSaveWarning', 'true');
            }
            localStorage.setItem('gfx_editor-save', this.exportState());
            Utils.showToast({ message: 'Settings saved in browser storage', type: 'success' });
        });

        const localSave = localStorage.getItem('gfx_editor-save');
        if(localSave) {
            try {
                this.importState(localSave);
                Utils.showToast({ message: 'Previous session restored from browser storage', type: 'success' });
            } catch(err) {
                console.error('Error importing state:', err);
            }
        }
    }
    importState(save) {
        save = JSON.parse(save);
        this.propPanel.clearScreen();
        this.screenSettings.fromJson(save.screenSettings);
        for(let saveObject of save.objects) {
            const object = new OBJECT_TYPES[saveObject.type].class();
            object.fromJson(saveObject);
            this.propPanel.addDisplayObject(object);
        }
        this.scalePreview();
    }
    exportState() {
        const saveObjects = [];
        for(let object of this.propPanel.displayObjects) {
            saveObjects.push(object.toJson());
        }
        return JSON.stringify({
            screenSettings: this.screenSettings.toJson(),
            objects: saveObjects
        });
    }

    initDesktopAppFeatures() {
        const sendViaMqttBtn = document.getElementById('sendViaMqttBtn');
        sendViaMqttBtn.classList.remove('disabled');
        bootstrap.Tooltip.getInstance(sendViaMqttBtn.parentElement).dispose();
        sendViaMqttBtn.addEventListener('click', async () => {
            await window.electronAPI.sendDisplayCommands(this.generateDisplayCommands());
            Utils.showToast({ message: 'Current view sent to display', type: 'success' });
        });
    }

    initCodeGeneration() {
        const generateCodeModal = document.getElementById('generateCodeModal');
        generateCodeModal.addEventListener('show.bs.modal', event => {
            const codeSnippets = this.generateArduinoCode();
            event.target.querySelector('.headerWindow').innerHTML = codeSnippets.header || '<span class="hl-comment">// No constants needed</span>';
            event.target.querySelector('.codeWindow').innerHTML = codeSnippets.code || '<span class="hl-comment">// No objects to draw</span>';
        });

        Utils.makeCopyButton(generateCodeModal.querySelector('.copyBtnHeader'), generateCodeModal.querySelector('.headerWindow'));
        Utils.makeCopyButton(generateCodeModal.querySelector('.copyBtnCode'), generateCodeModal.querySelector('.codeWindow'));
    }
    generateArduinoCode() {
        Text.lastProperties = {};
        let codeSnippets = {header: '', code: ''};
        for(let object of this.propPanel.displayObjects) {
            const res = object.toCode(this.screenSettings.gfxName);
            if(typeof res == 'object') {
                codeSnippets.header += `${res.header}<br>`;
                codeSnippets.code += `${res.code}<br>`;
            } else {
                codeSnippets.code += `${res}<br>`;
            }
        }
        return codeSnippets;
    }
    generateDisplayCommands() {
        Text.lastProperties = {};
        return this.propPanel.displayObjects.map(object => object.toDisplayCommand());
    }
}
window.app = new App();
