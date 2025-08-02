const con = require('../database/connection');

class Recurso {
    /**
     * Adiciona quantidade de um recurso a um utilizador
     * @param {number} userId - ID do utilizador
     * @param {number|string} produtoId - ID ou nome do produto
     * @param {number} quantidade - Quantidade a adicionar
     * @returns {Promise} - Promise com resultado da operação
     */
    static async adicionar(userId, produtoId, quantidade = 1) {
        // Se produtoId for uma string (nome), buscar o ID do produto
        let idProduto = produtoId;
        if (typeof produtoId === 'string') {
            const [produto] = await con.promise().query(
                'SELECT id FROM produtos WHERE nome = ?',
                [produtoId]
            );
            if (!produto[0]) throw new Error('Produto não encontrado');
            idProduto = produto[0].id;
        }
        
        // Inserir ou atualizar o recurso
        return con.promise().query(
            `INSERT INTO recursos (user_id, produto_id, quantidade)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantidade = quantidade + ?`,
            [userId, idProduto, quantidade, quantidade]
        );
    }
    
    /**
     * Obtém todos os recursos de um utilizador
     * @param {number} userId - ID do utilizador
     * @returns {Promise} - Promise com resultado da operação
     */
    static async obterPorUsuario(userId) {
        const [rows] = await con.promise().query(
            `SELECT r.id, p.id AS produto_id, p.nome, p.categoria, p.descricao,
                    p.valor_venda, r.quantidade, r.nivel_producao, r.velocidade
             FROM recursos r
             JOIN produtos p ON r.produto_id = p.id
             WHERE r.user_id = ?`,
            [userId]
        );
        return rows;
    }
    
    /**
     * Obtém todos os recursos de um utilizador agrupados por categoria
     * @param {number} userId - ID do utilizador
     * @returns {Promise} - Promise com resultado da operação
     */
    static async obterPorCategoria(userId) {
        const recursos = await this.obterPorUsuario(userId);
        const categorias = {
            agricultura: [],
            mineracao: [],
            floresta: []
        };
        
        recursos.forEach(recurso => {
            if (categorias[recurso.categoria]) {
                categorias[recurso.categoria].push(recurso);
            }
        });
        
        return categorias;
    }
    
    /**
     * Obtém um recurso específico de um utilizador
     * @param {number} userId - ID do utilizador
     * @param {number|string} produtoId - ID ou nome do produto
     * @returns {Promise} - Promise com resultado da operação
     */    static async obterRecurso(userId, produtoId) {
        // Se produtoId for uma string (nome), buscar o ID do produto
        let query, params;
        if (typeof produtoId === 'string') {
            // Verificar se o produto existe, se não existir, criar o recurso
            const [produto] = await con.promise().query('SELECT id FROM produtos WHERE nome = ?', [produtoId]);
            
            if (!produto[0]) {
                console.error(`Produto não encontrado: ${produtoId}`);
                throw new Error(`Produto não encontrado: ${produtoId}`);
            }
            
            // Verificar se o usuário já tem este recurso
            const [recursoExistente] = await con.promise().query(
                'SELECT * FROM recursos WHERE user_id = ? AND produto_id = ?', 
                [userId, produto[0].id]
            );
            
            // Se não tiver o recurso, criar com quantidade zero
            if (!recursoExistente[0]) {
                await con.promise().query(
                    'INSERT INTO recursos (user_id, produto_id, quantidade, nivel_producao) VALUES (?, ?, 0, 1)',
                    [userId, produto[0].id]
                );
            }
            
            query = `SELECT r.id, p.id AS produto_id, p.nome, p.categoria, p.descricao,
                            p.valor_venda, r.quantidade, r.nivel_producao, r.velocidade
                     FROM recursos r
                     JOIN produtos p ON r.produto_id = p.id
                     WHERE r.user_id = ? AND p.nome = ?`;
            params = [userId, produtoId];
        } else {
            query = `SELECT r.id, p.id AS produto_id, p.nome, p.categoria, p.descricao,
                            p.valor_venda, r.quantidade, r.nivel_producao, r.velocidade
                     FROM recursos r
                     JOIN produtos p ON r.produto_id = p.id
                     WHERE r.user_id = ? AND r.produto_id = ?`;
            params = [userId, produtoId];
        }
        
        const [rows] = await con.promise().query(query, params);
        return rows[0];
    }
    
