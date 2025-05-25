// lib/rank_utils.js

const levels = [
    { minXp: 0, roleName: "Newborn" },
    { minXp: 100, roleName: "Bronze I" },
    { minXp: 250, roleName: "Bronze II" },
    { minXp: 500, roleName: "Silver I" },
    { minXp: 1000, roleName: "Silver II" },
    { minXp: 2000, roleName: "Gold I" },
    { minXp: 3500, roleName: "Gold II" },
    { minXp: 5000, roleName: "Platinum" },
    { minXp: 7500, roleName: "Diamond" },
    { minXp: 10000, roleName: "Master" },
    { minXp: 15000, roleName: "Legend" },
    { minXp: 25000, roleName: "Divinity" }
];

/**
 * Calculates user's level, role, and XP progress based on their current total XP.
 * @param {number} currentXp The user's total accumulated XP.
 * @returns {object} An object containing level details.
 */
function get_level_exp(currentXp) {
    if (currentXp < 0) currentXp = 0; // Sanitize negative XP

    let currentLevelIndex = 0;
    let currentLevelRole = levels[0].roleName;
    let xpForCurrentLevelBoundary = levels[0].minXp;
    let xpForNextLevelBoundary = Infinity;
    
    for (let i = levels.length - 1; i >= 0; i--) {
        if (currentXp >= levels[i].minXp) {
            currentLevelIndex = i;
            currentLevelRole = levels[i].roleName;
            xpForCurrentLevelBoundary = levels[i].minXp;
            if (i + 1 < levels.length) {
                xpForNextLevelBoundary = levels[i + 1].minXp;
            } else {
                // Highest level reached
                xpForNextLevelBoundary = levels[i].minXp; // Or Infinity, but current minXp makes progress bar full
            }
            break;
        }
    }

    const currentXpInLevel = currentXp - xpForCurrentLevelBoundary;
    let totalXpForCurrentLevelBar;

    if (currentLevelIndex === levels.length - 1) { // Highest level
        // For the highest level, the "bar" can be considered full or just show current XP.
        // If we want the bar to be full, totalXpForCurrentLevelBar = currentXpInLevel.
        // If we want it to show progression within the "Divinity" rank itself (conceptually),
        // we might need a maxXP for Divinity or make it a very large number.
        // For simplicity, let's say the bar is full once you reach Divinity.
        totalXpForCurrentLevelBar = currentXpInLevel > 0 ? currentXpInLevel : 1; // Avoid division by zero if 0 XP in level
        // And xpForNextLevelBoundary is effectively the current level's minXp, so currentXpInLevel is total.
        xpForNextLevelBoundary = xpForCurrentLevelBoundary; // No "next" level boundary in terms of different minXp
    } else {
        totalXpForCurrentLevelBar = xpForNextLevelBoundary - xpForCurrentLevelBoundary;
    }
     // Ensure totalXpForCurrentLevelBar is not zero to prevent division by zero if progress is calculated as percentage
    if (totalXpForCurrentLevelBar === 0 && currentLevelIndex === levels.length - 1) {
         totalXpForCurrentLevelBar = currentXpInLevel > 0 ? currentXpInLevel : 1; // For highest level, bar is full
    } else if (totalXpForCurrentLevelBar === 0) {
        totalXpForCurrentLevelBar = 1; // Avoid division by zero for other levels if misconfigured
    }


    return {
        level: currentLevelIndex,
        role: currentLevelRole,
        currentXpInLevel: currentXpInLevel,
        xpLimitForNextLevel: xpForNextLevelBoundary, // This is the minXp of the *next* level
        totalXpForCurrentLevel: totalXpForCurrentLevelBar // This is the size of the XP bar for the current level
    };
}

module.exports = {
    get_level_exp,
    levels // Exporting levels array as it might be useful
};
