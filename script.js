// --- TOPO DO ARQUIVO script.js ---

// 1. Definição Global Imediata
window.switchTab = function(tipo) {
    // Definimos a aba atual globalmente para o login saber onde ir
    window.abaAtual = tipo; 

    const btnAluno = document.getElementById('tab-aluno');
    const btnAdmin = document.getElementById('tab-admin');
    const titulo = document.getElementById('login-title');

    if (btnAluno && btnAdmin) {
        if (tipo === 'admin') {
            btnAdmin.classList.add('active');
            btnAluno.classList.remove('active');
            if (titulo) titulo.innerText = 'Acesso Administrador';
        } else {
            btnAluno.classList.add('active');
            btnAdmin.classList.remove('active');
            if (titulo) titulo.innerText = 'Acesso Aluno';
        }
    }
};

// 2. Configurações do Supabase
const SUPABASE_URL = 'https://qdmvlpnevvxvjdvgooeh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r-__wMRaOzmh1AGM-tSkbQ_Kp5HkQUx';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Inicializa a variável caso não tenha sido clicada
window.abaAtual = 'usuario'; 

// --- RESTANTE DO CÓDIGO (Login, Admin, Aluno, etc) ---
