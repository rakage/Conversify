const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const readXlsxFile = require('read-excel-file/node');
const singularWhatsappSessionManager = require('./WhatsappSessionManager');
const WhatsappSession = require('./WhatsappSessionModel');
const imageToBase64 = require('image-to-base64');
const cors = require('cors');
const { MessageMedia } = require('whatsapp-web.js');
const cron = require('node-cron');
const moment = require('moment-timezone');


const app = express();

app.use(cors({
    origin: 'http://localhost:5500', // Adjust this to match the URL of your frontend
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

mongoose.connect('mongodb://localhost:27017/whatsapp-blaster', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    type: { type: String, enum: ['admin', 'user'], default: 'user' },
    subscription: {
        plan: { type: String, enum: ['free', 'basic_monthly', 'full_monthly', 'basic_yearly', 'full_yearly'], default: 'free' },
        expirationDate: Date
    },
});

const contactSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    nama: String,
    nomor_wa: String,
    flag: String,
});

const messageSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    contactId: mongoose.Schema.Types.ObjectId,
    msgSerializedId: String,
    content: String,
    status: String,
    sentAt: Date,
});

const messageListSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    title_message: String,
    message_text: String,
    message_media: String,
    created_at: Date,
})

const scheduledBroadcastSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    messageListId: mongoose.Schema.Types.ObjectId,
    contactIds: [mongoose.Schema.Types.ObjectId],
    scheduledTime: Date,
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    }
});

const User = mongoose.model('User', userSchema);
const Contact = mongoose.model('Contact', contactSchema);
const Message = mongoose.model('Message', messageSchema);
const MessageList = mongoose.model('MessageList', messageListSchema);
const ScheduledBroadcast = mongoose.model('ScheduledBroadcast', scheduledBroadcastSchema);


// Register Endpoint
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        // check if username already exists
        const existingUser = await User.findOne(
            { username }
        )
        if (existingUser) {
            return res.status(400).send('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).send('User registered');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user');
    }
});

// Login Endpoint
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ userId: user._id, type: user.type, plan: user.subscription.plan }, 'SECRET_KEY');
            res.json({ token });
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Error logging in');
    }
});

// Middleware to Check Admin
const checkAdmin = (req, res, next) => {
    if (req.userType === 'admin') {
        next();
    }
    else {
        res.status(403).send('Access denied');
    }
};

// Miidleware to Check Subscription
const checkSubscription = (req, res, next) => {
    if (req.userType === 'admin') {
        next();
    }
    else {
        const now = new Date();
        if (req.subscription.expirationDate < now) {
            res.status(403).send('Subscription expired');
        }
        else {
            next();
        }
    }
}



// Middleware to Authenticate Requests
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).send('Access denied');

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).send('Access denied');

    try {
        const decoded = jwt.verify(token, 'SECRET_KEY');
        req.userId = decoded.userId;
        req.userType = decoded.type;
        next();
    } catch (err) {
        console.error(err);
        res.status(400).send('Invalid token');
    }
};

app.get('/whatsapp/connect', authenticate, async (req, res) => {
    const sessionId = req.userId;
    // Check user subscription
    const user = await User.findById(sessionId);
    if (!user) {
        return res.status(404).send('User not found');
    }

    if (user.subscription.plan === 'free') {
        return res.status(403).send(
            { message: 'Please upgrade to a paid plan to use this feature' }
        )
    }

    try {
        let client = singularWhatsappSessionManager.getClientFromSessionId(sessionId);

        if (client) {
            return res.status(200).send("WhatsApp client is already connected.");
        }

        // Set up a timeout for the connection attempt
        const connectionPromise = singularWhatsappSessionManager.createWAClient(
            sessionId,
            async (qrImage) => {
                res.json({
                    message: "Scan this QR code to connect your WhatsApp",
                    qrCodeImage: qrImage,
                });
            },
            async () => {
                console.log(`WhatsApp client for user ${sessionId} is ready!`);
                await WhatsappSession.findOneAndUpdate(
                    { userId: sessionId },
                    { sessionReady: true },
                    { upsert: true, new: true }
                ).exec();
            }
        );

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection attempt timed out')), 60000)
        );

        await Promise.race([connectionPromise, timeoutPromise]);

    } catch (error) {
        console.error('Error connecting WhatsApp client:', error);
        // Attempt to clean up the failed session
        await singularWhatsappSessionManager.destroySession(sessionId);
        res.status(500).send('Failed to connect WhatsApp client: ' + error.message);
    }
});

