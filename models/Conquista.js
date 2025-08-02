const con = require('../database/connection');
const Usuario = require('./Usuario');

class Conquista {
    /**
     * Busca todas as conquistas disponíveis
     * @returns {Promise} - Promise com resultado da operação
     */
    static async listarTodas() {
        const [rows] = await con.promise().query(
            `SELECT c.*, p.nome as produto_nome
             FROM conquistas c
             LEFT JOIN produtos p ON c.recurso_id = p.id`
        );
        return rows;
    }
    
    /**
     * Busca todas as conquistas de um utilizador com seu progresso
     * @param {number} userId - ID do utilizador
     * @returns {Promise} - Promise com resultado da operação
     */
    static async listarPorUsuario(userId) {
        const [rows] = await con.promise().query(
            `SELECT c.*, p.nome as produto_nome, cu.concluido, cu.progresso, cu.data_conclusao
             FROM conquistas c
             LEFT JOIN produtos p ON c.recurso_id = p.id
             LEFT JOIN conquistas_users cu ON c.id = cu.conquista_id AND cu.user_id = ?
             ORDER BY c.categoria, cu.concluido DESC, c.objetivo`,
            [userId]
        );
        return rows;
    }
    
    /**
     * Verifica se o usuário concluiu alguma conquista
     * @param {number} userId - ID do utilizador
     * @param {string} tipo - Tipo de conquista (coleta, venda, nivel)
     * @param {number|null} recursoId - ID do recurso (null se não for específico)
     * @param {number} valor - Valor atual para verificação
     * @returns {Promise} - Promise com resultado da operação
     */
    static async verificarConquistas(userId, tipo, recursoId = null, valor = 1) {
        let query, params;
        
        // Buscar conquistas relevantes
        if (recursoId) {
            query = `SELECT c.* FROM conquistas c 
                     LEFT JOIN conquistas_users cu ON c.id = cu.conquista_id AND cu.user_id = ? 
                     WHERE c.tipo = ? AND c.recurso_id = ? AND (cu.concluido IS NULL OR cu.concluido = 0)`;
            params = [userId, tipo, recursoId];
        } else {
            query = `SELECT c.* FROM conquistas c 
                     LEFT JOIN conquistas_users cu ON c.id = cu.conquista_id AND cu.user_id = ? 
                     WHERE c.tipo = ? AND c.recurso_id IS NULL AND (cu.concluido IS NULL OR cu.concluido = 0)`;
            params = [userId, tipo];
        }
        
        const [conquistas] = await con.promise().query(query, params);
        
        if (conquistas.length === 0) return { conquistasConcluidas: [] };
        
        const conquistasConcluidas = [];
        
        // Verificar conquistas uma a uma
        for (const conquista of conquistas) {
            // Buscar progresso atual
            const [progresso] = await con.promise().query(
                `SELECT * FROM conquistas_users WHERE user_id = ? AND conquista_id = ?`,
                [userId, conquista.id]
            );
            
            let progressoAtual = 0;
            let concluido = false;
            
            if (progresso.length === 0) {
                // Criar registro de progresso se não existir
                await con.promise().query(
                    `INSERT INTO conquistas_users (user_id, conquista_id, progresso, concluido) VALUES (?, ?, ?, ?)`,
                    [userId, conquista.id, valor, valor >= conquista.objetivo]
                );
                progressoAtual = valor;
                concluido = valor >= conquista.objetivo;
            } else {
                // Atualizar progresso existente
                progressoAtual = progresso[0].progresso + valor;
                concluido = progressoAtual >= conquista.objetivo;
                
                await con.promise().query(
                    `UPDATE conquistas_users 
                     SET progresso = ?, concluido = ?, data_conclusao = ?
                     WHERE user_id = ? AND conquista_id = ?`,
                    [progressoAtual, concluido, concluido ? new Date() : null, userId, conquista.id]
                );
            }
            
            // Se a conquista foi concluída, dar recompensas
            if (concluido) {
                // Recompensar com moedas
                if (conquista.recompensa_moedas > 0) {
                    await Usuario.adicionarMoedas(userId, conquista.recompensa_moedas);
                }
                
                // Recompensar com pontos no ranking
                if (conquista.recompensa_pontos > 0) {
                    await Usuario.adicionarPontosRanking(userId, conquista.recompensa_pontos);
                }
                
                conquistasConcluidas.push({
                    ...conquista,
                    progresso: progressoAtual
                });
            }
        }
        
        return { conquistasConcluidas };
    }
    
