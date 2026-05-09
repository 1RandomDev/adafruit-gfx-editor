const appSettingsForm = document.getElementById('appSettingsForm');
const appSettingsBtn = document.getElementById('appSettingsBtn');

export class AppSettings {
    mqttHost = '';
    mqttPort = 1883;
    mqttUsername = '';
    mqttPassword = '';

    constructor() {
        this.loadSettings();
        appSettingsBtn.classList.remove('d-none');

        appSettingsForm.addEventListener('submit', async event => {
            event.preventDefault();
            if(!event.target.checkValidity()) return;
            const formData = new FormData(event.target);
            this.mqttHost = formData.get('mqttHost');
            this.mqttPort  = parseInt(formData.get('mqttPort')) || 1883;
            this.mqttUsername = formData.get('mqttUsername');
            this.mqttPassword = formData.get('mqttPassword');
            this.saveSettings();
        });
        appSettingsForm.addEventListener('input', event => {
            appSettingsForm.querySelector('button[type="submit"]').disabled = !appSettingsForm.checkValidity();
        });
    }

    initSettingsDropdown() {
        const mqttHostField = appSettingsForm.querySelector('input[name="mqttHost"]');
        mqttHostField.value = this.mqttHost;

        const mqttPortField = appSettingsForm.querySelector('input[name="mqttPort"]');
        mqttPortField.value = this.mqttPort;

        const mqttUsernameField = appSettingsForm.querySelector('input[name="mqttUsername"]');
        mqttUsernameField.value = this.mqttUsername;

        const mqttPasswordField = appSettingsForm.querySelector('input[name="mqttPassword"]');
        mqttPasswordField.value = this.mqttPassword;
    }

    async loadSettings() {
        this.fromJson(await window.electronAPI.getSettings());
    }
    saveSettings() {
        window.electronAPI.saveSettings(this.toJson());
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