app.get('/whatsapp/status', authenticate, async (req, res) => {
    try {
        const whatsappSession = await WhatsappSession.findOne({ userId: req.userId });
        const user = await User.findById(req.userId);

        // Check user subscription
        if (user.subscription.plan === 'free') {
            return res.status(403).send(
                { message: 'Please upgrade to a paid plan to use this feature' }
            )
        }

        if (!whatsappSession) {
            return res.status(200).json({ status: "Client not found" });
        }

        res.json({
            status: whatsappSession.sessionReady ? "ready" : "pending",
        });
    } catch (error) {
        console.error("Error retrieving WhatsApp session status:", error);
        res.status(500).send("Failed to retrieve WhatsApp session status");
    }
});

// Add Contact Data
app.post('/contacts', authenticate, async (req, res) => {
    try {
        const { nama, nomor_wa, flag } = req.body;

        const contact = new Contact({
            userId: req.userId,
            nama,
            nomor_wa,
            flag,
        });

        await contact.save();
        res.status(201).send('Contact added');
    } catch (error) {
        console.error('Error adding contact:', error);
        res.status(500).send('Error adding contact');
    }
});

// Get Contacts
app.get('/contacts', authenticate, async (req, res) => {
    try {
        const contacts = await Contact.find({ userId: req.userId });
        res.json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).send('Error fetching contacts');
    }
});

// Delete Contact
app.delete('/contacts/:id', authenticate, async (req, res) => {
    try {
        const contact = await
            Contact.findOneAndDelete({ _id: req.params.id, userId: req.userId });

        if (!contact) {
            return res.status(404).send('Contact not found');
        }

        res.send('Contact deleted');
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).send('Error deleting contact');
    }
});

// Update Contact
app.put('/contacts/:id', authenticate, async (req, res) => {
    try {
        const contact = await
            Contact
                .findOneAndUpdate(
                    { _id: req.params.id, userId: req.userId },
                    req.body,
                    { new: true }
                );

        if (!contact) {
            return res.status(404).send('Contact not found');
        }

        res.json(contact);
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).send('Error updating contact');
    }
});

// Add Message List
app.post('/message-list', authenticate, async (req, res) => {
    try {
        const { title_message, message_text, message_media } = req.body;

        const messageList = new MessageList({
            userId: req.userId,
            title_message,
            message_text,
            message_media,
            created_at: new Date(),
        });

        await messageList.save();
        res.status(201).send('Message list added');
    } catch (error) {
        console.error('Error adding message list:', error);
        res.status(500).send('Error adding message list');
    }
});

// Get Message List
app.get('/message-list', authenticate, async (req, res) => {
    try {
        const messageList = await MessageList.find({ userId: req.userId });
        res.json(messageList);
    } catch (error) {
        console.error('Error fetching message list:', error);
        res.status(500).send('Error fetching message list');
    }
});

// Delete Message List
app.delete('/message-list/:id', authenticate, async (req, res) => {
    try {
        const messageList = await
            MessageList.findOneAndDelete({ _id: req.params.id, userId: req.userId });

        if (!messageList) {
            return res.status(404).send('Message list not found');
        }

        res.send('Message list deleted');
    } catch (error) {
        console.error('Error deleting message list:', error);
        res.status(500).send('Error deleting message list');
    }
});

