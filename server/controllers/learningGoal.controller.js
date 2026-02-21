const LearningGoal = require('../models/LearningGoal');
const CurrentTutor = require('../models/CurrentTutor');

// @desc  Create a learning goal (student)
// @route POST /api/goals
const createGoal = async (req, res) => {
    try {
        const { subject, title, description, targetDate, tutorId } = req.body;
        if (!subject?.trim() || !title?.trim())
            return res.status(400).json({ message: 'subject and title are required' });

        const goal = await LearningGoal.create({
            studentId: req.user.id,
            tutorId: tutorId || null,
            subject,
            title,
            description,
            targetDate: targetDate ? new Date(targetDate) : null
        });
        res.status(201).json(goal);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Get goals for logged-in student
// @route GET /api/goals/my
const getMyGoals = async (req, res) => {
    try {
        const goals = await LearningGoal.find({ studentId: req.user.id })
            .populate('tutorId', 'name')
            .sort({ createdAt: -1 });
        res.json(goals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Get goals of tutor's students (tutor sees their matched students' goals)
// @route GET /api/goals/students
const getStudentGoals = async (req, res) => {
    try {
        // Get all students matched with this tutor
        const matches = await CurrentTutor.find({ tutorId: req.user.id }).select('studentId');
        const studentIds = matches.map(m => m.studentId);

        const goals = await LearningGoal.find({
            $or: [
                { tutorId: req.user.id },
                { studentId: { $in: studentIds } }
            ]
        })
            .populate('studentId', 'name')
            .sort({ createdAt: -1 });
        res.json(goals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Update goal status or progress (student or tutor)
// @route PATCH /api/goals/:id
const updateGoal = async (req, res) => {
    try {
        const goal = await LearningGoal.findById(req.params.id);
        if (!goal) return res.status(404).json({ message: 'Goal not found' });

        const isStudent = goal.studentId.toString() === req.user.id;
        const isTutor = goal.tutorId?.toString() === req.user.id;
        if (!isStudent && !isTutor)
            return res.status(403).json({ message: 'Not authorized' });

        const { status, percentComplete, note } = req.body;

        if (status) goal.status = status;
        if (percentComplete !== undefined) goal.percentComplete = Math.max(0, Math.min(100, Number(percentComplete)));

        if (note?.trim()) {
            goal.progressNotes.push({
                note,
                addedBy: req.user.id,
                addedByRole: req.user.role
            });
        }

        // Auto-set status to achieved when 100%
        if (goal.percentComplete === 100 && goal.status !== 'achieved') {
            goal.status = 'achieved';
        }

        await goal.save();
        res.json(goal);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Delete a goal (student only)
// @route DELETE /api/goals/:id
const deleteGoal = async (req, res) => {
    try {
        const goal = await LearningGoal.findById(req.params.id);
        if (!goal) return res.status(404).json({ message: 'Goal not found' });
        if (goal.studentId.toString() !== req.user.id)
            return res.status(403).json({ message: 'Not authorized' });
        await goal.deleteOne();
        res.json({ message: 'Goal deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { createGoal, getMyGoals, getStudentGoals, updateGoal, deleteGoal };
