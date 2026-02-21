const Notification = require('../models/Notification');

// Helper function to create a notification
const createNotification = async ({
    userId,
    type,
    title,
    message,
    link,
    bookingId
}) => {
    try {
        await Notification.create({
            userId,
            type,
            title,
            message,
            link,
            bookingId
        });

        console.log(`✅ Notification created: ${type} for user ${userId}`);
        return true;
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        return false;
    }
};

module.exports = { createNotification };