// Update Message List
app.put('/message-list/:id', authenticate, async (req, res) => {
    try {
        const messageList = await
            MessageList
                .findOneAndUpdate(
                    { _id: req.params.id, userId: req.userId },
                    req.body,
                    { new: true }
                );

        if (!messageList) {
            return res.status(404).send('Message list not found');
        }

        res.json(messageList);
    } catch (error) {
        console.error('Error updating message list:', error);
        res.status(500).send('Error updating message list');
    }
});

// Blast Messages to Contacts
// app.post('/blast', authenticate, async (req, res) => {
//     const { messageListId, contactIds, scheduleTime } = req.body;
//     const sessionId = req.userId;

//     try {
//         // Fetch the message from MessageList
//         const messageList = await MessageList.findOne({ _id: messageListId, userId: req.userId });
//         if (!messageList) {
//             return res.status(404).send("Message template not found or doesn't belong to the user.");
//         }

//         // Validate and fetch contacts
//         const contacts = await Contact.find({
//             _id: { $in: contactIds },
//             userId: req.userId
//         });

//         if (contacts.length !== contactIds.length) {
//             return res.status(400).send("One or more contact IDs are invalid or do not belong to the user.");
//         }

//         if (scheduleTime) {
//             // Create a scheduled broadcast
//             const utcScheduleTime = moment.tz(scheduleTime, "Asia/Jakarta").utc().toDate();
//             const scheduledBroadcast = new ScheduledBroadcast({
//                 userId: req.userId,
//                 messageListId,
//                 contactIds,
//                 scheduledTime: utcScheduleTime
//             });
//             await scheduledBroadcast.save();
//             return res.status(201).send('Broadcast scheduled successfully');
//         }
//         else {

//             let client = singularWhatsappSessionManager.getClientFromSessionId(sessionId);

//             const session = await WhatsappSession.findOne({ userId: sessionId });

//             if (!session || !session.sessionReady) {
//                 return res.status(400).send("WhatsApp client is not ready. Please connect your WhatsApp first.");
//             }

//             if (!client || !singularWhatsappSessionManager.isClientReady(sessionId)) {
//                 console.log("WhatsApp client is not ready. Attempting to reconnect...");
//                 client = await singularWhatsappSessionManager.createWAClient(
//                     sessionId,
//                     async (qrImage) => {
//                         console.log("New QR code generated for reconnection");
//                         // You might want to implement a way to send this QR code to the user
//                     },
//                     async () => {
//                         console.log(`WhatsApp client for user ${sessionId} is ready after reconnection!`);
//                         await WhatsappSession.findOneAndUpdate(
//                             { userId: sessionId },
//                             { sessionReady: true },
//                             { upsert: true, new: true }
//                         ).exec();
//                     }
//                 );
//             }

//             // Wait for the client to be fully ready
//             try {
//                 await singularWhatsappSessionManager.waitForClientReady(sessionId, 30000); // 30 seconds timeout
//             } catch (error) {
//                 console.error("Timeout waiting for WhatsApp client to be ready:", error);
//                 return res.status(500).send("WhatsApp client is not ready. Please try again later.");
//             }

//             res.send('Messages are being sent');

//             // Prepare media if exists
//             let media = null;
//             if (messageList.message_media) {
//                 // Assuming the base64 string doesn't include the "data:image/jpeg;base64," prefix
//                 media = new MessageMedia('image/jpeg', messageList.message_media, 'image.jpg');
//             }

//             for (const contact of contacts) {
//                 let nomor_wa = contact.nomor_wa;
//                 if (nomor_wa.startsWith('8')) {
//                     nomor_wa = '62' + nomor_wa + "@c.us";
//                 } else if (nomor_wa.startsWith('0')) {
//                     nomor_wa = '62' + nomor_wa.substring(1) + "@c.us";
//                 } else if (nomor_wa.startsWith('+')) {
//                     nomor_wa = nomor_wa.substring(1) + "@c.us";
//                 } else if (!nomor_wa.includes('@c.us')) {
//                     nomor_wa = nomor_wa + "@c.us";
//                 }

