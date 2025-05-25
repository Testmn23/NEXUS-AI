// commands/toprank.js
const { getTopUsers } = require('../../bdd/user_rank_data.js');
const { get_level_exp } = require('../../lib/rank_utils.js');

module.exports = {
    nomCom: "toprank",
    categorie: "General",
    reaction: "🏆",
    alias: ["leaderboard", "lb"],
    desc: "Displays the top 10 users by XP in this group.",
    usage: ".toprank",

    async execute(dest, zk, commandeOptions) {
        const { repondre, isGroupMsg, logger, botInstance } = commandeOptions;

        if (!isGroupMsg) {
            return repondre("This command can only be used in groups.");
        }

        try {
            const topUsersData = await getTopUsers(dest, 10); // dest is groupId

            if (!topUsersData || topUsersData.length === 0) {
                return repondre("No rank data available for this group yet.");
            }

            let leaderboardMessage = "🏆 *Top 10 Users in this Group* 🏆\n\n";
            
            for (let i = 0; i < topUsersData.length; i++) {
                const userData = topUsersData[i];
                const levelData = get_level_exp(userData.xp);
                let userName;

                try {
                    userName = await botInstance.getName(userData.userId);
                } catch (nameError) {
                    logger.warn({ err: nameError, userId: userData.userId }, "Failed to fetch name for toprank user, using JID part.");
                    userName = `@${userData.userId.split('@')[0]}`;
                }
                
                leaderboardMessage += `${i + 1}. ${userName} - Level ${levelData.level} (${levelData.role}) - ${userData.xp} XP\n`;
            }

            await repondre(leaderboardMessage.trim());

        } catch (error) {
            logger.error({ err: error, stack: error.stack, command: this.nomCom }, `Error executing ${this.nomCom} command`);
            repondre("An error occurred while fetching the leaderboard. Please try again later.");
        }
    }
};
