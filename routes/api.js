// routes/api.js
const express = require('express');
const router = express.Router();
const {
    startQrPairing,
    startCodePairing,
    getSessionData,
    endCurrentPairing,
    pairingEventEmitter
} = require('../baileys_handler.js'); // Adjust path if this file is in a routes/ subdirectory

// Endpoint to start QR code pairing
router.post('/start-qr', async (req, res) => {
    try {
        await endCurrentPairing(); // End any existing session first
        await startQrPairing();
        // QR will be sent via SSE
        res.json({ success: true, message: 'QR pairing process started. Listen to /api/events for QR code.' });
    } catch (error) {
        console.error('API Error /start-qr:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to start QR pairing.' });
    }
});

// Endpoint to start pairing with a phone number and code
router.post('/start-code', async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ success: false, error: "phoneNumber is required." });
    }
    try {
        await endCurrentPairing(); // End any existing session first
        await startCodePairing(phoneNumber);
        // Pairing code will be sent via SSE
        res.json({ success: true, message: `Pairing code process started for ${phoneNumber}. Listen to /api/events for the pairing code to display.` });
    } catch (error) {
        console.error('API Error /start-code:', error);
        res.status(500).json({ success: false, error: error.message || `Failed to start pairing code for ${phoneNumber}.` });
    }
});

// Endpoint for the client to listen for SSE events (QR, pairing code, status, session)
router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE connection

    const sendEvent = (eventName, data) => {
        res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const qrListener = (qr) => sendEvent('qr', { qr });
    const pairingCodeListener = (code) => sendEvent('pairingCode', { code });
    const statusListener = (message) => {
        // Check if this status message indicates successful pairing AND session is ready
        if (message && message.includes('Pairing successful! Session established.')) {
             // This event signals the client that it can now attempt to get the session
            sendEvent('paired', { message: "Pairing successful! Session ready." });
        } else {
            sendEvent('status', { message });
        }
    };
    const errorListener = (errorMsg) => sendEvent('error', { error: errorMsg });
    
    // This listener is conceptual. The actual "paired" signal comes from the statusListener
    // when the connection is 'open' and creds are available.
    // const pairedListener = () => { 
    //     sendEvent('paired', { message: "Pairing successful! Session ready." });
    // };

    pairingEventEmitter.on('qr', qrListener);
    pairingEventEmitter.on('pairingCode', pairingCodeListener);
    pairingEventEmitter.on('status', statusListener);
    pairingEventEmitter.on('error', errorListener);
    // pairingEventEmitter.on('paired', pairedListener); // See comment above

    req.on('close', () => {
        pairingEventEmitter.removeListener('qr', qrListener);
        pairingEventEmitter.removeListener('pairingCode', pairingCodeListener);
        pairingEventEmitter.removeListener('status', statusListener);
        pairingEventEmitter.removeListener('error', errorListener);
        // pairingEventEmitter.removeListener('paired', pairedListener);
        console.log('Client disconnected from SSE');
        // Optional: Aggressively end pairing if client disconnects before session is retrieved
        // if (!getSessionData()) { // This check itself is tricky; session might be briefly available
        //    console.log('SSE client disconnected before session retrieval, attempting to end pairing.');
        //    endCurrentPairing();
        // }
        res.end();
    });
});

// Endpoint to get current session data (e.g., after 'paired' event is received by client)
router.get('/get-session', async (req, res) => {
    try {
        const sessionData = getSessionData();
        if (sessionData) {
            const prefixedSession = `botrelay${JSON.stringify(sessionData)}`;
            await endCurrentPairing(); // Crucial: End Baileys session after data is retrieved
            res.json({ success: true, sessionString: prefixedSession });
        } else {
            res.status(404).json({ success: false, error: "No active session found or pairing not complete." });
        }
    } catch (error) {
        console.error('API Error /get-session:', error);
        await endCurrentPairing(); // Attempt to clean up even if there was an error
        res.status(500).json({ success: false, error: 'Failed to retrieve session data.' });
    }
});

// Endpoint to end the current pairing attempt
router.post('/end-pairing', async (req, res) => {
    try {
        const ended = await endCurrentPairing();
        if (ended) {
            res.json({ success: true, message: "Pairing session ended." });
        } else {
            res.json({ success: false, message: "No active pairing session to end." });
        }
    } catch (error) {
        console.error('API Error /end-pairing:', error);
        res.status(500).json({ success: false, error: 'Failed to end pairing session.' });
    }
});

module.exports = router;
