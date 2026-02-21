const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Ensure one favorite per student-tutor pair
favoriteSchema.index({ studentId: 1, tutorId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);

