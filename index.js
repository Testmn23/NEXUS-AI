const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser, // Added for JID normalization
    getContentType
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path'); // Added path module
const config = require('./set'); // Import config from set.js

const logger = pino({ level: 'info' });
// const SESSION_FILE_PATH = config.SESSION_ID ? 'session.json' : 'baileys_auth_info'; // Commented out, dynamic logic below

global.commands = new Map(); // Use global.commands as a Map
const BOT_PREFIX = config.PREFIX; // Use PREFIX from set.js

// Function to load commands
function loadCommands(directoryPath) {
    logger.info(`Loading commands from directory: ${directoryPath}`);
    const commandFiles = fs.readdirSync(directoryPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(directoryPath, file);
        try {
            // Clear cache for hot-reloading
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);

            if (command.nomCom && typeof command.execute === 'function') {
                global.commands.set(command.nomCom.toLowerCase(), command);
                logger.info(`Loaded command: ${command.nomCom} from ${file}`);

                if (command.alias && Array.isArray(command.alias)) {
                    command.alias.forEach(alias => {
                        global.commands.set(alias.toLowerCase(), command);
                        logger.info(`Loaded alias: ${alias} for command ${command.nomCom}`);
                    });
                }
            } else {
                logger.warn(`File ${file} does not export a valid command (missing nomCom or execute function).`);
            }
        } catch (error) {
            logger.error({ err: error, stack: error.stack, file }, `Failed to load command from ${file}`);
        }
    }
    logger.info(`Total commands loaded: ${global.commands.size} (including aliases)`);
}


