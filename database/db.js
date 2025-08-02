const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    multipleStatements: true
};

module.exports = { mysql, config };