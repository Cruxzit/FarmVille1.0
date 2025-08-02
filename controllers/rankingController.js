const Usuario = require('../models/Usuario');
const Conquista = require('../models/Conquista');
const Recurso = require('../models/Recurso');
const con = require('../database/connection');
/**
 * Controller para a página de conquistas
 */
exports.paginaConquistas = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const conquistas = await Conquista.listarPorUsuario(userId);
        
        res.render('jogo/conquistas', { 
            title: 'Conquistas', 
            user: req.session.user,
            conquistas
        });
    } catch (err) {
        console.error('Erro ao carregar conquistas:', err);
        res.render('jogo/conquistas', { 
            title: 'Conquistas', 
            user: req.session.user,
            conquistas: [],
            erro: 'Erro ao carregar conquistas.'
        });
    }
};

/**
 * Controller para a página de ranking
 */
exports.paginaRanking = async (req, res) => {
    try {
        const ranking = await Usuario.obterRanking(20);
        
        // Se o usuário está logado, encontrar a sua posição no ranking
        let posicaoUsuario = null;
        if (req.session.user) {
            const userId = req.session.user.id;
            for (let i = 0; i < ranking.length; i++) {
                if (ranking[i].id === userId) {
                    posicaoUsuario = i + 1;
                    break;
                }
            }
        }
        
        res.render('jogo/ranking', { 
            title: 'Ranking Global', 
            user: req.session.user,
            ranking,
            posicaoUsuario
        });
    } catch (err) {
        console.error('Erro ao carregar ranking:', err);
        res.render('jogo/ranking', { 
            title: 'Ranking Global', 
            user: req.session.user,
            ranking: [],
            erro: 'Erro ao carregar ranking.'
        });
    }
};

/**
 * Controller para a página de loja
 */
exports.paginaLoja = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const recursos = await Recurso.obterPorUsuario(userId);
        
        // Obter informações atualizadas do usuário
        const utilizador = await Usuario.buscarPorId(userId);
        if (utilizador) {
            // Atualizar dados na sessão
            const usuarioAtualizado = { ...utilizador };
            delete usuarioAtualizado.password;
            req.session.user = usuarioAtualizado;
        }
        
        res.render('jogo/loja', { 
            title: 'Loja', 
            user: req.session.user,
            recursos
        });
    } catch (err) {
        console.error('Erro ao carregar loja:', err);
        res.render('jogo/loja', { 
            title: 'Loja', 
            user: req.session.user,
            recursos: [],
            erro: 'Erro ao carregar loja.'
        });
    }
};