    /**
     * Verifica conquistas de coleta de um recurso
     * @param {number} userId - ID do utilizador
     * @param {number} recursoId - ID do recurso
     * @returns {Promise} - Promise com resultado da operação
     */
    static async verificarConquistasColeta(userId, recursoId) {
        // Buscar a quantidade total do recurso
        const [recurso] = await con.promise().query(
            'SELECT quantidade FROM recursos WHERE user_id = ? AND produto_id = ?',
            [userId, recursoId]
        );
        
        if (!recurso[0]) return { conquistasConcluidas: [] };
        
        const quantidade = recurso[0].quantidade;
        
        // Buscar todas as conquistas de coleta para este recurso que não foram concluídas
        const [conquistas] = await con.promise().query(
            `SELECT c.* FROM conquistas c 
             LEFT JOIN conquistas_users cu ON c.id = cu.conquista_id AND cu.user_id = ? 
             WHERE c.tipo = 'coleta' AND c.recurso_id = ? AND (cu.concluido IS NULL OR cu.concluido = 0)`,
            [userId, recursoId]
        );
        
        const conquistasConcluidas = [];
        
        // Verificar cada conquista com o valor total acumulado
        for (const conquista of conquistas) {
            // Buscar ou criar registro de progresso
            const [progresso] = await con.promise().query(
                `SELECT * FROM conquistas_users WHERE user_id = ? AND conquista_id = ?`,
                [userId, conquista.id]
            );
            
            let concluido = false;
            
            if (progresso.length === 0) {
                // Se não existe progresso, criar com o valor atual
                concluido = quantidade >= conquista.objetivo;
                await con.promise().query(
                    `INSERT INTO conquistas_users (user_id, conquista_id, progresso, concluido, data_conclusao) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [userId, conquista.id, quantidade, concluido, concluido ? new Date() : null]
                );
            } else {
                // Atualizar progresso se necessário
                concluido = quantidade >= conquista.objetivo;
                if (progresso[0].progresso !== quantidade || (concluido && !progresso[0].concluido)) {
                    await con.promise().query(
                        `UPDATE conquistas_users 
                         SET progresso = ?, concluido = ?, data_conclusao = ?
                         WHERE user_id = ? AND conquista_id = ?`,
                        [quantidade, concluido, concluido ? new Date() : null, userId, conquista.id]
                    );
                } else {
                    // Se não houve mudança, pular para próxima conquista
                    continue;
                }
            }
            
            // Se a conquista foi concluída, dar recompensas
            if (concluido) {
                // Recompensar com moedas
                if (conquista.recompensa_moedas > 0) {
                    await Usuario.adicionarMoedas(userId, conquista.recompensa_moedas);
                }
                
                // Recompensar com pontos no ranking
                if (conquista.recompensa_pontos > 0) {
                    await Usuario.adicionarPontosRanking(userId, conquista.recompensa_pontos);
                }
                
                conquistasConcluidas.push({
                    ...conquista,
                    progresso: quantidade
                });
            }
        }
        
        return { conquistasConcluidas };
    }
    
    /**
     * Verifica conquistas de venda
     * @param {number} userId - ID do utilizador
     * @returns {Promise} - Promise com resultado da operação
     */
    static async verificarConquistasVenda(userId) {
        // Buscar a quantidade total de vendas
        const [vendas] = await con.promise().query(
            'SELECT SUM(quantidade) as total FROM vendas WHERE user_id = ?',
            [userId]
        );
        
        if (!vendas[0] || !vendas[0].total) return { conquistasConcluidas: [] };
        
        const totalVendas = vendas[0].total;
        return this.verificarConquistas(userId, 'venda', null, totalVendas);
    }
    
    /**
     * Verifica conquistas de nível
     * @param {number} userId - ID do utilizador
     * @returns {Promise} - Promise com resultado da operação
     */
    static async verificarConquistasNivel(userId) {
        // Buscar nível atual do usuário
        const [usuario] = await con.promise().query(
            'SELECT nivel FROM users WHERE id = ?',
            [userId]
        );
        
        if (!usuario[0]) return { conquistasConcluidas: [] };
        
        const nivel = usuario[0].nivel;
        return this.verificarConquistas(userId, 'nivel', null, nivel);
    }
    
    /**
     * Verifica todas as conquistas pendentes de um usuário
     * @param {number} userId - ID do utilizador
     * @returns {Promise} - Promise com resultado da operação
     */
    static async verificarTodasConquistas(userId) {
        const resultados = {
            coleta: [],
            venda: [],
            nivel: []
        };
        
        // 1. Verificar conquistas de coleta para cada recurso
        const [recursos] = await con.promise().query(
            `SELECT r.produto_id FROM recursos r
             JOIN produtos p ON r.produto_id = p.id
             WHERE r.user_id = ?`,
            [userId]
        );
        
        for (const recurso of recursos) {
            const { conquistasConcluidas } = await this.verificarConquistasColeta(userId, recurso.produto_id);
            resultados.coleta = resultados.coleta.concat(conquistasConcluidas);
        }
        
        // 2. Verificar conquistas de venda
        const resultadoVendas = await this.verificarConquistasVenda(userId);
        resultados.venda = resultadoVendas.conquistasConcluidas;
        
        // 3. Verificar conquistas de nível
        const resultadoNivel = await this.verificarConquistasNivel(userId);
        resultados.nivel = resultadoNivel.conquistasConcluidas;
        
        // Juntar todas as conquistas concluídas
        const todasConquistas = [
            ...resultados.coleta,
            ...resultados.venda,
            ...resultados.nivel
        ];
        
        return {
            conquistasConcluidas: todasConquistas,
            detalhes: resultados
        };
    }
}

module.exports = Conquista;
