const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { readdir } = require("fs/promises");
const puppeteer = require('puppeteer');

class WhatsappWebSession {
  constructor(sessionId, qrGenerationCallback, readyInstanceCallback) {
    this.sessionId = sessionId;
    this.qrGenerationCallback = qrGenerationCallback;
    this.readyInstanceCallback = readyInstanceCallback;
    this.client = null;
    this.browser = null;
    this.isReady = false;
    this.readyPromise = null;
  }

  async initializeClient(retries = 3) {
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    while (retries > 0) {
      try {
        if (this.browser) {
          await this.browser.close();
        }

        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ],
          defaultViewport: null,
        });

        const page = await this.browser.newPage();

        this.client = new Client({
          authStrategy: new LocalAuth({
            clientId: `session-${this.sessionId}`,
            dataPath: '../.wwebjs_auth',
          }),
          puppeteer: {
            browser: this.browser,
            page: page,
          },
        });

        this.client.on('qr', async (qr) => {
          if (this.qrGenerationCallback) {
            const qrImage = await QRCode.toDataURL(qr);
            this.qrGenerationCallback(qrImage);
          }
        });

        this.client.on('ready', () => {
          console.log(`Client ${this.sessionId} is ready!`);
          this.isReady = true;
          this.resolveReady();
          if (this.readyInstanceCallback) {
            this.readyInstanceCallback(this);
          }
        });

        this.client.on('disconnected', async (reason) => {
          console.log(`Client ${this.sessionId} was disconnected`, reason);
          this.isReady = false;
          if (this.browser) {
            await this.browser.close();
          }
          this.reconnect();
        });

        this.client.on('message_ack', (msg, ack) => {
          // Acknowledge can be => -1: ACK_ERROR, 0: ACK_PENDING, 1: ACK_SERVER, 2: ACK_DEVICE, 3: ACK_READ, 4: ACK_PLAYED
          const statusMap = {
              0: 'pending',
              1: 'server',
              2: 'device',
              3: 'read',
              4: 'played'
          };
      
          const status = statusMap[ack] || 'unknown';
          const contactId = msg.from;
          const messageId = msg.id._serialized;
      
          // Make a POST request to the webhook endpoint to update the message status
          axios.post('http://localhost:3000/message-ack', {
              messageId,
              status,
              contactId,
              userId: this.sessionId
          }).catch(error => {
              console.error('Error posting message acknowledgment:', error);
          });
      });

        await this.client.initialize();
        return;
      } catch (error) {
        console.error(`Error initializing client ${this.sessionId}:`, error);
        retries--;
        if (retries > 0) {
          console.log(`Retrying initialization for client ${this.sessionId}...`);
          if (this.browser) {
            await this.browser.close();
          }
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.error(`Failed to initialize client ${this.sessionId} after multiple attempts.`);
          throw error;
        }
      }
    }
  }

  async reconnect() {
    console.log(`Attempting to reconnect client ${this.sessionId}...`);
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    try {
      await this.initializeClient();
    } catch (error) {
      console.error(`Failed to reconnect client ${this.sessionId}:`, error);
    }
  }

  async waitForReady(timeout = 60000) {
    if (this.isReady) return true;
    if (!this.readyPromise) {
      throw new Error("Client not initialized");
    }
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout waiting for client to be ready")), timeout)
    );
    await Promise.race([this.readyPromise, timeoutPromise]);
    return true;
  }

  async destroy() {
    if (this.client) {
      await this.client.destroy();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

class WhatsappSessionManager {
  constructor() {
    this.sessionIdVsClientInstance = {};
  }

  async createWAClient(sessionId, qrGenerationCallback, readyInstanceCallback) {
    if (this.sessionIdVsClientInstance[sessionId]) {
      const existingSession = this.sessionIdVsClientInstance[sessionId];
      if (!existingSession.isReady) {
        console.log(`Reconnecting client for session ${sessionId}...`);
        await existingSession.reconnect();
      }
      return existingSession.client;
    }

    try {
      const waSession = new WhatsappWebSession(sessionId, qrGenerationCallback, readyInstanceCallback);
      await waSession.initializeClient();
      this.sessionIdVsClientInstance[sessionId] = waSession;
      return waSession.client;
    } catch (error) {
      console.error(`Failed to create WhatsApp client for session ${sessionId}:`, error);
      throw error;
    }
  }

  async restorePreviousSessions() {
    try {
      const directoryNames = await readdir("../.wwebjs_auth");
      const sessionIds = directoryNames
        .filter(name => name.startsWith('session-'))
        .map(name => name.split('-')[1]);

      for (const sessionId of sessionIds) {
        await this.createWAClient(sessionId);
      }
    } catch (error) {
      console.error('Error restoring previous sessions:', error);
    }
  }

  getClientFromSessionId(sessionId) {
    const session = this.sessionIdVsClientInstance[sessionId];
    return session ? session.client : null;
  }

  async destroySession(sessionId) {
    const session = this.sessionIdVsClientInstance[sessionId];
    if (session) {
      await session.destroy();
      delete this.sessionIdVsClientInstance[sessionId];
    }
  }

  isClientReady(sessionId) {
    const session = this.sessionIdVsClientInstance[sessionId];
    return session ? session.isReady : false;
  }

  async waitForClientReady(sessionId, timeout = 60000) {
    const session = this.sessionIdVsClientInstance[sessionId];
    if (!session) {
      throw new Error("Session not found");
    }
    return session.waitForReady(timeout);
  }
}

const singularWhatsappSessionManager = new WhatsappSessionManager();
module.exports = singularWhatsappSessionManager;