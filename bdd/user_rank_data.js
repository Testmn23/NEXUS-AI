const fs = require('fs');
const path = require('path');

const userRanksFilePath = path.join(__dirname, '../xmd/user_ranks.json');

/**
 * Loads user rank data from user_ranks.json.
 * @returns {object} The parsed JSON data or an empty object if an error occurs.
 */
function loadRankData() {
    try {
        if (fs.existsSync(userRanksFilePath)) {
            const fileContent = fs.readFileSync(userRanksFilePath, 'utf-8');
            // Handle empty file case, which is valid JSON but results in null for JSON.parse('')
            if (fileContent.trim() === '') {
                return {};
            }
            return JSON.parse(fileContent);
        }
        return {}; // Return empty object if file doesn't exist
    } catch (error) {
        console.error('Error loading or parsing user_ranks.json:', error);
        return {}; // Return empty object in case of any error
    }
}

/**
 * Saves user rank data to user_ranks.json.
 * @param {object} data The data to save.
 */
function saveRankData(data) {
    try {
        fs.writeFileSync(userRanksFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving user_ranks.json:', error);
    }
}

/**
 * Increments user activity (XP and message count) in a specific group.
 * @param {string} groupId The ID of the group.
 * @param {string} userId The ID of the user.
 * @param {number} xpAmount The amount of XP to add.
 */
function incrementUserActivity(groupId, userId, xpAmount) {
    const data = loadRankData();

    if (!data[groupId]) {
        data[groupId] = {};
    }
    if (!data[groupId][userId]) {
        data[groupId][userId] = { xp: 0, messages: 0 };
    }

    data[groupId][userId].xp += xpAmount;
    data[groupId][userId].messages += 1;

    saveRankData(data);
}

/**
 * Retrieves statistics (XP and message count) for a user in a specific group.
 * @param {string} groupId The ID of the group.
 * @param {string} userId The ID of the user.
 * @returns {object} An object { xp: N, messages: M } or { xp: 0, messages: 0 } if not found.
 */
function getUserStats(groupId, userId) {
    const data = loadRankData();
    return data[groupId]?.[userId] || { xp: 0, messages: 0 };
}

/**
 * Retrieves the top users in a specific group based on XP.
 * @param {string} groupId The ID of the group.
 * @param {number} [count=10] The number of top users to retrieve.
 * @returns {Array<object>} An array of objects, e.g., [{ userId, xp, messages }, ...].
 */
function getTopUsers(groupId, count = 10) {
    const data = loadRankData();

    if (!data[groupId]) {
        return [];
    }

    const usersInGroup = Object.entries(data[groupId]); // [ [userId, stats], ... ]

    const sortedUsers = usersInGroup.sort(([, statsA], [, statsB]) => statsB.xp - statsA.xp);

    return sortedUsers.slice(0, count).map(([userId, stats]) => ({
        userId,
        xp: stats.xp,
        messages: stats.messages,
    }));
}

module.exports = {
    loadRankData,
    saveRankData,
    incrementUserActivity,
    getUserStats,
    getTopUsers,
};
