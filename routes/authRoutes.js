const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rotas de autenticação
router.get('/login', authController.paginaLogin);
router.get('/registro', authController.paginaRegistro);
router.post('/login', authController.login);
router.post('/registro', authController.registro);
router.get('/logout', authController.logout);
router.get('/perfil', authController.perfil);

module.exports = router;
