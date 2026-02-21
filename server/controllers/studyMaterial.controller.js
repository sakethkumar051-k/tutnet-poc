const StudyMaterial = require('../models/StudyMaterial');

// @desc    Get all study materials
// @route   GET /api/study-materials
// @access  Public
const getStudyMaterials = async (req, res) => {
    try {
        const { subject, classGrade, tutorId } = req.query;
        const filter = { isPublic: true };

        if (subject) filter.subject = subject;
        if (classGrade) filter.classGrade = classGrade;
        if (tutorId) filter.tutorId = tutorId;

        const materials = await StudyMaterial.find(filter)
            .populate('uploadedBy', 'name email')
            .populate('tutorId', 'name')
            .sort({ createdAt: -1 });

        res.json(materials);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get study material by ID
// @route   GET /api/study-materials/:id
// @access  Public
const getStudyMaterialById = async (req, res) => {
    try {
        const material = await StudyMaterial.findById(req.params.id)
            .populate('uploadedBy', 'name email')
            .populate('tutorId', 'name');

        if (!material) {
            return res.status(404).json({ message: 'Study material not found' });
        }

        // Increment download count
        material.downloadCount += 1;
        await material.save();

        res.json(material);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create study material
// @route   POST /api/study-materials
// @access  Private (Tutor/Admin)
const createStudyMaterial = async (req, res) => {
    try {
        const material = await StudyMaterial.create({
            ...req.body,
            uploadedBy: req.user.id,
            tutorId: req.user.role === 'tutor' ? req.user.id : req.body.tutorId
        });

        const populated = await StudyMaterial.findById(material._id)
            .populate('uploadedBy', 'name email')
            .populate('tutorId', 'name');

        res.status(201).json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update study material
// @route   PUT /api/study-materials/:id
// @access  Private (Tutor/Admin)
const updateStudyMaterial = async (req, res) => {
    try {
        const material = await StudyMaterial.findById(req.params.id);

        if (!material) {
            return res.status(404).json({ message: 'Study material not found' });
        }

        // Check ownership or admin
        if (material.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updated = await StudyMaterial.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('uploadedBy', 'name email').populate('tutorId', 'name');

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete study material
// @route   DELETE /api/study-materials/:id
// @access  Private (Tutor/Admin)
const deleteStudyMaterial = async (req, res) => {
    try {
        const material = await StudyMaterial.findById(req.params.id);

        if (!material) {
            return res.status(404).json({ message: 'Study material not found' });
        }

        // Check ownership or admin
        if (material.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await StudyMaterial.findByIdAndDelete(req.params.id);
        res.json({ message: 'Study material deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get materials by tutor
// @route   GET /api/study-materials/tutor/:tutorId
// @access  Public
const getMaterialsByTutor = async (req, res) => {
    try {
        const materials = await StudyMaterial.find({ tutorId: req.params.tutorId, isPublic: true })
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(materials);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getStudyMaterials,
    getStudyMaterialById,
    createStudyMaterial,
    updateStudyMaterial,
    deleteStudyMaterial,
    getMaterialsByTutor
};

