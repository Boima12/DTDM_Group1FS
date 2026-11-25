const express = require('express');
const router = express.Router();
const { register, login, demoLogin, getMe, updateProfile } = require('../controllers/authController.js');
const { attachUser } = require('../middleware/auth.js');

router.post('/register', register);
router.post('/login', login);
router.post('/demo', demoLogin);
router.get('/me', attachUser, getMe);
router.patch('/profile', attachUser, updateProfile);

module.exports = router;
