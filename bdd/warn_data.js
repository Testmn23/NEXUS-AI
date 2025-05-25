const fs = require('fs');
const path = require('path');

const warnDataPath = path.join(__dirname, '../xmd/warn_data.json');

/**
 * Loads warning data from warn_data.json.
 * @returns {object} The parsed JSON data or an empty object if an error occurs.
 */
function loadWarnData() {
    try {
        if (fs.existsSync(warnDataPath)) {
            const fileContent = fs.readFileSync(warnDataPath, 'utf-8');
            return JSON.parse(fileContent);
        }
        return {}; // Return empty object if file doesn't exist
    } catch (error) {
        console.error('Error loading or parsing warn_data.json:', error);
        return {}; // Return empty object in case of any error
    }
}

/**
 * Saves warning data to warn_data.json.
 * @param {object} data The data to save.
 */
function saveWarnData(data) {
    try {
        fs.writeFileSync(warnDataPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving warn_data.json:', error);
    }
}

/**
 * Adds a warning for a user in a specific group.
 * @param {string} groupId The ID of the group.
 * @param {string} userId The ID of the user.
 * @param {string} reason The reason for the warning.
 * @returns {number} The new warning count for the user in that group.
 */
function addWarning(groupId, userId, reason) {
    const data = loadWarnData();
    const timestamp = new Date().toISOString();

    if (!data[groupId]) {
        data[groupId] = {};
    }
    if (!data[groupId][userId]) {
        data[groupId][userId] = [];
    }

    data[groupId][userId].push({ reason, timestamp });
    saveWarnData(data);
    return data[groupId][userId].length;
}

/**
 * Retrieves warnings for a user in a specific group.
 * @param {string} groupId The ID of the group.
 * @param {string} userId The ID of the user.
 * @returns {object} An object { count: N, details: [{reason, timestamp}, ...] }.
 */
function getWarnings(groupId, userId) {
    const data = loadWarnData();
    if (data[groupId] && data[groupId][userId]) {
        return {
            count: data[groupId][userId].length,
            details: data[groupId][userId]
        };
    }
    return { count: 0, details: [] };
}

/**
 * Clears all warnings for a user in a specific group.
 * @param {string} groupId The ID of the group.
 * @param {string} userId The ID of the user.
 * @returns {boolean} True if warnings were cleared, false otherwise.
 */
function clearWarnings(groupId, userId) {
    const data = loadWarnData();
    if (data[groupId] && data[groupId][userId] && data[groupId][userId].length > 0) {
        delete data[groupId][userId]; // Or set to [] if you prefer to keep the user entry
        // If the group becomes empty after deleting the user's warnings, optionally delete the group
        if (Object.keys(data[groupId]).length === 0) {
            delete data[groupId];
        }
        saveWarnData(data);
        return true;
    }
    return false;
}

module.exports = {
    loadWarnData,
    saveWarnData,
    addWarning,
    getWarnings,
    clearWarnings,
};