//                 // Personalize the message by replacing {name} with the contact's name
//                 let personalizedMessage = messageList.message_text.replace(/{nama}/g, contact.nama);

//                 await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay

//                 try {
//                     if (media) {
//                         const sentMessage = await client.sendMessage(nomor_wa, media, { caption: personalizedMessage });
//                         const message = new Message({
//                             userId: req.userId,
//                             contactId: contact._id,
//                             msgSerializedId: sentMessage.id._serialized,
//                             content: personalizedMessage,
//                             status: 'sent',
//                             sentAt: new Date(),
//                         });
//                         await message.save();
//                         // console.log(`Message sent to ${nomor_wa} with ID: ${sentMessage.id._serialized}`);
//                     } else {
//                         const sentMessage = await client.sendMessage(nomor_wa, personalizedMessage);
//                         const message = new Message({
//                             userId: req.userId,
//                             contactId: contact._id,
//                             msgSerializedId: sentMessage.id._serialized,
//                             content: personalizedMessage,
//                             status: 'sent',
//                             sentAt: new Date(),
//                         });
//                         await message.save();
//                         // console.log(`Message sent to ${nomor_wa} with ID: ${sentMessage.id._serialized}`);
//                     }

                    

//                 } catch (error) {
//                     console.error(`Failed to send message to ${nomor_wa}:`, error);

//                     const message = new Message({
//                         userId: req.userId,
//                         contactId: contact._id,
//                         msgSerializedId: null,
//                         content: personalizedMessage,
//                         status: 'failed',
//                         sentAt: new Date(),
//                     });
//                     await message.save();
//                 }
//             }
//         }
//     } catch (error) {
//         console.error('Error in blast operation:', error);
//         res.status(500).send('Error in blast operation');
//     }
// });

