/**
 * Uploads Controller — local-disk file storage for MVP.
 *
 * Files go under server/uploads/<category>/<userId>/<uniqueName>.
 * Tutors upload qualification documents (degree scans, certs).
 * For production, swap the `storage` strategy to S3/Cloudinary — only this
 * file needs to change; endpoints stay identical.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const TutorProfile = require('../models/TutorProfile');
const { safe500, sendError } = require('../utils/responseHelpers');

const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
]);

const storage = multer.diskStorage({
    destination(req, _file, cb) {
        const category = req.params.category === 'qualification' ? 'qualification' : 'misc';
        const userDir = path.join(UPLOAD_ROOT, category, String(req.user._id));
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        cb(null, userDir);
    },
    filename(_req, file, cb) {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80);
        const suffix = crypto.randomBytes(6).toString('hex');
        cb(null, `${Date.now()}-${suffix}-${safe}`);
    }
});

const uploader = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
    fileFilter(_req, file, cb) {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            return cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
        cb(null, true);
    }
}).single('file');

// POST /api/uploads/:category
// category = 'qualification' | future: 'profile-photo' etc.
const uploadFile = (req, res) => {
    uploader(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Upload failed', code: 'UPLOAD_FAILED' });
        }
        if (!req.file) return res.status(400).json({ message: 'No file uploaded', code: 'NO_FILE' });
        try {
            const relPath = path.relative(path.resolve(__dirname, '..'), req.file.path).replace(/\\/g, '/');
            const publicUrl = `/uploads/${path.relative(UPLOAD_ROOT, req.file.path).replace(/\\/g, '/')}`;
            const meta = {
                originalName: req.file.originalname,
                storedAt: req.file.path,
                path: relPath,
                url: publicUrl,
                mimeType: req.file.mimetype,
                size: req.file.size,
                category: req.params.category,
                uploadedAt: new Date()
            };

            // For qualification uploads on tutor accounts, persist a pointer on the TutorProfile.
            if (req.params.category === 'qualification' && req.user.role === 'tutor') {
                await TutorProfile.updateOne(
                    { userId: req.user._id },
                    { $push: { qualificationDocs: {
                        title: req.body?.title || req.file.originalname,
                        url: publicUrl,
                        mimeType: req.file.mimetype,
                        uploadedAt: new Date()
                    } } },
                    { upsert: false }
                );
            }

            res.status(201).json({ file: meta });
        } catch (persistErr) {
            return safe500(res, persistErr, '[uploadFile]');
        }
    });
};

// DELETE /api/uploads/qualification — body: { url }
// Only removes the pointer on TutorProfile. File-on-disk cleanup is skipped for MVP safety.
const deleteQualificationDoc = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return sendError(res, 400, 'url is required', 'VALIDATION');
        await TutorProfile.updateOne(
            { userId: req.user._id },
            { $pull: { qualificationDocs: { url } } }
        );
        res.json({ ok: true });
    } catch (err) {
        return safe500(res, err, '[deleteQualificationDoc]');
    }
};

module.exports = { uploadFile, deleteQualificationDoc, UPLOAD_ROOT };
