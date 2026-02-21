const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { createGoal, getMyGoals, getStudentGoals, updateGoal, deleteGoal } = require('../controllers/learningGoal.controller');

router.use(protect);

router.post('/', authorize('student'), createGoal);
router.get('/my', authorize('student'), getMyGoals);
router.get('/students', authorize('tutor'), getStudentGoals);
router.patch('/:id', updateGoal);
router.delete('/:id', authorize('student'), deleteGoal);

module.exports = router;
