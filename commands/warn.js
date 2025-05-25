// commands/warn.js
const { addWarning, getWarnings } = require('../../bdd/warn_data.js'); // Adjusted path

module.exports = {
    nomCom: "warn",
    categorie: "Admin",
    reaction: "⚠️",
    alias: ["warning"],
    desc: "Warns a user in the group. Max warnings can be configured.",
    usage: ".warn @user <reason>",
    // options: (if specific parsing needed, otherwise manual is fine)

    async execute(dest, zk, commandeOptions) {
        const { ms, arg, repondre, superUser, isGroupAdmin, auteurMessage, config, mentions, isGroupMsg, logger } = commandeOptions;

        if (!isGroupMsg) {
            return repondre("This command can only be used in groups.");
        }

        if (!isGroupAdmin && !superUser) {
            return repondre("You need to be a group admin to use this command.");
        }

        if (!mentions || mentions.length === 0) {
            return repondre("You must mention a user to warn. Usage: .warn @user <reason>");
        }

        const targetUserId = mentions[0];
        if (!targetUserId) { // Should be covered by mentions.length === 0, but good for safety
            return repondre("Could not identify the user to warn. Please mention them correctly.");
        }
        
        // Prevent warning the bot owner or oneself (optional, but good practice)
        if (config.NUMERO_OWNER.includes(targetUserId)) {
            return repondre("You cannot warn the bot owner.");
        }
        if (targetUserId === auteurMessage && !superUser) { // Allow superUser to warn themselves for testing if needed
             return repondre("You cannot warn yourself.");
        }
        // Prevent warning other admins if not a superUser (optional, depends on desired hierarchy)
        // For now, allowing admins to warn other admins, but not owners.

        let reason = arg.slice(1).join(" ").trim();
        if (!reason) {
            reason = "No reason provided";
        }

        try {
            const newWarningCount = addWarning(dest, targetUserId, reason); // dest is groupId
            const WARN_LIMIT = config.WARN_COUNT;

            const notificationMessage = `@${targetUserId.split('@')[0]} has been warned (Current Warnings: ${newWarningCount}/${WARN_LIMIT}).\nReason: ${reason}`;
            
            logger.info(`User ${targetUserId} warned by ${auteurMessage} in group ${dest}. New count: ${newWarningCount}. Reason: ${reason}`);

            await zk.sendMessage(dest, { 
                text: notificationMessage, 
                mentions: [targetUserId, auteurMessage] 
            });

            if (newWarningCount >= WARN_LIMIT) {
                const limitReachedMessage = `@${targetUserId.split('@')[0]} has reached the maximum warning limit (${WARN_LIMIT}). They should be removed from the group.`;
                await zk.sendMessage(dest, { 
                    text: limitReachedMessage, 
                    mentions: [targetUserId] 
                });
                // Future: Implement auto-removal if bot is admin and feature is enabled
                // if (commandeOptions.isBotAdmin && config.AUTO_REMOVE_ON_WARN_LIMIT) {
                // try {
                // await zk.groupParticipantsUpdate(dest, [targetUserId], "remove");
                // repondre(`@${targetUserId.split('@')[0]} has been automatically removed for reaching the warning limit.`);
                // logger.info(`User ${targetUserId} automatically removed from group ${dest} for reaching warning limit.`);
                // } catch (removeError) {
                // logger.error({ err: removeError, stack: removeError.stack }, `Failed to auto-remove user ${targetUserId} from group ${dest}`);
                // repondre(`Failed to automatically remove @${targetUserId.split('@')[0]}. Please remove them manually.`);
                // }
                // }
            }

        } catch (error) {
            logger.error({ err: error, stack: error.stack, command: this.nomCom }, `Error executing ${this.nomCom} command`);
            repondre(`An error occurred while trying to warn the user. Please check the logs. Error: ${error.message}`);
        }
    }
};
