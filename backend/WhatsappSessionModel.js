const mongoose = require('mongoose');

const whatsappSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    sessionReady: { type: Boolean, default: false },
});

const WhatsappSession = mongoose.model('WhatsappSession', whatsappSessionSchema);
module.exports = WhatsappSession;