app.post('/blast', authenticate, async (req, res) => {
    const { messageListId, contactIds, scheduleTime } = req.body;
    const sessionId = req.userId;

    try {
        const messageList = await MessageList.findOne({ _id: messageListId, userId: sessionId });
        if (!messageList) {
            return res.status(404).send("Message template not found");
        }

        const contacts = await Contact.find({ _id: { $in: contactIds }, userId: sessionId });
        if (contacts.length !== contactIds.length) {
            return res.status(400).send("Invalid contact IDs");
        }

        if (scheduleTime) {
            const utcScheduleTime = moment.tz(scheduleTime, "Asia/Jakarta").utc().toDate();
            const scheduledBroadcast = new ScheduledBroadcast({
                userId: sessionId,
                messageListId,
                contactIds,
                scheduledTime: utcScheduleTime
            });
            await scheduledBroadcast.save();
            return res.status(201).send('Broadcast scheduled successfully');
        } else {
            res.send('Messages are being sent');
            // Create a new client if it doesn't exist
            let client = singularWhatsappSessionManager.getClientFromSessionId(sessionId);
            const session = await WhatsappSession.findOne({ userId
            : sessionId });

            if (!client || !singularWhatsappSessionManager.isClientReady(sessionId)) {
                console.log(`Client not found for user ${sessionId}, creating client...`);

                // Create a new client
                try {
                    await singularWhatsappSessionManager.createWAClient(
                        sessionId,
                        async () => { },
                        async () => { }
                    );

                    // Wait for the client to be ready
                    await singularWhatsappSessionManager.waitForClientReady(sessionId, 30000); // 30 seconds timeout
                    client = singularWhatsappSessionManager.getClientFromSessionId(sessionId); // Update client reference after creation

                    if (!client) {
                        console.error(`Client could not be created for user ${sessionId}`);
                        return res.status(500).send('Error creating WhatsApp client');
                    }

                } catch (error) {
                    console.error("Error creating or waiting for WhatsApp client to be ready:", error);
                    return res.status(500).send('Error creating WhatsApp client');
                }
            }

            // Ensure the client is ready
            try {
                await singularWhatsappSessionManager.waitForClientReady(sessionId, 30000);
            } catch (error) {
                console.error("Timeout waiting for WhatsApp client to be ready:", error);
                return res.status(500).send('WhatsApp client is not ready');
            }

            // Prepare media if exists
            let media = null;
            if (messageList.message_media) {
                // Assuming the base64 string doesn't include the "data:image/jpeg;base64," prefix
                media = new MessageMedia('image/jpeg', messageList.message_media, 'image.jpg');
            }

            for (const contact of contacts) {
                let nomor_wa = contact.nomor_wa;
                if (nomor_wa.startsWith('8')) {
                    nomor_wa = '62' + nomor_wa + "@c.us";
                } else if (nomor_wa.startsWith('0')) {
                    nomor_wa = '62' + nomor_wa.substring(1) + "@c.us";
                } else if (nomor_wa.startsWith('+')) {
                    nomor_wa = nomor_wa.substring(1) + "@c.us";
                } else if (!nomor_wa.includes('@c.us')) {
                    nomor_wa = nomor_wa + "@c.us";
                }

                // Personalize the message by replacing {name} with the contact's name
                let personalizedMessage = messageList.message_text.replace(/{nama}/g, contact.nama);

                await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay

                try {
                    if (media) {
                        const sentMessage = await client.sendMessage(nomor_wa, media, { caption: personalizedMessage });
                        const message = new Message({
                            userId: sessionId,
                            contactId: contact._id,
                            msgSerializedId: sentMessage.id._serialized,
                            content: personalizedMessage,
                            status: 'sent',
                            sentAt: new Date(),
                        });
                        await message.save();
                        // console.log(`Message sent to ${nomor_wa} with ID: ${sentMessage.id._serialized}`);
                    } else {
                        const sentMessage = await client.sendMessage(nomor_wa, personalizedMessage);
                        const message = new Message({
                            userId: sessionId,
                            contactId: contact._id,
                            msgSerializedId: sentMessage.id._serialized,
                            content: personalizedMessage,
                            status: 'sent',
                            sentAt: new Date(),
                        });
                        await message.save();
                        // console.log(`Message sent to ${nomor_wa} with ID: ${sentMessage.id._serialized}`);
                    }

                } catch (error) {
                    console.error(`Failed to send message to ${nomor_wa}:`, error);

                    const message = new Message({
                        userId: sessionId,
                        contactId: contact._id,
                        msgSerializedId: null,
                        content: personalizedMessage,
                        status: 'failed',
                        sentAt: new Date(),
                    });
                    await message.save();
                }
            }

        }
    } catch (error) {
        console.error('Error in blast operation:', error);
        res.status(500).send('Error in blast operation');
    }
});

// Get blast history
app.get('/blast-history', authenticate, async (req, res) => {
    try {
        // Find messages and sort by sentAt date
        const messages = await ScheduledBroadcast.find({ userId: req.userId }).sort({ scheduledTime: -1 }).populate('messageListId');
        res.json(messages);
    } catch (error) {
        console.error('Error fetching blast history:', error);
        res.status(500).send('Error fetching blast history');
    }
});




app.post('/message-ack', async (req, res) => {
    try {
        const { messageId, status, contactId, userId } = req.body;

        // Update the message status in the database
        await Message.findOneAndUpdate(
            { _id: messageId, userId },
            { status: status },
            { new: true }
        );

        res.status(200).send('Message status updated');
    } catch (error) {
        console.error('Error updating message status:', error);
        res.status(500).send('Error updating message status');
    }
});

