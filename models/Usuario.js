const con = require('../database/connection');

class Usuario {
    /**
     * Cria um novo usuário
     * @param {Object} usuario - Dados do usuário
     * @returns {Promise} - Promise com resultado da operação
     */
    static async criar(usuario) {
        const { username, password } = usuario;
        return con.promise().query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, password]
        );
    }

    /**
     * Busca um usuário pelo nome de utilizador
     * @param {string} username - Nome do utilizador
     * @returns {Promise} - Promise com resultado da operação
     */
    static async buscarPorUsername(username) {
        const [rows] = await con.promise().query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    /**
     * Busca um usuário pelo ID
     * @param {number} id - ID do utilizador
     * @returns {Promise} - Promise com resultado da operação
     */
    static async buscarPorId(id) {
        const [rows] = await con.promise().query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    /**
     * Adiciona moedas ao utilizador
     * @param {number} id - ID do utilizador
     * @param {number} quantidade - Quantidade de moedas a adicionar
     * @returns {Promise} - Promise com resultado da operação
     */
    static async adicionarMoedas(id, quantidade) {
        return con.promise().query(
            'UPDATE users SET moedas = moedas + ? WHERE id = ?',
            [quantidade, id]
        );
    }

    /**
     * Adiciona pontos de ranking ao utilizador
     * @param {number} id - ID do utilizador
     * @param {number} quantidade - Quantidade de pontos a adicionar
     * @returns {Promise} - Promise com resultado da operação
     */
    static async adicionarPontosRanking(id, quantidade) {
        return con.promise().query(
            'UPDATE users SET pontos_ranking = pontos_ranking + ? WHERE id = ?',
            [quantidade, id]
        );
    }

    /**
     * Adiciona experiência ao utilizador e verifica se passou de nível
     * @param {number} id - ID do utilizador
     * @param {number} exp - Quantidade de experiência a adicionar
     * @returns {Promise} - Promise com resultado da operação e informação se passou de nível
     */
    static async adicionarExperiencia(id, exp) {
        // Buscar utilizador atual
        const [user] = await con.promise().query(
            'SELECT nivel, exp, exp_proximo_nivel FROM users WHERE id = ?',
            [id]
        );

        if (!user[0]) return { nivelAnterior: 0, nivelAtual: 0, subiuDeNivel: false, expAtual: 0, expProximo: 0 };

        const { nivel, exp: expAtual, exp_proximo_nivel } = user[0];
        let nivelAtual = nivel;
        let expNova = expAtual + exp;
        let expProximo = exp_proximo_nivel;
        let subiuDeNivel = false;

        // Verificar se sobe de nível
        while (expNova >= expProximo) {
            nivelAtual++;
            expNova -= expProximo;
            expProximo = Math.floor(expProximo * 1.5); // Próximo nível requer mais exp
            subiuDeNivel = true;
        }

        // Atualizar utilizador
        await con.promise().query(
            'UPDATE users SET nivel = ?, exp = ?, exp_proximo_nivel = ? WHERE id = ?',
            [nivelAtual, expNova, expProximo, id]
        );

        return {
            nivelAnterior: nivel,
            nivelAtual,
            subiuDeNivel,
            expAtual: expNova,
            expProximo
        };
    }

    /**
     * Obtém os top jogadores para o ranking
     * @param {number} limite - Quantidade máxima de jogadores a retornar
     * @returns {Promise} - Promise com resultado da operação
     */
    static async obterRanking(limite = 10) {
        const [rows] = await con.promise().query(
            'SELECT id, username, nivel, pontos_ranking FROM users ORDER BY pontos_ranking DESC, nivel DESC LIMIT ?',
            [limite]
        );
        return rows;
    }
}

module.exports = Usuario;
