const express = require('express');
const router = express.Router();
const jogoController = require('../controllers/jogoController');
const { autenticar } = require('../middlewares/auth');

// Proteger todas as rotas neste arquivo
router.use(autenticar);

// Rotas de jogo para páginas
router.get('/agricultura', jogoController.paginaAgricultura);
router.get('/mineracao', jogoController.paginaMineracao);
router.get('/floresta', jogoController.paginaFloresta);
router.get('/conquistas', jogoController.paginaConquistas);
router.get('/loja', jogoController.paginaLoja);
router.post('/vender-tudo', autenticar, jogoController.venderTudo);

// Rotas de API para ações de jogo
router.post('/coletar', jogoController.coletar);
router.post('/vender', jogoController.vender);
router.post('/melhorar', jogoController.melhorarProducao);
router.get('/verificar-conquistas', jogoController.verificarConquistas);
router.get('/api/recursos', jogoController.obterRecursos);

module.exports = router;
