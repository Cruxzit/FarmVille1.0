const { mysql, config } = require('./db');

async function setupDatabase() {
    console.log('🗄️ A criar base de dados...');
    const connection = await mysql.createConnection(config);

    // 1. Criar base de dados
    await connection.query(`CREATE DATABASE IF NOT EXISTS farmvilledb`);
    await connection.query(`USE farmvilledb`);
    console.log('✅ Base de dados criada/verificada!');

    // 2. Criar tabelas
    console.log('🛠️ A criar/verificar tabelas...');
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            moedas INT DEFAULT 0,
            pontos_ranking INT DEFAULT 0,
            nivel INT DEFAULT 1,
            exp INT DEFAULT 0,
            exp_proximo_nivel INT DEFAULT 100,
            avatar VARCHAR(255) DEFAULT 'avatar.png',
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS produtos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nome VARCHAR(50) NOT NULL,
            categoria ENUM('agricultura', 'mineracao', 'floresta') NOT NULL,
            valor_venda INT DEFAULT 1,
            descricao TEXT
        );
        CREATE TABLE IF NOT EXISTS recursos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            produto_id INT NOT NULL,
            quantidade INT DEFAULT 0,
            nivel_producao INT DEFAULT 1,
            velocidade INT DEFAULT 1,
            ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY user_produto (user_id, produto_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        );
        CREATE TABLE IF NOT EXISTS conquistas (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nome VARCHAR(100) NOT NULL,
            descricao TEXT,
            categoria ENUM('agricultura', 'mineracao', 'floresta', 'geral') NOT NULL,
            tipo ENUM('coleta', 'venda', 'nivel') NOT NULL,
            recurso_id INT,
            objetivo INT NOT NULL,
            recompensa_moedas INT DEFAULT 0,
            recompensa_pontos INT DEFAULT 0,
            icone VARCHAR(255),
            FOREIGN KEY (recurso_id) REFERENCES produtos(id)
        );
        CREATE TABLE IF NOT EXISTS conquistas_users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            conquista_id INT NOT NULL,
            concluido BOOLEAN DEFAULT FALSE,
            progresso INT DEFAULT 0,
            data_conclusao DATETIME,
            UNIQUE KEY user_conquista (user_id, conquista_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (conquista_id) REFERENCES conquistas(id)
        );
        CREATE TABLE IF NOT EXISTS vendas (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            produto_id INT NOT NULL,
            quantidade INT NOT NULL,
            valor_total INT NOT NULL,
            data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        );
    `);
    console.log('✅ Tabelas criadas/verificadas!');

    // 3. Inserir produtos se não existirem
    console.log('🌾 A inserir produtos na base de dados...');
    const [prodCount] = await connection.query('SELECT COUNT(*) as count FROM produtos');
    if (prodCount[0].count === 0) {
        const produtos = [
            ['trigo', 'agricultura', 2, 'Trigo dourado e nutritivo'],
            ['milho', 'agricultura', 3, 'Milho amarelo e saboroso'],
            ['batata', 'agricultura', 4, 'Batata da terra para refeições'],
            ['ferro', 'mineracao', 5, 'Minério de ferro resistente'],
            ['ouro', 'mineracao', 10, 'Minério de ouro valioso'],
            ['diamante', 'mineracao', 25, 'Diamante raro e brilhante'],
            ['madeira', 'floresta', 3, 'Madeira robusta para construção'],
            ['resina', 'floresta', 5, 'Resina natural para cola'],
            ['folhas', 'floresta', 2, 'Folhas verdes para decoração']
        ];
        for (const produto of produtos) {
            await connection.query(
                'INSERT INTO produtos (nome, categoria, valor_venda, descricao) VALUES (?, ?, ?, ?)',
                produto
            );
        }
        console.log('✅ Produtos inseridos!');
    } else {
        console.log('ℹ️ Produtos já existem.');
    }

    // 4. Inserir conquistas se não existirem
    console.log('🏆 A inserir conquistas na base de dados...');
    const [conqCount] = await connection.query('SELECT COUNT(*) as count FROM conquistas');
    if (conqCount[0].count === 0) {
        // Buscar IDs dos produtos
        const [produtos] = await connection.query('SELECT id, nome FROM produtos');
        const produtosMap = {};
        produtos.forEach(p => produtosMap[p.nome] = p.id);

        const conquistas = [
            // nome, descricao, categoria, tipo, recurso_id, objetivo, recompensa_moedas, recompensa_pontos, icone
            ['Agricultor Iniciante', 'Colhe 10 trigos', 'agricultura', 'coleta', produtosMap['trigo'], 10, 5, 10, 'trigo.png'],
            ['Agricultor Experiente', 'Colhe 200 trigos', 'agricultura', 'coleta', produtosMap['trigo'], 200, 100, 20, 'trigo.png'],
            ['Agricultor de Milho', 'Colhe 25 milhos', 'agricultura', 'coleta', produtosMap['milho'], 25, 10, 15, 'milho.png'],
            ['Rei da Batata', 'Colhe 200 batatas', 'agricultura', 'coleta', produtosMap['batata'], 200, 100, 20, 'batata.png'],
            ['Mineiro Iniciante', 'Minera 10 ferros', 'mineracao', 'coleta', produtosMap['ferro'], 10, 10, 15, 'ferro.png'],
            ['Caçador de Ouro', 'Minera 200 ouros', 'mineracao', 'coleta', produtosMap['ouro'], 200, 100, 30, 'ouro.png'],
            ['Minerador de Diamantes', 'Minera 5 diamantes', 'mineracao', 'coleta', produtosMap['diamante'], 5, 50, 50, 'diamante.png'],
            ['Lenhador Iniciante', 'Apanha 15 madeiras', 'floresta', 'coleta', produtosMap['madeira'], 15, 8, 12, 'madeira.png'],
            ['Coletor de Resina', 'Apanha 10 resinas', 'floresta', 'coleta', produtosMap['resina'], 10, 15, 20, 'resina.png'],
            ['Guardião da Floresta', 'Apanha 200 folhas', 'floresta', 'coleta', produtosMap['folhas'], 200, 100, 15, 'folhas.png'],
            ['Comerciante Iniciante', 'Vende 20 recursos', 'geral', 'venda', null, 20, 10, 20, 'moedas.png'],
            ['Comerciante Experiente', 'Vende 200 recursos', 'geral', 'venda', null, 200, 100, 40, 'moedas.png'],
            ['Novato', 'Alcança o nível 5', 'geral', 'nivel', null, 5, 25, 30, 'nivel.png'],
            ['Experiente', 'Alcança o nível 10', 'geral', 'nivel', null, 10, 50, 60, 'nivel.png'],
            ['Mestre', 'Alcança o nível 20', 'geral', 'nivel', null, 20, 100, 120, 'nivel.png']
        ];

        for (const c of conquistas) {
            await connection.query(
                'INSERT INTO conquistas (nome, descricao, categoria, tipo, recurso_id, objetivo, recompensa_moedas, recompensa_pontos, icone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                c
            );
        }
        console.log('✅ Conquistas inseridas!');
    } else {
        console.log('ℹ️ Conquistas já existem.');
    }

    await connection.end();
    console.log('🎉 Setup completo!');
}

setupDatabase().catch(err => {
    console.error('❌ Erro no setup:', err);
});