const jwt = require('jsonwebtoken');
const config = require('../config/config');
const session = require('express-session');

/**
 * Middleware de autenticação que verifica se o utilizador está autenticado na sessão
 */
function autenticar(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

/**
 * Middleware para verificar token de autenticação em API
 */
function verificarToken(req, res, next) {
    const token = req.cookies.token || req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
    }
    
    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.utilizador = decoded;
        next();
    } catch (error) {
        res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
}

/**
 * Configuração do middleware de sessão
 */
const sessionMiddleware = session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 3600000, // 1 hora
        secure: process.env.NODE_ENV === 'production'
    }
});

/**
 * Middleware que adiciona o utilizador às variáveis locais da resposta
 */
function utilizadorLocal(req, res, next) {
    res.locals.user = req.session.user || null;
    next();
}

module.exports = {
    autenticar,
    verificarToken,
    sessionMiddleware,
    utilizadorLocal
};
