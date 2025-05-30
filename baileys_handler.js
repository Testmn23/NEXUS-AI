// baileys_handler.js
const {
    default: makeWASocket,
    useMultiFileAuthState, // We might not save to file here, but manage creds in memory for this service
    makeInMemoryStore,
    Browsers,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const EventEmitter = require('events');
const pino = require('pino'); // Or use console

// Simple in-memory store for active sockets and their states
// For a production system, this would need to be more robust or handle single pairings at a time.
let sock = null; 
let pairingEventEmitter = new EventEmitter();
let currentPairingType = null; // 'qr' or 'code'
let pairingPhoneNumber = null;

// Logger setup (basic)
const logger = pino({ level: 'info' }); // Change to 'debug' for more verbosity

async function startBaileysInstance(isPairingWithCode = false, phoneNumber = null) {
    if (sock) { // Prevent multiple instances for this simple setup
        pairingEventEmitter.emit('error', 'A pairing process is already active. Please wait or refresh.');
        // Or attempt to close existing sock: await sock.logout(); sock = null;
        return;
    }

    // For a pairing service, we usually don't want to persist auth state on the server.
    // We capture it on successful pairing and send it to the user.
    // So, useMultiFileAuthState might not be directly used here for file saving,
    // but we need to manage creds in memory.
    // For simplicity, we'll let Baileys manage it internally for the pairing duration.
    // On successful pairing, `authState.creds` will contain the session.

    // A simple in-memory auth state can be managed if needed, but not strictly required
    // if we just grab creds on 'connection.update' when connection is 'open'.
    // For now, let Baileys handle internal auth state during pairing.

    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

    sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: !isPairingWithCode, // Print QR in terminal if not using pairing code initially
        mobile: false, // True if you want to simulate mobile, false for web
        browser: Browsers.ubuntu('Chrome'), // Or your preferred browser
        auth: undefined, // Start fresh for pairing, Baileys will manage internal auth state
        generateHighQualityLinkPreview: true,
        shouldIgnoreJid: jid => jid && jid.includes('@broadcast'), // Ignore broadcast messages
        // getMessage: async key => { return { conversation: 'hello' } } // Example, for real use provide a store
    });

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, pairingCode } = update;

        if (qr && currentPairingType === 'qr') {
            logger.info('QR code generated');
            pairingEventEmitter.emit('qr', qr);
        }

        if (pairingCode && currentPairingType === 'code') {
            // This is the code the user needs to enter on their primary phone
            // after choosing "Link with phone number" and entering this service's "bot" number.
            // No, this is the code our instance shows, that user enters on their phone.
            logger.info(`Pairing code for ${pairingPhoneNumber}: ${pairingCode}`);
            pairingEventEmitter.emit('pairingCode', pairingCode);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            logger.error(`Connection closed due to ${lastDisconnect?.error}, status code ${statusCode}`);
            pairingEventEmitter.emit('status', 'Connection Closed. Retrying if applicable...');
            
            if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.connectionClosed || statusCode === DisconnectReason.connectionLost || statusCode === DisconnectReason.timedOut || statusCode === DisconnectReason.multideviceMismatch) {
                 // For a pairing service, we might not want to auto-reconnect here,
                 // but rather signal failure or await user action.
                 pairingEventEmitter.emit('error', `Pairing failed or connection closed: ${lastDisconnect?.error}`);
                 if (sock) {
                    try { await sock.ws.close(); } catch {} // Try to clean up
                    sock = null;
                 }
            } else if (statusCode === DisconnectReason.restartRequired) {
                logger.info('Restart required, attempting to restart...');
                if (sock) {
                    try { await sock.ws.close(); } catch {}
                    sock = null;
                }
                // Potentially restart after a delay, or signal UI to allow user to retry
                // For now, emit error and stop.
                pairingEventEmitter.emit('error', 'Restart required for Baileys session.');
            } else {
                // For other errors, might attempt to restart or just signal error
                 pairingEventEmitter.emit('error', `Connection closed unexpectedly: ${lastDisconnect?.error || 'Unknown error'}`);
                 if (sock) {
                    try { await sock.ws.close(); } catch {}
                    sock = null;
                 }
            }
        } else if (connection === 'open') {
            logger.info('Connection opened successfully!');
            pairingEventEmitter.emit('status', 'Pairing successful! Session established.');
            
            // Capture and emit the session credentials
            // IMPORTANT: Baileys authState is now managed internally by the socket instance
            // if we don't pass an `auth` object to makeWASocket.
            // We need to access the generated credentials.
            // This might involve listening to 'creds.update' and storing them,
            // or accessing them from sock.authState if available after connection.
            // For simplicity, let's assume we'll grab it from sock.authState.creds
            // (This needs verification with latest Baileys, as auth handling has evolved)
            
            // The 'creds.update' event is more reliable for getting the latest creds
            // For now, we'll signal success, and server.js will call a function to get session
        }
    });

    // Listen for credential updates and store them (in memory for this example)
    // This is crucial for getting the session string.
    sock.ev.on('creds.update', (auth) => {
        // This `auth` object contains the credentials.
        // For this service, we don't save to file but make it available.
        // When connection is 'open', these creds are what we need.
        logger.info('Credentials updated (session established/changed).');
        // We can emit the full authState.creds here or just signal that it's ready
        // Let's assume the 'connection.open' is the primary signal for now.
    });

    return sock; // Return the socket instance
}

