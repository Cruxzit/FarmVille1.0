const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota raiz
router.get('/', authController.inicio);

module.exports = router;
