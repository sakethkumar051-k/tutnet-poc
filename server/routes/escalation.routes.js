const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
    raiseEscalation,
    getMyEscalations,
    getAllEscalations,
    updateEscalation
} = require('../controllers/escalation.controller');

router.use(protect);

router.post('/', raiseEscalation);
router.get('/my', getMyEscalations);
router.get('/', authorize('admin'), getAllEscalations);
router.patch('/:id', authorize('admin'), updateEscalation);

module.exports = router;
