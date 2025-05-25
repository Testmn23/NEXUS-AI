// commands/ping.js
module.exports = {
    nomCom: "ping",
    categorie: "General",
    reaction: "🏓",
    alias: ["p"],
    desc: "Checks if the bot is responsive.",
    async execute(dest, zk, commandeOptions) {
        const { repondre } = commandeOptions;
        repondre("Pong!");
    }
};
