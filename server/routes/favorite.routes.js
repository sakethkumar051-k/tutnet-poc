const express = require('express');
const router = express.Router();
const {
    getFavorites,
    addFavorite,
    removeFavorite,
    checkFavorite
} = require('../controllers/favorite.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);
router.use(authorize('student'));

router.get('/', getFavorites);
router.post('/', addFavorite);
router.delete('/:tutorId', removeFavorite);
router.get('/check/:tutorId', checkFavorite);

module.exports = router;

