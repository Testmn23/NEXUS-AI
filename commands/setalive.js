// commands/setalive.js
const { loadAliveSettings, updateAliveSettings, defaultSettings } = require('../../bdd/alive_settings.js');

// Helper to parse boolean string
function parseBooleanString(str) {
    if (str === null || str === undefined) return undefined;
    const s = str.toLowerCase().trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
    return undefined; // Invalid boolean string
}

module.exports = {
    nomCom: "setalive",
    categorie: "Admin",
    reaction: "⚙️",
    alias: ["configalive"],
    desc: "Configures the .alive command message and appearance.",
    usage: ".setalive <subcommand> <value>\n\nSubcommands:\n" +
           "  message <text>\n" +
           "  lien <url_or_empty_for_none>\n" +
           "  reset_lien\n" +
           "  show_uptime true|false\n" +
           "  show_owner true|false\n" +
           "  owner_override <name_or_empty_to_reset>\n" +
           "  show_settings\n" +
           "  reset_all_settings",

    async execute(dest, zk, commandeOptions) {
        const { arg, repondre, superUser, ms, logger } = commandeOptions;

        if (!superUser) {
            return repondre("Only the bot owner can use this command.");
        }

        const subcommand = arg[0]?.toLowerCase();
        const value = arg.slice(1).join(' ').trim();

        let updateResult = false;
        let responseMessage = "";

        switch (subcommand) {
            case 'message':
                if (!value) return repondre("Please provide text for the alive message. Usage: .setalive message <text>");
                updateResult = updateAliveSettings({ message: value });
                responseMessage = updateResult ? "✅ Alive message updated." : "❌ Failed to update alive message.";
                break;

            case 'lien':
                // Allow empty value to clear the lien
                updateResult = updateAliveSettings({ lien: value });
                responseMessage = updateResult ? `✅ Alive media link updated to: ${value || "none"}` : "❌ Failed to update alive media link.";
                break;
            
            case 'reset_lien':
                updateResult = updateAliveSettings({ lien: "" });
                responseMessage = updateResult ? "✅ Alive media link reset (removed)." : "❌ Failed to reset alive media link.";
                break;

            case 'show_uptime':
                const uptimeBool = parseBooleanString(value);
                if (uptimeBool === undefined) return repondre("Invalid value for show_uptime. Use 'true' or 'false'.");
                updateResult = updateAliveSettings({ show_uptime: uptimeBool });
                responseMessage = updateResult ? `✅ Show uptime set to: ${uptimeBool}` : "❌ Failed to update show_uptime setting.";
                break;

            case 'show_owner':
                const ownerBool = parseBooleanString(value);
                if (ownerBool === undefined) return repondre("Invalid value for show_owner. Use 'true' or 'false'.");
                updateResult = updateAliveSettings({ show_owner: ownerBool });
                responseMessage = updateResult ? `✅ Show owner set to: ${ownerBool}` : "❌ Failed to update show_owner setting.";
                break;

            case 'owner_override':
                // Allow empty value to reset the override
                updateResult = updateAliveSettings({ owner_name_override: value });
                responseMessage = updateResult ? `✅ Owner name override updated to: ${value || "default"}` : "❌ Failed to update owner name override.";
                break;
            
            case 'reset_all_settings':
                updateResult = updateAliveSettings({ ...defaultSettings }); // Spread to ensure it's a new object
                responseMessage = updateResult ? "✅ All alive settings have been reset to defaults." : "❌ Failed to reset alive settings.";
                break;

            case 'show_settings':
                const currentSettings = loadAliveSettings();
                responseMessage = "Current Alive Settings:\n```json\n" + JSON.stringify(currentSettings, null, 2) + "\n```";
                break;

            default:
                responseMessage = `Unknown subcommand. \n\n${this.usage}`;
                break;
        }

        await repondre(responseMessage);
        if (updateResult) { // Log successful updates
            logger.info({ command: this.nomCom, subcommand, value, user: commandeOptions.auteurMessage }, `Alive settings updated by owner. Subcommand: ${subcommand}`);
        }
    }
};
