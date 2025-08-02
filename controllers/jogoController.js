const con = require('../database/connection');
const Recurso = require('../models/Recurso');
const Conquista = require('../models/Conquista');
const Usuario = require('../models/Usuario');

/**
 * Controller para a página de agricultura
 */
exports.paginaAgricultura = (req, res) => {
    res.render('jogo/agricultura', { 
        title: 'Agricultura', 
        user: req.session.user 
    });
};

/**
 * Controller para a página de mineração
 */
exports.paginaMineracao = (req, res) => {
    res.render('jogo/mineracao', { 
        title: 'Mineração', 
        user: req.session.user 
    });
};

/**
 * Controller para a página de floresta
 */
exports.paginaFloresta = (req, res) => {
    res.render('jogo/floresta', { 
        title: 'Floresta', 
        user: req.session.user 
    });
};

/**
 * API para coletar recursos por clique
 */
exports.coletar = async (req, res) => {
    try {
        const { produto, acao } = req.body;
        const userId = req.session.user.id;
        
        // Se for apenas para verificar os recursos (usado na inicialização)
        if (acao === 'verificar') {
            const recursos = await Recurso.obterPorUsuario(userId);
            return res.json({ 
                sucesso: true, 
                recursos
            });
        }
        
        if (!produto) {
            return res.status(400).json({ erro: 'Nome do produto é obrigatório.' });
        }
        
        console.log(`Coletando ${produto} para o usuário ${userId}`);
        
        // Buscar o recurso para saber o nível de produção
        const recurso = await Recurso.obterRecurso(userId, produto);
        const quantidade = recurso?.nivel_producao || 1;
        await Recurso.adicionar(userId, produto, quantidade);
        
        // Buscar ID do produto para verificação de conquistas
        const recursoAtualizado = await Recurso.obterRecurso(userId, produto);
        
        if (!recursoAtualizado) {
            return res.status(400).json({ erro: 'Erro ao obter informações do recurso.' });
        }
        
        console.log(`Recurso obtido: ${JSON.stringify(recursoAtualizado)}`);
        
        // Verificar conquistas de coleta
        const { conquistasConcluidas } = await Conquista.verificarConquistasColeta(userId, recursoAtualizado.produto_id);
        
        // Dar experiência ao usuário por coletar recurso
        const experiencia = await Usuario.adicionarExperiencia(userId, 1);

        // Atualizar sessão com dados mais recentes do usuário
        const utilizadorAtualizado = await Usuario.buscarPorId(userId);
        if (utilizadorAtualizado) {
            delete utilizadorAtualizado.password;
            req.session.user = utilizadorAtualizado;
        }
        
        // Se subiu de nível, verificar conquistas de nível
        let conquistasNivel = [];
        if (experiencia.subiuDeNivel) {
            const resultado = await Conquista.verificarConquistasNivel(userId);
            conquistasNivel = resultado.conquistasConcluidas || [];
        }
        
        // Juntar todas as conquistas concluídas
        const todasConquistas = [...conquistasConcluidas, ...conquistasNivel];
        
        res.json({ 
            sucesso: true, 
            mensagem: `Você obteve ${quantidade} ${produto}!`,
            recursoAtual: recursoAtualizado.quantidade,
            quantidade,
            experiencia: experiencia,
            conquistasConcluidas: todasConquistas
        });
    } catch (err) {
        console.error('Erro ao coletar recurso:', err);
        res.status(500).json({ erro: 'Erro ao coletar recurso.', detalhes: err.message });
    }
};

/**
 * API para vender recursos
 */
exports.vender = async (req, res) => {
    try {
        const { produto, quantidade } = req.body;
        const userId = req.session.user.id;
        
        if (!produto || !quantidade) {
            return res.status(400).json({ erro: 'Produto e quantidade são obrigatórios.' });
        }
        
        const qtd = parseInt(quantidade);
        if (isNaN(qtd) || qtd <= 0) {
            return res.status(400).json({ erro: 'Quantidade deve ser um número positivo.' });
        }
        
        // Vender o recurso
        const venda = await Recurso.vender(userId, produto, qtd);
        
        // Verificar conquistas de venda
        const { conquistasConcluidas } = await Conquista.verificarConquistasVenda(userId);
        
        // Dar experiência ao usuário por vender recursos
        const experiencia = await Usuario.adicionarExperiencia(userId, Math.floor(qtd * 0.5));

        // Atualizar sessão com dados mais recentes do usuário
        const utilizadorAtualizado = await Usuario.buscarPorId(userId);
        if (utilizadorAtualizado) {
            delete utilizadorAtualizado.password;
            req.session.user = utilizadorAtualizado;
        }
        
        // Se subiu de nível, verificar conquistas de nível
        let conquistasNivel = [];
        if (experiencia.subiuDeNivel) {
            const resultado = await Conquista.verificarConquistasNivel(userId);
            conquistasNivel = resultado.conquistasConcluidas || [];
        }
        
        // Juntar todas as conquistas concluídas
        const todasConquistas = [...conquistasConcluidas, ...conquistasNivel];
        
        res.json({ 
            sucesso: true, 
            mensagem: `Você vendeu ${qtd} ${produto} por ${venda.valorTotal} moedas!`,
            venda,
            experiencia,
            conquistasConcluidas: todasConquistas
        });
    } catch (err) {
        console.error('Erro ao vender recurso:', err);
        res.status(500).json({ erro: 'Erro ao vender recurso.', detalhes: err.message });
    }
};

