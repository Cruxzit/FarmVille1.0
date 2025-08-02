const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');
const { autenticar } = require('../middlewares/auth');

// Rota de ranking é pública
router.get('/ranking', rankingController.paginaRanking);

// Rotas protegidas
router.get('/conquistas', autenticar, rankingController.paginaConquistas);
router.get('/loja', autenticar, rankingController.paginaLoja);

module.exports = router;