async function connectToWhatsApp() {
    try {
        logger.info('Starting bot connection process...');
        let authState;
        let saveState;

        // Check for SESSION_ID from config
        if (config.SESSION_ID) {
            logger.info('Attempting to use SESSION_ID from config to create/load session.json');
            try {
                // Ensure the directory for SESSION_FILE_PATH exists if it's not just a filename
                // For this example, assuming session.json is in the root if SESSION_ID is used.
                fs.writeFileSync('session.json', config.SESSION_ID); // Explicitly use 'session.json' when SESSION_ID is provided
                logger.info('session.json created/updated successfully from config.SESSION_ID');
            } catch (err) {
                logger.error({ err, stack: err.stack }, 'Failed to write session.json from config.SESSION_ID. Falling back to multi-file auth directory.');
            }
        }
        
        // Determine auth state directory name: 'session' if SESSION_ID was used and written, otherwise 'baileys_auth_info'
        const authStateDir = config.SESSION_ID && fs.existsSync('session.json') ? 'session' : 'baileys_auth_info';
        logger.info(`Initializing multi-file authentication state from directory: ./${authStateDir}`);
        const { state, saveCreds } = await useMultiFileAuthState(authStateDir);
        authState = state;
        saveState = saveCreds;
        logger.info('Multi-file authentication state initialized.');


        const { version, isLatest } = await fetchLatestBaileysVersion();
        logger.info(`Using WA version: ${version.join('.')}, isLatest: ${isLatest}`);

        const sock = makeWASocket({
            version,
            logger, // Pass pino logger to Baileys
            printQRInTerminal: true,
            auth: {
                creds: authState.creds,
                keys: makeCacheableSignalKeyStore(authState.keys, logger),
            },
            generateHighQualityLinkPreview: true,
            shouldIgnoreJid: jid => /@broadcast/.test(jid),
            // Consider adding more options if needed by commands e.g. getMessage
            getMessage: async (key) => { 
                // This is an example, you might need to store sent messages or use a store
                // if (store) { 
                // const msg = await store.loadMessage(key.remoteJid, key.id) 
                // return msg?.message || undefined 
                // } 
                return { conversation: 'dummy message to satisfy getMessage (for now)' } 
            }
        });

        // Load commands after sock is initialized but before event handlers that use them
        loadCommands(path.join(__dirname, 'commands'));


        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            try {
                const { connection, lastDisconnect, qr } = update;

                // QR handling: Show QR if not using SESSION_ID from config OR if session.json doesn't exist
                if (qr && (!config.SESSION_ID || !fs.existsSync('session.json'))) {
                    logger.info('QR code received. Scan please if you are not using a SESSION_ID or if the session file is missing:');
                    qrcode.generate(qr, { small: true });
                }

                if (connection === 'close') {
                    const statusCode = (lastDisconnect.error)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    logger.error({ err: lastDisconnect.error, stack: lastDisconnect.error?.stack, statusCode },
                        `Connection closed. Reason: ${DisconnectReason[statusCode] || statusCode}. Reconnecting: ${shouldReconnect}`);

                    if (shouldReconnect) {
                        setTimeout(connectToWhatsApp, 5000); // Simple 5s reconnect delay
                    } else {
                        logger.info('Connection closed permanently (logged out).');
                        // If SESSION_ID was used and resulted in logout, it's invalid.
                        if (config.SESSION_ID && statusCode === DisconnectReason.loggedOut) {
                            logger.error('Logged out with SESSION_ID. The SESSION_ID is invalid or expired. Please provide a new one and delete the local session.json if it exists.');
                             try {
                                if (fs.existsSync('session.json')) { // Check for 'session.json' specifically
                                    fs.unlinkSync('session.json');
                                    logger.info('session.json deleted due to logout with SESSION_ID.');
                                }
                            } catch (unlinkErr) {
                                logger.error({ err: unlinkErr, stack: unlinkErr.stack }, 'Failed to delete session.json after logout.');
                            }
                            // Also clean up the multi-file auth directory if it was named 'session'
                            if (authStateDir === 'session') {
                                 try {
                                    if (fs.existsSync(authStateDir)) {
                                        fs.rmSync(authStateDir, { recursive: true, force: true });
                                        logger.info(`Auth state directory ./${authStateDir} deleted due to logout with SESSION_ID.`);
                                    }
                                } catch (rmErr) {
                                    logger.error({ err: rmErr, stack: rmErr.stack }, `Failed to delete auth state directory ./${authStateDir} after logout.`);
                                }
                            }
                            process.exit(1); // Exit as the session is invalid
                        } else if (!config.SESSION_ID) {
                             logger.info(`To avoid scanning QR code next time, you can set a SESSION_ID. For now, please delete the './${authStateDir}' directory and restart.`);
                        }
                    }
                } else if (connection === 'open') {
                    logger.info(`Connection opened successfully! Bot User ID: ${jidNormalizedUser(sock.user.id)}`);
                }
                logger.info(`Connection update: ${connection || 'unknown'}`);
            } catch (err) {
                logger.error({ err, stack: err.stack }, 'Error in connection.update handler');
            }
        });

        // Save credentials
        sock.ev.on('creds.update', async () => {
            try {
                await saveState();
                logger.info('Credentials updated and saved successfully.');
            } catch (err) {
                logger.error({ err, stack: err.stack }, 'Error saving credentials');
            }
        });

        // Handle incoming messages
        sock.ev.on('messages.upsert', async (update) => {
            // logger.debug('Raw messages.upsert event:', update); // Too verbose for info
            if (update.type !== 'notify') {
                logger.info('Received non-notify update type, skipping message processing:', update);
                return;
            }

            for (const ms of update.messages) {
                try { // Individual message processing try-catch
                    if (!ms.message) {
                        logger.info('Message with no content, skipping:', ms.key);
                        continue;
                    }
                    if (ms.key.fromMe || ms.key.remoteJid === 'status@broadcast') {
                        continue;
                    }

                    const messageContext = {
                        botInstance: sock,
                        originalMessage: ms,
                        groupId: null,
                        userId: null,
                        messageContent: null,
                        messageType: null,
                        isGroupMsg: false,
                        isBotMsg: ms.key.fromMe,
                        quotedMsg: null,
                        mentions: [],
                    };

                    messageContext.messageType = getContentType(ms.message);

                    if (ms.message.conversation) {
                        messageContext.messageContent = ms.message.conversation;
                    } else if (ms.message.extendedTextMessage) {
                        messageContext.messageContent = ms.message.extendedTextMessage.text;
                    } else if (ms.message.imageMessage?.caption) {
                        messageContext.messageContent = ms.message.imageMessage.caption;
                    } else if (ms.message.videoMessage?.caption) {
                        messageContext.messageContent = ms.message.videoMessage.caption;
                    } else if (ms.message.documentMessage?.caption) {
                        messageContext.messageContent = ms.message.documentMessage.caption;
                    }

                    messageContext.isGroupMsg = ms.key.remoteJid?.endsWith('@g.us') || false;

                    if (messageContext.isGroupMsg) {
                        messageContext.groupId = jidNormalizedUser(ms.key.remoteJid);
                        messageContext.userId = jidNormalizedUser(ms.key.participant || ms.sender);
                    } else {
                        messageContext.userId = jidNormalizedUser(ms.key.remoteJid);
                    }
                    
                    if (!messageContext.userId) {
                        logger.warn({ msgKey: ms.key }, 'Could not determine userId for message. Skipping.');
                        continue;
                    }

                    const botJid = jidNormalizedUser(sock.user.id);
                    messageContext.isBotMsg = messageContext.userId === botJid;

                    if (messageContext.isBotMsg) {
                        continue;
                    }
                    
                    logger.info({
                        msgId: ms.key.id,
                        userId: messageContext.userId,
                        groupId: messageContext.groupId,
                        contentType: messageContext.messageType,
                        contentPreview: messageContext.messageContent?.substring(0, 30) || 'N/A'
                    }, 'Received and parsed message');


                    const extendedTextMessage = ms.message.extendedTextMessage;
                    if (extendedTextMessage?.contextInfo?.quotedMessage) {
                        const quoted = extendedTextMessage.contextInfo.quotedMessage;
                        const quotedSender = jidNormalizedUser(extendedTextMessage.contextInfo.participant || extendedTextMessage.contextInfo.remoteJid);
                        let quotedContent = '';
                        if (quoted.conversation) quotedContent = quoted.conversation;
                        else if (quoted.extendedTextMessage) quotedContent = quoted.extendedTextMessage.text;
                        messageContext.quotedMsg = {
                            originalQuotedMessage: quoted,
                            sender: quotedSender,
                            content: quotedContent.substring(0, 50) + (quotedContent.length > 50 ? '...' : ''),
                        };
                    }

                    if (extendedTextMessage?.contextInfo?.mentionedJid) {
                        messageContext.mentions = extendedTextMessage.contextInfo.mentionedJid.map(jid => jidNormalizedUser(jid));
                    }

                    // Command Dispatcher Logic
                    if (messageContext.messageContent && messageContext.messageContent.startsWith(BOT_PREFIX)) {
                        const fullCommand = messageContext.messageContent.substring(BOT_PREFIX.length).trim();
                        const commandParts = fullCommand.split(/\s+/);
                        const commandName = commandParts[0].toLowerCase();
                        const args = commandParts.slice(1);
                        
                        const cmd = global.commands.get(commandName);

                        if (cmd) {
                            logger.info({
                                command: cmd.nomCom, // Log the actual command name
                                aliasUsed: commandName,
                                args,
                                userId: messageContext.userId,
                                groupId: messageContext.groupId,
                            }, `Command matched: ${cmd.nomCom} by user ${messageContext.userId} ${messageContext.groupId ? `in group ${messageContext.groupId}` : ''}`);

                            // Prepare commandeOptions
                            let isGroupAdmin = false;
                            let isBotAdmin = false;
                            if (messageContext.isGroupMsg) {
                                try {
                                    const groupMetadata = await sock.groupMetadata(messageContext.groupId);
                                    const botJidInGroup = jidNormalizedUser(sock.user.id);
                                    
                                    const participant = groupMetadata.participants.find(p => jidNormalizedUser(p.id) === messageContext.userId);
                                    if (participant) {
                                        isGroupAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
                                    }

                                    const botParticipant = groupMetadata.participants.find(p => jidNormalizedUser(p.id) === botJidInGroup);
                                    if (botParticipant) {
                                        isBotAdmin = botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin';
                                    }
                                } catch (groupErr) {
                                    logger.error({ err: groupErr, stack: groupErr.stack, groupId: messageContext.groupId }, "Error fetching group metadata for admin checks");
                                }
                            }

                            const commandeOptions = {
                                ms: messageContext.originalMessage,
                                arg: args,
                                repondre: (text) => sock.sendMessage(messageContext.originalMessage.key.remoteJid, { text: String(text) }, { quoted: messageContext.originalMessage }),
                                superUser: config.NUMERO_OWNER.includes(messageContext.userId),
                                isGroupAdmin,
                                isBotAdmin,
                                auteurMessage: messageContext.userId,
                                nomAuteurMessage: messageContext.originalMessage.pushName || messageContext.userId, // Use pushName if available
                                config: config, // Pass the global config
                                messageEpinglee: null, // Placeholder for pinned message feature
                                msgRepondu: messageContext.quotedMsg,
                                auteurMsgRepondu: messageContext.quotedMsg?.sender,
                                botInstance: sock, // Pass the sock instance for more complex operations if needed by commands
                                logger // Pass logger for commands to use
                            };

                            try {
                                if (cmd.reaction) {
                                    await sock.sendMessage(messageContext.originalMessage.key.remoteJid, {
                                        react: { text: cmd.reaction, key: messageContext.originalMessage.key }
                                    });
                                }
                                await cmd.execute(messageContext.originalMessage.key.remoteJid, sock, commandeOptions);
                            } catch (cmdErr) {
                                logger.error({ err: cmdErr, stack: cmdErr.stack, command: cmd.nomCom }, `Error executing command: ${cmd.nomCom}`);
                                commandeOptions.repondre(`❌ An error occurred while executing the command: ${cmd.nomCom}.\n\`\`\`${cmdErr.message}\`\`\``);
                            }

                        } else {
                            // Optional: only log if it's not a common prefix typo or very short
                            if (commandName.length > 1) { // Avoid logging for single character prefixes unless intended
                                logger.warn({ command: commandName, userId: messageContext.userId }, `Unknown command: ${commandName}`);
                            }
                            // No "command not found" message to keep chat clean, unless explicitly desired
                        }
                    }
                } catch (msgErr) {
                    logger.error({ err: msgErr, stack: msgErr.stack, msgKey: ms.key?.id || 'unknown' }, 'Error processing individual message in messages.upsert');
                }
            }
        });

        // Handle group participant updates
        sock.ev.on('group-participants.update', async (update) => {
            try {
                logger.info({ update }, 'Group participants updated');
                // Logic for group participant changes will go here
            } catch (err) {
                logger.error({ err, stack: err.stack }, 'Error in group-participants.update handler');
            }
        });
        logger.info('All event handlers registered.');
        return sock;

    } catch (error) {
        logger.error({ err: error, stack: error.stack }, "Critical error in connectToWhatsApp (bot startup)");
        // Depending on the error, you might want to exit or attempt a retry with backoff
        throw error; // Rethrow to allow the caller (.catch in the global scope) to handle it
    }
}

// Start the bot
logger.info('Attempting to start bot...');
connectToWhatsApp().then(() => {
    logger.info("connectToWhatsApp promise resolved. Bot should be running or connecting.");
}).catch(err => {
    logger.error({ err, stack: err.stack }, 'Failed to start WhatsApp connection after initial call.');
    process.exit(1); // Exit if the initial connection setup fails critically
});

process.on('SIGINT', async () => {
    logger.info("Caught SIGINT (Ctrl+C). Shutting down...");
    // Perform cleanup here if needed (e.g., sock.end())
    // For now, direct exit. Baileys might handle some cleanup on its own.
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger.info("Caught SIGTERM. Shutting down...");
    // Perform cleanup here if needed
    process.exit(0);
});