    /**
     * Vende uma quantidade de um recurso
     * @param {number} userId - ID do utilizador
     * @param {number|string} produtoId - ID ou nome do produto
     * @param {number} quantidade - Quantidade a vender
     * @returns {Promise} - Promise com resultado da operação
     */
    static async vender(userId, produtoId, quantidade) {
        // Se produtoId for uma string (nome), buscar o ID do produto
        let idProduto = produtoId;
        let valorVenda = 0;
        
        if (typeof produtoId === 'string') {
            const [produto] = await con.promise().query(
                'SELECT id, valor_venda FROM produtos WHERE nome = ?',
                [produtoId]
            );
            if (!produto[0]) throw new Error('Produto não encontrado');
            idProduto = produto[0].id;
            valorVenda = produto[0].valor_venda;
        } else {
            const [produto] = await con.promise().query(
                'SELECT valor_venda FROM produtos WHERE id = ?',
                [idProduto]
            );
            if (!produto[0]) throw new Error('Produto não encontrado');
            valorVenda = produto[0].valor_venda;
        }
        
        // Verificar se o usuário tem recursos suficientes
        const [recurso] = await con.promise().query(
            'SELECT quantidade FROM recursos WHERE user_id = ? AND produto_id = ?',
            [userId, idProduto]
        );
        
        if (!recurso[0] || recurso[0].quantidade < quantidade) {
            throw new Error('Quantidade insuficiente deste recurso');
        }
        
        // Calcular valor total da venda
        const valorTotal = valorVenda * quantidade;
        
        // Iniciar transação
        const connection = await con.promise();
        await connection.beginTransaction();
        
        try {
            // Diminuir quantidade do recurso
            await connection.query(
                'UPDATE recursos SET quantidade = quantidade - ? WHERE user_id = ? AND produto_id = ?',
                [quantidade, userId, idProduto]
            );
            
            // Adicionar moedas ao usuário
            await connection.query(
                'UPDATE users SET moedas = moedas + ? WHERE id = ?',
                [valorTotal, userId]
            );
            
            // Registrar a venda
            await connection.query(
                'INSERT INTO vendas (user_id, produto_id, quantidade, valor_total) VALUES (?, ?, ?, ?)',
                [userId, idProduto, quantidade, valorTotal]
            );
            
            await connection.commit();
            
            return {
                sucesso: true,
                valorTotal,
                quantidade,
                produto: { id: idProduto, valorVenda }
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    }
    
    /**
     * Melhora o nível de produção de um recurso
     * @param {number} userId - ID do utilizador
     * @param {number|string} produtoId - ID ou nome do produto
     * @returns {Promise} - Promise com resultado da operação
     */
    static async melhorarProducao(userId, produtoId) {
        // Se produtoId for uma string (nome), buscar o ID do produto
        let idProduto = produtoId;
        if (typeof produtoId === 'string') {
            const [produto] = await con.promise().query(
                'SELECT id FROM produtos WHERE nome = ?',
                [produtoId]
            );
            if (!produto[0]) throw new Error('Produto não encontrado');
            idProduto = produto[0].id;
        }
        
        // Verificar o nível atual e calcular o custo
        const [recurso] = await con.promise().query(
            'SELECT nivel_producao FROM recursos WHERE user_id = ? AND produto_id = ?',
            [userId, idProduto]
        );
        
        if (!recurso[0]) throw new Error('Recurso não encontrado');
        
        const nivelAtual = recurso[0].nivel_producao;
        const custoMelhoria = Math.floor(50 * Math.pow(1.5, nivelAtual - 1));
        
        // Verificar se o usuário tem moedas suficientes
        const [usuario] = await con.promise().query(
            'SELECT moedas FROM users WHERE id = ?',
            [userId]
        );
        
        if (!usuario[0] || usuario[0].moedas < custoMelhoria) {
            throw new Error('Moedas insuficientes para melhorar este recurso');
        }
        
        // Iniciar transação
        const connection = await con.promise();
        await connection.beginTransaction();
        
        try {
            // Diminuir moedas do usuário
            await connection.query(
                'UPDATE users SET moedas = moedas - ? WHERE id = ?',
                [custoMelhoria, userId]
            );
            
            // Aumentar nível de produção
            await connection.query(
                'UPDATE recursos SET nivel_producao = nivel_producao + 1 WHERE user_id = ? AND produto_id = ?',
                [userId, idProduto]
            );
            
            await connection.commit();
            
            return {
                sucesso: true,
                nivelAnterior: nivelAtual,
                nivelAtual: nivelAtual + 1,
                custo: custoMelhoria
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    }
}

module.exports = Recurso;
