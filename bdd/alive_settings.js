const fs = require('fs');
const path = require('path');

const aliveSettingsPath = path.join(__dirname, '../xmd/alive_settings.json');

const defaultSettings = {
    message: "👋 Bot is alive!",
    lien: "",
    show_uptime: true,
    show_owner: true,
    owner_name_override: ""
};

/**
 * Loads alive command settings from alive_settings.json.
 * @returns {object} The parsed JSON data merged with defaults.
 */
function loadAliveSettings() {
    try {
        if (fs.existsSync(aliveSettingsPath)) {
            const fileContent = fs.readFileSync(aliveSettingsPath, 'utf-8');
            const parsedSettings = JSON.parse(fileContent);
            // Ensure all default keys are present
            return { ...defaultSettings, ...parsedSettings };
        }
        // If file doesn't exist, save and return default settings
        fs.writeFileSync(aliveSettingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
        return { ...defaultSettings };
    } catch (error) {
        console.error('Error loading or parsing alive_settings.json:', error);
        // In case of error (e.g., malformed JSON), try to save defaults and return them
        try {
            fs.writeFileSync(aliveSettingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
        } catch (saveError) {
            console.error('Failed to save default settings after load error:', saveError);
        }
        return { ...defaultSettings }; // Return a copy of default settings
    }
}

/**
 * Updates alive command settings in alive_settings.json.
 * @param {object} newSettings The settings to update.
 */
function updateAliveSettings(newSettings) {
    try {
        const currentSettings = loadAliveSettings(); // This ensures defaults are loaded if file was missing/corrupt
        const mergedSettings = { ...currentSettings, ...newSettings };
        fs.writeFileSync(aliveSettingsPath, JSON.stringify(mergedSettings, null, 2), 'utf-8');
        console.log('Alive settings updated successfully.');
        return true;
    } catch (error) {
        console.error('Error updating alive_settings.json:', error);
        return false;
    }
}

module.exports = {
    loadAliveSettings,
    updateAliveSettings,
    defaultSettings // Exporting default settings can be useful for 'reset' or reference
};
