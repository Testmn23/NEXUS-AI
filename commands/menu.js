// commands/menu.js
const config = require('../../set.js');
const os = require('os');
const moment = require('moment'); // For formatted date, optional

module.exports = {
    nomCom: "menu",
    categorie: "General",
    reaction: "📜",
    alias: ["help", "cmd", "cmds"],
    desc: "Shows the list of available commands.",
    usage: ".menu [category_name]",

    async execute(dest, zk, commandeOptions) {
        const { arg, repondre, nomAuteurMessage, logger } = commandeOptions;

        try {
            // 1. De-duplicate commands (as aliases might make them appear multiple times in global.commands.values())
            const distinctCommands = new Map();
            global.commands.forEach(cmdObj => {
                if (!distinctCommands.has(cmdObj.nomCom.toLowerCase())) {
                    distinctCommands.set(cmdObj.nomCom.toLowerCase(), cmdObj);
                }
            });
            const totalUniqueCommands = distinctCommands.size;

            // 2. Group commands by category
            const categories = {};
            distinctCommands.forEach(cmd => {
                // Only list commands that are not owner-only, unless the user is an owner
                // For simplicity in this step, we'll list all. Filtering can be added.
                // Example: if (cmd.ownerOnly && !superUser) return;

                const category = cmd.categorie || "Other";
                if (!categories[category]) {
                    categories[category] = [];
                }
                categories[category].push(cmd); // Store the full command object
            });

            // 3. (Optional) Filter by category if argument is provided
            const requestedCategory = arg[0]?.trim().toLowerCase();
            let finalCategories = {};

            if (requestedCategory) {
                let found = false;
                for (const catName in categories) {
                    if (catName.toLowerCase() === requestedCategory) {
                        finalCategories[catName] = categories[catName];
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return repondre(`Category "${arg[0]}" not found. Available categories are: ${Object.keys(categories).join(", ")}`);
                }
            } else {
                finalCategories = categories;
            }


            // 4. Construct Menu Header
            const currentDate = moment().format('DD/MM/YYYY');
            const botThemeName = config.BOT_NAME || 'NEXUS-AI Theme'; // Use BOT_NAME or a default theme name
            const menuHeader = `
╭────《 ${config.BOT_NAME || 'Bot'} 》────
│ Admin: ${config.OWNER_NAME || 'N/A'}
│ Calendar: ${currentDate}
│ Prefix: ${config.PREFIX || '.'}
│ Bot is in: ${config.MODE || 'public'} mode
│ Commands: ${totalUniqueCommands}
│ Platform: ${os.platform()}
│ Theme: ${botThemeName}
╰─── ··《 ${config.BOT_NAME || 'Bot'} 》··───
            `.trim();

            // 5. Construct Command List
            let commandListString = "\n\n *COMMANDS LIST*\n"; // Removed emoji for cleaner look based on example
            const sortedCategoryNames = Object.keys(finalCategories).sort();

            for (const categoryName of sortedCategoryNames) {
                commandListString += `\n╭─⬡ ${categoryName.toUpperCase()} ⬡─\n`; // Removed bold for category to match example
                const commandsInCategory = finalCategories[categoryName].sort((a, b) => a.nomCom.localeCompare(b.nomCom));
                
                commandsInCategory.forEach(cmd => {
                    commandListString += `⬡│▸ ${config.PREFIX}${cmd.nomCom}\n`; // Matched example prefix
                });
                commandListString += `  ╰────────────··\n`; // Matched example end line
            }
            
            if (Object.keys(finalCategories).length === 0 && requestedCategory) {
                 // This case should be handled by "Category not found" earlier, but as a fallback:
                commandListString += "\nNo commands found in this category.";
            } else if (Object.keys(finalCategories).length === 0) {
                commandListString += "\nNo commands available.";
            }


            // 6. Combine and Send
            const menuString = menuHeader + commandListString;
            await repondre(menuString);

        } catch (error) {
            logger.error({ err: error, stack: error.stack, command: this.nomCom }, `Error executing ${this.nomCom} command`);
            repondre("An error occurred while generating the menu. Please try again later.");
        }
    }
};
