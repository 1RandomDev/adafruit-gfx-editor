const screenSettingsForm = document.getElementById('screenSettingsForm');
const previewScaleSlider = document.getElementById('previewScale');
const previewContainer = document.getElementById('previewContainer');

export class ScreenSettings {
    previewScale = 1;
    height = 240;
    width = 240;
    gfxName = 'gfx';

    constructor(app) {
        this.app = app;
        this.initSettingsDropdown();

        screenSettingsForm.addEventListener('submit', event => {
            event.preventDefault();
            if(!event.target.checkValidity()) return;
            const formData = new FormData(event.target);
            this.gfxName = formData.get('gfxName') || this.gfxName;
            this.width  = parseInt(formData.get('width')) || this.width;
            this.height = parseInt(formData.get('height')) || this.height;
            this.app.scalePreview();
            this.app.renderPreview();
        });
        screenSettingsForm.addEventListener('input', event => {
            screenSettingsForm.querySelector('button[type="submit"]').disabled = !screenSettingsForm.checkValidity();
        });

        previewScaleSlider.addEventListener('input', () => {
            this.previewScale = parseInt(previewScaleSlider.value);
            this.app.scalePreview();
            this.app.renderPreview();
        });

        previewContainer.addEventListener('wheel', event => {
            event.preventDefault();
            if(event.deltaY < 0) {
                this.previewScale++;
                if(this.previewScale > 15) this.previewScale = 15;
            } else {
                this.previewScale--;
                if(this.previewScale < 1) this.previewScale = 1;
            }
            previewScaleSlider.value = this.previewScale;
            this.app.scalePreview();
            this.app.renderPreview();
        });
    }

    initSettingsDropdown() {
        previewScaleSlider.value = this.previewScale;

        const gfxNameField = screenSettingsForm.querySelector('input[name="gfxName"]');
        gfxNameField.value = gfxNameField.placeholder = this.gfxName;

        const widthField = screenSettingsForm.querySelector('input[name="width"]');
        widthField.value = widthField.placeholder = this.width;

        const heightField = screenSettingsForm.querySelector('input[name="height"]');
        heightField.value = heightField.placeholder = this.height;
    }

    fromJson(json) {
        Object.assign(this, json);
        this.initSettingsDropdown();
    }
    toJson() {
        const {app, ...json} = this;
        return json;
    }
}
