// public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const startQrButton = document.getElementById('start-qr-button');
    const qrCodeArea = document.getElementById('qr-code-area');
    const statusMessage = document.getElementById('status-message');

    const startPairCodeButton = document.getElementById('start-pair-code-button');
    const phoneNumberInput = document.getElementById('phone-number');
    const pairCodeInstructions = document.getElementById('pair-code-instructions');

    const sessionDisplayArea = document.getElementById('session-display-area');
    const sessionStringTextarea = document.getElementById('session-string');

    let eventSource = null;

    function clearPreviousState() {
        qrCodeArea.innerHTML = '';
        statusMessage.textContent = '';
        pairCodeInstructions.textContent = '';
        sessionDisplayArea.style.display = 'none';
        sessionStringTextarea.value = '';
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        // Optionally call backend to end any lingering pairing session
        fetch('/api/end-pairing', { method: 'POST' })
            .then(res => res.json())
            .then(data => console.log('Previous pairing ended:', data))
            .catch(err => console.error('Error ending previous pairing:', err));
    }

    startQrButton.addEventListener('click', async () => {
        clearPreviousState();
        statusMessage.textContent = 'Starting QR pairing... Please wait.';

        try {
            const response = await fetch('/api/start-qr', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                statusMessage.textContent = 'QR pairing process started. Waiting for QR code...';
                connectToSse();
            } else {
                statusMessage.textContent = `Error: ${data.error || 'Failed to start QR pairing.'}`;
            }
        } catch (error) {
            console.error('Error starting QR pairing:', error);
            statusMessage.textContent = 'Error starting QR pairing. Check console.';
        }
    });

    startPairCodeButton.addEventListener('click', async () => {
        clearPreviousState();
        const phoneNumber = phoneNumberInput.value.trim();
        if (!phoneNumber) {
            statusMessage.textContent = 'Please enter a phone number.';
            return;
        }

        statusMessage.textContent = `Starting pairing code process for ${phoneNumber}... Please wait.`;
        pairCodeInstructions.textContent = '';

        try {
            const response = await fetch('/api/start-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber })
            });
            const data = await response.json();

            if (data.success) {
                statusMessage.textContent = 'Pairing code process started. Waiting for code to display...';
                connectToSse();
            } else {
                statusMessage.textContent = `Error: ${data.error || 'Failed to start pairing code process.'}`;
            }
        } catch (error) {
            console.error('Error starting pairing code process:', error);
            statusMessage.textContent = 'Error starting pairing code process. Check console.';
        }
    });

    function connectToSse() {
        if (eventSource) {
            eventSource.close();
        }
        eventSource = new EventSource('/api/events');

        eventSource.addEventListener('qr', (event) => {
            const data = JSON.parse(event.data);
            qrCodeArea.innerHTML = ''; // Clear previous QR
            if (data.qr) {
                // Use qrcode.js library (assuming it's globally available via CDN)
                const qr = qrcode(0, 'L'); // typeNumber 0, errorCorrectionLevel 'L'
                qr.addData(data.qr);
                qr.make();
                qrCodeArea.innerHTML = qr.createImgTag(4); // Create img tag with size 4
                statusMessage.textContent = 'Scan the QR code with your WhatsApp.';
            }
        });

        eventSource.addEventListener('pairingCode', (event) => {
            const data = JSON.parse(event.data);
            qrCodeArea.innerHTML = ''; // Clear QR area
            if (data.code) {
                pairCodeInstructions.innerHTML = `Pairing Code: <strong>${data.code}</strong><br>Enter this code on your primary phone when WhatsApp asks after selecting 'Link with phone number'.`;
                statusMessage.textContent = 'Pairing code received. Follow instructions.';
            }
        });
        
        eventSource.addEventListener('status', (event) => {
            const data = JSON.parse(event.data);
            statusMessage.textContent = data.message;
        });

        eventSource.addEventListener('paired', async (event) => {
            const data = JSON.parse(event.data);
            statusMessage.textContent = data.message || "Pairing Successful! Fetching session...";
            qrCodeArea.innerHTML = ''; // Clear QR
            pairCodeInstructions.innerHTML = '';

            if (eventSource) eventSource.close(); // Close SSE connection

            // Fetch the session string
            try {
                const sessionRes = await fetch('/api/get-session');
                const sessionData = await sessionRes.json();
                if (sessionData.success && sessionData.sessionString) {
                    sessionStringTextarea.value = sessionData.sessionString;
                    sessionDisplayArea.style.display = 'block';
                    statusMessage.textContent = 'Session string retrieved! You can copy it now.';
                } else {
                    statusMessage.textContent = `Error fetching session: ${sessionData.error || 'Unknown error'}`;
                }
            } catch (err) {
                console.error('Error fetching session:', err);
                statusMessage.textContent = 'Error fetching session. Check console.';
            }
        });

        eventSource.addEventListener('error', (event) => {
            const data = JSON.parse(event.data);
            console.error('SSE Error:', data.error);
            statusMessage.textContent = `Error: ${data.error}`;
            // Don't close SSE on all errors, some might be temporary Baileys issues
            // if (eventSource) eventSource.close(); 
        });

        eventSource.onerror = (err) => { // General SSE connection error
            console.error('EventSource failed:', err);
            statusMessage.textContent = 'Connection to server events lost. Please try starting the pairing again.';
            if (eventSource) eventSource.close();
        };
    }
});