// Endpoint for cron job to check message status
app.get('/cron/check-message-status', async (req, res) => {
    try {
        // Find all messages with status 'sent'
        const messages = await Message.find({ status: 'sent' });
        console.log(messages);
        console.log('Checking message status for', messages.length, 'messages...');

        for (const message of messages) {
            let client = singularWhatsappSessionManager.getClientFromSessionId(message.userId);
            const sessionId = message.userId;

            if (!client) {
                console.log(`Client not found for user ${sessionId}, creating client...`);

                // Create a new client
                try {
                    await singularWhatsappSessionManager.createWAClient(
                        sessionId,
                        async () => { },
                        async () => { }
                    );

                    // Wait for the client to be ready
                    await singularWhatsappSessionManager.waitForClientReady(sessionId, 30000); // 30 seconds timeout
                    client = singularWhatsappSessionManager.getClientFromSessionId(sessionId); // Update client reference after creation

                    if (!client) {
                        console.error(`Client could not be created for user ${sessionId}`);
                        continue; // Skip to next iteration if client couldn't be created
                    }

                } catch (error) {
                    console.error("Error creating or waiting for WhatsApp client to be ready:", error);
                    continue; // Skip to next iteration if there is an issue with the client
                }
            }

            // Ensure the client is ready
            try {
                await singularWhatsappSessionManager.waitForClientReady(sessionId, 30000);
            } catch (error) {
                console.error("Timeout waiting for WhatsApp client to be ready:", error);
                continue; // Skip to the next iteration if client is not ready
            }

            // Check message status
            try {
                if (message.msgSerializedId) {
                    const sentMessage = await client.getMessageById(message.msgSerializedId);
                    if (sentMessage) {
                        console.log('Message status:', sentMessage.ack);

                        // Update the status based on acknowledgment value
                        const statusMap = {
                            0: 'pending',
                            1: 'server',
                            2: 'device',
                            3: 'read',
                            4: 'played'
                        };
                        const newStatus = statusMap[sentMessage.ack] || 'unknown';

                        await Message.findByIdAndUpdate(message._id, { status: newStatus });
                    } else {
                        console.error(`Message not found with ID: ${message.msgSerializedId}`);
                    }
                } else {
                    console.error(`No serialized message ID found for message: ${message._id}`);
                }
            } catch (error) {
                console.error('Error checking message status:', error);
            }
        }

        res.status(200).send('Message status updated successfully');
    } catch (error) {
        console.error('Error checking message status:', error);
        res.status(500).send('Error checking message status');
    }
});

