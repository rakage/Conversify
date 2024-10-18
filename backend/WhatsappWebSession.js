const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");

class WhatsappWebSession {
  constructor(sessionId, qrGenerationCallback, readyInstanceCallback) {
    this.sessionId = sessionId;
    this.qrGenerationCallback = qrGenerationCallback;
    this.readyInstanceCallback = readyInstanceCallback;
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    if (this.client) {
      console.log(`Client for session ${this.sessionId} is already initialized.`);
      return;
    }

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: `session-${this.sessionId}`,
        dataPath: '../.wwebjs_auth',
      }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', async (qr) => {
      try {
        if (this.qrGenerationCallback) {
          const qrImage = await QRCode.toDataURL(qr);
          this.qrGenerationCallback(qrImage);
        }
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    });

    this.client.on('ready', () => {
      console.log(`WhatsApp client for session ${this.sessionId} is ready!`);
      if (this.readyInstanceCallback) {
        this.readyInstanceCallback(this);
      }
    });

    this.client.on('disconnected', (reason) => {
      console.error(`WhatsApp client for session ${this.sessionId} disconnected:`, reason);
      // Reset client so it can be reinitialized
      this.client = null;
    });

    // Initialize the client with retry logic
    this.tryInitializeClient();
  }

  async tryInitializeClient(retries = 3, delay = 5000) {
    while (retries > 0) {
      try {
        await this.client.initialize();
        return; // Successfully initialized
      } catch (error) {
        console.error(`Failed to initialize WhatsApp client for session ${this.sessionId}:`, error);
        retries--;
        if (retries > 0) {
          console.log(`Retrying initialization in ${delay / 1000} seconds... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error("All retries exhausted. Failed to initialize WhatsApp client.");
        }
      }
    }
  }
}

module.exports = WhatsappWebSession;
