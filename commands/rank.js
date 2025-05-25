// commands/rank.js
const { getUserStats } = require('../../bdd/user_rank_data.js');
const { get_level_exp, levels } = require('../../lib/rank_utils.js'); // Assuming levels might be useful for max level check

module.exports = {
    nomCom: "rank",
    categorie: "General",
    reaction: "📊",
    alias: ["level", "xp"],
    desc: "Displays your current rank, XP, and message count in this group.",
    usage: ".rank [@user]",

    async execute(dest, zk, commandeOptions) {
        const { ms, arg, repondre, mentions, auteurMessage, nomAuteurMessage, isGroupMsg, logger, botInstance } = commandeOptions;

        if (!isGroupMsg) {
            return repondre("This command can only be used in groups.");
        }

        let targetUserId;
        let displayName;

        try {
            if (mentions && mentions.length > 0) {
                targetUserId = mentions[0];
                try {
                    displayName = await botInstance.getName(targetUserId);
                } catch (nameError) {
                    logger.warn({ err: nameError, userId: targetUserId }, "Failed to fetch name for mentioned user, using JID part.");
                    displayName = `@${targetUserId.split('@')[0]}`;
                }
            } else {
                targetUserId = auteurMessage;
                displayName = nomAuteurMessage || `@${targetUserId.split('@')[0]}`;
            }

            const userStats = await getUserStats(dest, targetUserId); // dest is groupId
            const levelData = get_level_exp(userStats.xp);

            let progressMessage;
            if (levelData.level === levels.length - 1) { // Check if user is at the highest defined level
                progressMessage = "Max Level Reached!";
            } else {
                progressMessage = `${levelData.currentXpInLevel} / ${levelData.totalXpForCurrentLevel} XP towards Level ${levelData.level + 1}`;
            }
            
            // Ensure totalXpForCurrentLevel is not 0 to avoid NaN in progress bar if implemented later
            const progressBarTotal = levelData.totalXpForCurrentLevel > 0 ? levelData.totalXpForCurrentLevel : 1;
            const progressPercent = Math.min(Math.floor((levelData.currentXpInLevel / progressBarTotal) * 100), 100);
            
            // Simple text-based progress bar (optional, can be enhanced)
            const barLength = 10;
            const filledLength = Math.round(barLength * (progressPercent / 100));
            const emptyLength = barLength - filledLength;
            const progressBar = `[${'■'.repeat(filledLength)}${'□'.repeat(emptyLength)}] ${progressPercent}%`;


            const rankMessage = `
📊 *Rank for ${displayName}* 📊

🏅 Level: ${levelData.level} - ${levelData.role}
✨ XP: ${userStats.xp}
📈 Progress: ${progressMessage}
${levelData.level < levels.length -1 ? progressBar : ''} 
💬 Messages: ${userStats.messages} in this group.
`.trim();

            await repondre(rankMessage);

        } catch (error) {
            logger.error({ err: error, stack: error.stack, command: this.nomCom }, `Error executing ${this.nomCom} command`);
            repondre("An error occurred while fetching the rank. Please try again later.");
        }
    }
};
