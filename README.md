# FarmVille

FarmVille é um jogo web retro de simulação agrícola, mineração e exploração de floresta, onde podes evoluir, conquistar objetivos e competir no ranking global.

---

## 🚀 Como iniciar o projeto

### 1. Pré-requisitos

- [Node.js](https://nodejs.org/) (v16 ou superior)
- [MySQL](https://www.mysql.com/) (com utilizador root e palavra-passe root, ou ajusta em `config/config.js`)

### 2. Instalação

Clona o repositório e acede à pasta do projeto:

```sh
git clone https://github.com/Cruxzit/FarmVille1.0
cd FarmVille1.0
```

Instala as dependências:

O projeto utiliza os seguintes pacotes npm:

- bcrypt@6.0.0
- cookie-parser@1.4.7
- ejs@3.1.10
- express@5.1.0
- express-ejs-layouts@2.5.1
- express-session@1.18.1
- jsonwebtoken@9.0.2
- mysql2@3.14.1
- nodemon@3.1.10 (opcional, apenas para desenvolvimento)

Estas dependências são instaladas automaticamente ao correres:


```sh
npm install bcrypt cookie-parser ejs express express-ejs-layouts express-session jsonwebtoken mysql2 && npm install --save-dev nodemon
```

### 3. Configuração da base de dados

Cria e popula a base de dados automaticamente:

```sh
node database/setup_db.js
```

> **Nota:** Se necessário, ajusta as credenciais da base de dados em `config/config.js` e `database/db.js`.

### 4. Iniciar o servidor

```sh
nodemon app.js
```

Acede a [http://localhost:3000](http://localhost:3000) no teu navegador.

---

## 🎮 Como jogar

1. **Regista-te**: Cria uma conta na página de registo.
2. **Login**: Entra com o teu nome de utilizador e palavra-passe.
3. **Perfil**: Consulta o teu inventário de recursos e saldo de moedas.
4. **Atividades**:
   - **Agricultura**: Cultiva trigo, milho e batata.
   - **Mineração**: Mina ferro, ouro e diamante.
   - **Floresta**: Recolhe madeira, resina e folhas.
5. **Loja**: Vende recursos para ganhar moedas e melhora a produção dos teus recursos.
6. **Conquistas**: Cumpre objetivos para desbloquear conquistas e ganhar recompensas.
7. **Ranking**: Compete com outros jogadores pelo topo do ranking global.

---

## 📁 Estrutura do Projeto

- `app.js` — Servidor Express e configuração principal
- `config/` — Configurações do projeto
- `controllers/` — Lógica das rotas e páginas
- `models/` — Modelos de dados (Utilizador, Recurso, Conquista)
- `routes/` — Definição das rotas
- `middlewares/` — Middlewares de autenticação e sessão
- `database/` — Scripts de setup e ligação ao MySQL
- `public/` — Ficheiros estáticos (CSS, JS, imagens)
- `views/` — Templates EJS para as páginas

---

## ⚙️ Personalização

- **Chave JWT e sessão:** Edita em `config/config.js`
- **Utilizador/palavra-passe da base de dados:** Edita em `config/config.js` e `database/db.js`
- **Preços e recompensas:** Edita em `database/setup_db.js` e nos controladores

---

## 👨‍💻 Créditos

Desenvolvido por Hugo Oliveira, Anibal Freire, Diogo Lima.

---

Diverte-te a jogar