async function startQrPairing() {
    currentPairingType = 'qr';
    pairingPhoneNumber = null;
    logger.info('Starting QR pairing process...');
    try {
        await startBaileysInstance(false);
        pairingEventEmitter.emit('status', 'QR pairing initiated. Scan QR code.');
    } catch (error) {
        logger.error('Error starting QR pairing:', error);
        pairingEventEmitter.emit('error', 'Failed to start QR pairing.');
    }
}

async function startCodePairing(phoneNumber) {
    if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
        pairingEventEmitter.emit('error', 'Invalid phone number provided.');
        return;
    }
    currentPairingType = 'code';
    pairingPhoneNumber = phoneNumber; // Store for logging/reference
    logger.info(`Starting pairing code process for ${phoneNumber}...`);
    
    // For Baileys, to get a pairing code to display to the user:
    // 1. Initialize a new socket
    // 2. Do NOT load existing auth state
    // 3. The 'connection.update' event will eventually emit 'pairingCode'

    try {
        // This will trigger the 'connection.update' with the pairingCode
        // if the conditions within Baileys are met for this flow.
        if (sock) { // If a socket is already trying QR, close it.
             pairingEventEmitter.emit('status', 'Switching to pairing code method. Please wait.');
             await sock.logout(); // Or sock.end(new Error('Switching mode'))
             sock = null;
        }
        await startBaileysInstance(true, phoneNumber);
        pairingEventEmitter.emit('status', `Pairing code requested for ${phoneNumber}. Check for code on this page to enter on your primary phone.`);
        // The actual pairing code will be emitted via 'connection.update' -> 'pairingCode' event
    } catch (error) {
        logger.error(`Error starting pairing code process for ${phoneNumber}:`, error);
        pairingEventEmitter.emit('error', `Failed to start pairing code process for ${phoneNumber}.`);
    }
}

function getSessionData() {
    if (sock && sock.authState && sock.authState.creds && sock.authState.creds.registered) {
        // Ensure to stringify and then parse to deep clone and remove any methods/proxies
        return JSON.parse(JSON.stringify(sock.authState.creds));
    }
    return null;
}

async function endCurrentPairing() {
    if (sock) {
        logger.info('Ending current pairing session.');
        try {
            await sock.logout(); // Or sock.end(new Error('Pairing ended by user/timeout'))
        } catch (e) {
            logger.error('Error during logout/end:', e);
        } finally {
            sock = null;
            currentPairingType = null;
            pairingPhoneNumber = null;
        }
        pairingEventEmitter.emit('status', 'Pairing session ended.');
        return true;
    }
    return false;
}


module.exports = {
    startQrPairing,
    startCodePairing,
    getSessionData,
    endCurrentPairing,
    pairingEventEmitter,
    // We don't export 'sock' directly to keep it encapsulated.
};