async function processScheduledBroadcasts() {
    const now = new Date();
    const scheduledBroadcasts = await ScheduledBroadcast.find({
        scheduledTime: { $lte: now },
        status: 'pending'
    });

    for (const broadcast of scheduledBroadcasts) {
        try {
            broadcast.status = 'processing';
            await broadcast.save();

            const messageList = await MessageList.findById(broadcast.messageListId);
            const contacts = await Contact.find({ _id: { $in: broadcast.contactIds } });

            // Use your existing blast logic here
            let client = singularWhatsappSessionManager.getClientFromSessionId(broadcast.userId);
            const session = await WhatsappSession.findOne({ userId: broadcast.userId });
            
            if (!client || !singularWhatsappSessionManager.isClientReady(broadcast.userId)) {
                console.log("WhatsApp client is not ready. Attempting to reconnect...");
                client = await singularWhatsappSessionManager.createWAClient(
                    broadcast.userId,
                    async (qrImage) => {
                        console.log("New QR code generated for reconnection");
                        // You might want to implement a way to send this QR code to the user
                    },
                    async () => {
                        console.log(`WhatsApp client for user ${broadcast.userId} is ready after reconnection!`);
                        await WhatsappSession.findOneAndUpdate(
                            { userId: broadcast.userId },
                            { sessionReady: true },
                            { upsert: true, new: true }
                        ).exec();
                    }
                );

            // Wait for the client to be fully ready
            try {
                await singularWhatsappSessionManager.waitForClientReady(broadcast.userId, 40000); // 30 seconds timeout
            } catch (error) {
                console.error("Timeout waiting for WhatsApp client to be ready:", error);
                continue; // Skip to next iteration if client is not ready
            }

            // Prepare media if exists
            let media = null;
            if (messageList.message_media) {
                // Assuming the base64 string doesn't include the "data:image/jpeg;base64," prefix
                media = new MessageMedia('image/jpeg', messageList.message_media, 'image.jpg');
            }

            for (const contact of contacts) {
                let nomor_wa = contact.nomor_wa;
                if (nomor_wa.startsWith('8')) {
                    nomor_wa = '62' + nomor_wa + "@c.us";
                } else if (nomor_wa.startsWith('0')) {
                    nomor_wa = '62' + nomor_wa.substring(1) + "@c.us";
                } else if (nomor_wa.startsWith('+')) {
                    nomor_wa = nomor_wa.substring(1) + "@c.us";
                } else if (!nomor_wa.includes('@c.us')) {
                    nomor_wa = nomor_wa + "@c.us";
                }

                // Personalize the message by replacing {name} with the contact's name
                let personalizedMessage = messageList.message_text.replace(/{nama}/g, contact.nama);

                await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay

                try {
                    if (media) {
                        const sentMessage = await client.sendMessage(nomor_wa, media, { caption: personalizedMessage });
                        const message = new Message({
                            userId: broadcast.userId,
                            contactId: contact._id,
                            msgSerializedId: sentMessage.id._serialized,
                            content: personalizedMessage,
                            status: 'sent',
                            sentAt: new Date(),
                        });
                        await message.save();
                        // console.log(`Message sent to ${nomor_wa} with ID: ${sentMessage.id._serialized}`);
                    } else {
                        const sentMessage = await client.sendMessage(nomor_wa, personalizedMessage);
                        const message = new Message({
                            userId: broadcast.userId,
                            contactId: contact._id,
                            msgSerializedId: sentMessage.id._serialized,
                            content: personalizedMessage,
                            status: 'sent',
                            sentAt: new Date(),
                        });
                        await message.save();
                        // console.log(`Message sent to ${nomor_wa} with ID: ${sentMessage.id._serialized}`);
                    }

                } catch (error) {
                    console.error(`Failed to send message to ${nomor_wa}:`, error);

                    const message = new Message({
                        userId: broadcast.userId,
                        contactId: contact._id,
                        msgSerializedId: null,
                        content: personalizedMessage,
                        status: 'failed',
                        sentAt: new Date(),
                    });
                    await message.save();
                }
            }
        }
            broadcast.status = 'completed';
            await broadcast.save();

        } catch (error) {
            console.error('Error processing scheduled broadcast:', error);
            broadcast.status = 'failed';
            await broadcast.save();
        }
    }
}

cron.schedule('* * * * *', async () => {
    console.log('Checking for scheduled broadcasts...');
    await processScheduledBroadcasts();
});


// Endpoint to get scheduled broadcasts
app.get('/scheduled-broadcasts', authenticate, async (req, res) => {
    try {
        const scheduledBroadcasts = await ScheduledBroadcast.find({ userId: req.userId });
        res.json(scheduledBroadcasts);
    } catch (error) {
        console.error('Error fetching scheduled broadcasts:', error);
        res.status(500).send('Error fetching scheduled broadcasts');
    }
});

// Endpoint to cancel a scheduled broadcast
app.delete('/scheduled-broadcasts/:id', authenticate, async (req, res) => {
    try {
        const broadcast = await ScheduledBroadcast.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
            status: 'pending'
        });

        if (!broadcast) {
            return res.status(404).send('Scheduled broadcast not found or cannot be cancelled');
        }

        res.send('Scheduled broadcast cancelled successfully');
    } catch (error) {
        console.error('Error cancelling scheduled broadcast:', error);
        res.status(500).send('Error cancelling scheduled broadcast');
    }
});

        


app.listen(3000, () => {
    console.log('Server running on port 3000');
});