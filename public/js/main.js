// Funções utilitárias para o FarmVille

// Função para fazer logout
function logout() {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = '/login';
}

// Função para mostrar popup de notificação
function showPopup(message, type = 'success') {
    const popup = document.createElement('div');
    popup.className = `game-popup ${type}`;
    popup.textContent = message;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.classList.add('show');
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }, 2000);
    }, 100);
}

// Verifica se o utilizador está a usar dispositivo móvel
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Adiciona classes específicas para dispositivos móveis
document.addEventListener('DOMContentLoaded', function() {
    if (isMobile()) {
        document.body.classList.add('mobile');
    }
});

// Função para verificar conquistas e mostrar notificações
async function verificarConquistas() {
    try {
        const resposta = await fetch('/verificar-conquistas');
        const dados = await resposta.json();
        
        if (dados.sucesso && dados.conquistasConcluidas && dados.conquistasConcluidas.length > 0) {
            // Mostrar conquistas concluídas com delay entre cada uma
            dados.conquistasConcluidas.forEach((conquista, index) => {
                setTimeout(() => {
                    showPopup(`🏆 Conquista! ${conquista.nome}`, 'conquista');
                }, 1000 + (index * 1500));
            });
            
            // Atualizar página de conquistas se estiver nela
            if (window.location.pathname.includes('/conquistas')) {
                setTimeout(() => {
                    window.location.reload();
                }, 1000 + (dados.conquistasConcluidas.length * 1500));
            }
        }
    } catch (error) {
        console.error('Erro ao verificar conquistas:', error);
    }
}

// Função para inicializar contadores de recursos
async function initializeResourceCounters() {
    try {
        // Verificar se estamos em uma página de jogo
        const isPaginaJogo = window.location.pathname.includes('/agricultura') || 
                            window.location.pathname.includes('/mineracao') || 
                            window.location.pathname.includes('/floresta');
        
        if (!isPaginaJogo) return;
        
        console.log("Inicializando contadores de recursos...");
        
        // Carregar recursos do jogador
        const resposta = await fetch('/jogo/api/recursos', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (resposta.ok) {
            const dados = await resposta.json();
            console.log("Recursos carregados:", dados);
            
            // Atualizar contadores baseado nos recursos disponíveis
            if (dados && dados.recursos) {
                dados.recursos.forEach(recurso => {
                    const counterElement = document.getElementById(`${recurso.nome}-counter`);
                    if (counterElement) {
                        const counterSpan = counterElement.querySelector('span');
                        if (counterSpan) {
                            counterSpan.textContent = recurso.quantidade || '0';
                        }
                    }
                });
            }
        } else {
            console.error("Erro ao carregar recursos:", await resposta.text());
        }
    } catch (error) {
        console.error('Erro ao carregar recursos iniciais:', error);
    }
}

// Verificar conquistas a cada 5 minutos se o usuário estiver logado
// e não estiver em páginas de login/registro
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    if (!path.includes('/login') && !path.includes('/registro')) {
        // Verificar conquistas após 30 segundos de página carregada
        setTimeout(verificarConquistas, 30000);
        
        // Verificar periodicamente a cada 5 minutos
        setInterval(verificarConquistas, 5 * 60 * 1000);
    }
    
    initializeResourceCounters();
});