module.exports = {
    PORT: process.env.PORT || 3000,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || 'root',
    DB_NAME: process.env.DB_NAME || 'farmvilledb',
    JWT_SECRET: process.env.JWT_SECRET || 'ch_secreta_segura',
    SESSION_SECRET: process.env.SESSION_SECRET || 'sessao_secreta_farmville'
};
