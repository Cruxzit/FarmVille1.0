const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const Recurso = require('../models/Recurso');
const Conquista = require('../models/Conquista');
const config = require('../config/config');

/**
 * Renderiza a página inicial
 */
exports.inicio = (req, res) => {
    res.render('index', { title: 'FarmVille', user: req.session.user });
};

/**
 * Renderiza a página de login
 */
exports.paginaLogin = (req, res) => {
    if (req.session.user) {
        return res.redirect('/perfil');
    }
    res.render('auth/login', { title: 'Entrar', user: req.session.user });
};

/**
 * Renderiza a página de registro
 */
exports.paginaRegistro = (req, res) => {
    if (req.session.user) {
        return res.redirect('/perfil');
    }
    res.render('auth/registro', { title: 'Registar', user: req.session.user });
};

/**
 * Processa o login
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ erro: 'Nome de utilizador e palavra-passe são obrigatórios.' });
        }
        
        const utilizador = await Usuario.buscarPorUsername(username);
        if (!utilizador) {
            return res.status(400).json({ erro: 'Nome de utilizador ou palavra-passe inválidos.' });
        }
        
        const palavraPasseValida = await bcrypt.compare(password, utilizador.password);
        if (!palavraPasseValida) {
            return res.status(400).json({ erro: 'Nome de utilizador ou palavra-passe inválidos.' });
        }
        
        // Remover a senha antes de armazenar na sessão
        const usuarioSessao = { ...utilizador };
        delete usuarioSessao.password;
        
        // Armazenar na sessão
        req.session.user = usuarioSessao;
        
        // Criar token JWT para uso em APIs
        const token = jwt.sign({ 
            id: utilizador.id, 
            username: utilizador.username 
        }, config.JWT_SECRET, { expiresIn: '1h' });
        
        res.cookie('token', token, { httpOnly: true });
        res.json({ sucesso: true, token, redirect: '/perfil' });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ erro: 'Erro ao fazer login.', detalhes: err.message });
    }
};

/**
 * Processa o registro
 */
exports.registro = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ erro: 'Nome de utilizador e palavra-passe são obrigatórios.' });
        }
        
        // Verificar se o utilizador já existe
        const existente = await Usuario.buscarPorUsername(username);
        if (existente) {
            return res.status(400).json({ erro: 'O nome de utilizador já está registado.' });
        }
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Criar o utilizador
        await Usuario.criar({ username, password: hashedPassword });
        
        res.status(201).json({ 
            sucesso: true, 
            mensagem: 'Utilizador registado com sucesso!',
            redirect: '/login'
        });
    } catch (err) {
        console.error('Erro no registro:', err);
        res.status(500).json({ erro: 'Erro ao registar utilizador.', detalhes: err.message });
    }
};

/**
 * Processa o logout
 */
exports.logout = (req, res) => {
    req.session.destroy();
    res.clearCookie('token');
    res.redirect('/login');
};

/**
 * Renderiza a página de perfil com recursos do utilizador
 */
exports.perfil = async (req, res) => {
    try {
        const user_id = req.session.user.id;
        const recursos = await Recurso.obterPorUsuario(user_id);
        
        // Obtém informações atualizadas do usuário
        const utilizador = await Usuario.buscarPorId(user_id);
        if (utilizador) {
            // Atualizar dados na sessão
            const usuarioAtualizado = { ...utilizador };
            delete usuarioAtualizado.password;
            req.session.user = usuarioAtualizado;
        }
        
        res.render('perfil', { 
            title: 'Perfil', 
            user: req.session.user,
            recursos: recursos
        });
    } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        res.render('perfil', { 
            title: 'Perfil', 
            user: req.session.user,
            recursos: [],
            erro: 'Erro ao carregar recursos.'
        });
    }
};
