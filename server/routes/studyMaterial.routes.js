const express = require('express');
const router = express.Router();
const {
    getStudyMaterials,
    getStudyMaterialById,
    createStudyMaterial,
    updateStudyMaterial,
    deleteStudyMaterial,
    getMaterialsByTutor
} = require('../controllers/studyMaterial.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// Public routes
router.get('/', getStudyMaterials);
router.get('/:id', getStudyMaterialById);

// Protected routes
router.post('/', protect, authorize('tutor', 'admin'), createStudyMaterial);
router.put('/:id', protect, authorize('tutor', 'admin'), updateStudyMaterial);
router.delete('/:id', protect, authorize('tutor', 'admin'), deleteStudyMaterial);
router.get('/tutor/:tutorId', getMaterialsByTutor);

module.exports = router;

