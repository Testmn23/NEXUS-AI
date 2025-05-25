// commands/alive.js
const os = require('os');
const moment = require('moment'); // moment-duration-format needs moment
require('moment-duration-format'); // Extends moment
const { loadAliveSettings } = require('../../bdd/alive_settings.js');

// Helper to format uptime
function formatUptime(seconds) {
    return moment.duration(seconds, "seconds").format("D[d] H[h] m[m] s[s]");
}

module.exports = {
    nomCom: "alive",
    categorie: "General",
    reaction: "👋",
    alias: ["a", "online"],
    desc: "Checks if the bot is alive and provides bot information.",
    
    async execute(dest, zk, commandeOptions) {
        const { config, repondre, ms, auteurMessage, nomAuteurMessage, superUser, logger } = commandeOptions;

        try {
            const settings = loadAliveSettings();
            
            let constructedMessage = `${settings.message}\n\n`;
            constructedMessage += `╭─「 *NEXUS-AI Info* 」\n`;
            constructedMessage += `│❒ Invoked by: ${nomAuteurMessage || auteurMessage.split('@')[0]}\n`;
            constructedMessage += `│❒ Prefix: ${config.PREFIX}\n`;
            constructedMessage += `│❒ Mode: ${config.MODE}\n`;

            if (settings.show_uptime) {
                constructedMessage += `│❒ Uptime: ${formatUptime(os.uptime())}\n`;
            }

            if (settings.show_owner) {
                const ownerName = settings.owner_name_override && settings.owner_name_override.trim() !== "" 
                                  ? settings.owner_name_override 
                                  : config.OWNER_NAME;
                constructedMessage += `│❒ Owner: ${ownerName}\n`;
            }
            constructedMessage += `╰─「 *${config.BOT_NAME}* 」`;

            const mentions = [auteurMessage];
            // if (superUser && settings.show_owner && config.NUMERO_OWNER && config.NUMERO_OWNER[0]) {
            //     // Mention owner only if superUser is invoking and owner is shown, to avoid tagging owner always
            //     // Also ensure NUMERO_OWNER is not empty
            //     mentions.push(config.NUMERO_OWNER[0]); 
            // }


            const isValidLien = (lien) => {
                if (!lien || typeof lien !== 'string') return false;
                const pattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i;
                return pattern.test(lien.trim());
            };

            if (settings.lien && isValidLien(settings.lien)) {
                try {
                    logger.info(`Attempting to send alive message with media: ${settings.lien}`);
                    await zk.sendMessage(dest, { 
                        image: { url: settings.lien.trim() }, 
                        caption: constructedMessage, 
                        mentions: mentions 
                    }, { quoted: ms });
                } catch (mediaError) {
                    logger.error({ err: mediaError, stack: mediaError.stack, lien: settings.lien }, "Failed to send alive message with media, falling back to text.");
                    await repondre(constructedMessage); // Fallback to text if media fails
                }
            } else {
                if (settings.lien && !isValidLien(settings.lien)) {
                    logger.warn(`Invalid 'lien' URL for alive command: ${settings.lien}. Sending as text.`);
                }
                await repondre(constructedMessage);
            }

        } catch (error) {
            logger.error({ err: error, stack: error.stack, command: this.nomCom }, `Error executing ${this.nomCom} command`);
            repondre("An error occurred while fetching alive status. Please check the logs.");
        }
    }
};