/**
 * Vender todos os recursos
 */
exports.venderTudo = async (req, res) => {
    try {
        const userId = req.session.user.id;
        // Busca todos os recursos do usuário com quantidade > 0
        const recursos = await Recurso.obterPorUsuario(userId);
        let valorTotal = 0;

        for (const r of recursos) {
            if (r.quantidade > 0) {
                valorTotal += await Recurso.vender(userId, r.produto_id, r.quantidade);
            }
        }

        // Atualizar sessão com dados mais recentes do usuário
        const utilizadorAtualizado = await Usuario.buscarPorId(userId);
        if (utilizadorAtualizado) {
            delete utilizadorAtualizado.password;
            req.session.user = utilizadorAtualizado;
        }

        res.json({ sucesso: true, valorTotal });
    } catch (err) {
        res.json({ sucesso: false, erro: err.message });
    }
};


/**
 * API para melhorar produção de um recurso
 */
exports.melhorarProducao = async (req, res) => {
    try {
        const { produto } = req.body;
        const userId = req.session.user.id;
        
        if (!produto) {
            return res.status(400).json({ erro: 'Produto é obrigatório.' });
        }
        
        // Melhorar a produção do recurso
        const melhoria = await Recurso.melhorarProducao(userId, produto);
        
        // Dar experiência ao usuário por melhorar produção
        const experiencia = await Usuario.adicionarExperiencia(userId, 5);

        // Atualizar sessão com dados mais recentes do usuário
        const utilizadorAtualizado = await Usuario.buscarPorId(userId);
        if (utilizadorAtualizado) {
            delete utilizadorAtualizado.password;
            req.session.user = utilizadorAtualizado;
        }
        
        // Se subiu de nível, verificar conquistas de nível
        let conquistasConcluidas = [];
        if (experiencia.subiuDeNivel) {
            const resultado = await Conquista.verificarConquistasNivel(userId);
            conquistasConcluidas = resultado.conquistasConcluidas || [];
        }
        
        res.json({ 
            sucesso: true, 
            mensagem: `Produção de ${produto} melhorada para nível ${melhoria.nivelAtual}!`,
            melhoria,
            experiencia,
            conquistasConcluidas
        });
    } catch (err) {
        console.error('Erro ao melhorar produção:', err);
        res.status(500).json({ erro: 'Erro ao melhorar produção.', detalhes: err.message });
    }
};

/**
 * Controller para a página de conquistas
 */
exports.paginaConquistas = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Buscar todas as conquistas com progresso do usuário
        const conquistas = await Conquista.listarPorUsuario(userId);
        
        // Verificar conquistas pendentes (opcional, pode ser lento para muitas conquistas)
        await Conquista.verificarTodasConquistas(userId);
        
        // Buscar novamente para ter os dados atualizados
        const conquistasAtualizadas = await Conquista.listarPorUsuario(userId);
        
        res.render('jogo/conquistas', { 
            title: 'Conquistas', 
            user: req.session.user,
            conquistas: conquistasAtualizadas
        });
    } catch (err) {
        console.error('Erro ao buscar conquistas:', err);
        res.status(500).render('erro', { 
            title: 'Erro', 
            mensagem: 'Ocorreu um erro ao carregar as conquistas.',
            erro: err
        });
    }
};

/**
 * API para verificar conquistas e receber atualizações
 */
exports.verificarConquistas = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Verificar todas as conquistas do usuário
        const resultado = await Conquista.verificarTodasConquistas(userId);
        
        res.json({ 
            sucesso: true,
            conquistasConcluidas: resultado.conquistasConcluidas
        });
    } catch (err) {
        console.error('Erro ao verificar conquistas:', err);
        res.status(500).json({ 
            erro: 'Erro ao verificar conquistas.', 
            detalhes: err.message 
        });
    }
};

/**
 * API para obter recursos do usuário
 */
exports.obterRecursos = async (req, res) => {
    try {
        const userId = req.session.user.id;
        console.log(`Obtendo recursos para o usuário ID ${userId}`);
        
        // Buscar todos os recursos do usuário
        const recursos = await Recurso.obterPorUsuario(userId);
        console.log(`Encontrados ${recursos.length} recursos para o usuário`);
        
        res.json({ 
            sucesso: true, 
            recursos
        });
    } catch (err) {
        console.error('Erro ao buscar recursos:', err);
        res.status(500).json({ erro: 'Erro ao buscar recursos.', detalhes: err.message });
    }
};

/**
 * Controller para a página da loja
 */
exports.paginaLoja = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Buscar produtos disponíveis para venda
        const [produtos] = await con.promise().query(
            'SELECT * FROM produtos ORDER BY categoria, valor_venda'
        );
        
        // Buscar recursos do usuário
        const recursos = await Recurso.obterPorUsuario(userId);
        
        // Buscar usuário para obter as moedas atuais
        const [usuario] = await con.promise().query(
            'SELECT moedas FROM users WHERE id = ?',
            [userId]
        );
        
        res.render('jogo/loja', { 
            title: 'Loja', 
            user: {
                ...req.session.user,
                moedas: usuario[0]?.moedas || req.session.user.moedas
            },
            produtos,
            recursos
        });
    } catch (err) {
        console.error('Erro ao carregar loja:', err);
        res.status(500).render('erro', { 
            title: 'Erro', 
            mensagem: 'Ocorreu um erro ao carregar a loja.',
            erro: err
        });
    }
};