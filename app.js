const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const config = require('./config/config');

// Importar middlewares
const { sessionMiddleware, utilizadorLocal } = require('./middlewares/auth');

// Importar rotas
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const jogoRoutes = require('./routes/jogoRoutes');
const rankingRoutes = require('./routes/rankingRoutes');

// Inicializar app
const app = express();

// Configurar view engine
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configurar sessão
app.use(sessionMiddleware);

// Adicionar utilizador às variáveis locais
app.use(utilizadorLocal);

// Configurar rotas
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/jogo', jogoRoutes);
app.use('/', rankingRoutes);

// Página 404
app.use((req, res) => {
    res.status(404).render('404', { 
        title: 'Página não encontrada',
        user: req.session.user
    });
});

// Configuração do tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro na aplicação:', err);
    res.status(500).render('erro', {
        title: 'Erro',
        user: req.session.user,
        mensagem: 'Ocorreu um erro no servidor.'
    });
});

// Iniciar servidor
const PORT = config.PORT;
app.listen(PORT, () => {
    console.log(`🌱 FarmVille rodando em http://localhost:${PORT}`);
    console.log(`🎮 Bom jogo!`);
});