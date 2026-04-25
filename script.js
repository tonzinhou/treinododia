// ==========================================
// 1. FUNÇÕES GLOBAIS E TROCA DE ABA
// ==========================================
window.abaAtual = 'usuario'; 

window.switchTab = function(tipo) {
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

// ==========================================
// 2. CONFIGURAÇÃO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://qdmvlpnevvxvjdvgooeh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r-__wMRaOzmh1AGM-tSkbQ_Kp5HkQUx';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let treinoSelecionado = 'A'; 
let intervaloTimer; 

const coresGrupos = {
    'Peito': '#ff4444', 'Costas': '#44ff44', 'Pernas': '#4444ff',
    'Ombros': '#ff8800', 'Braços': '#ff44ff', 'Core': '#00ffff'
};

// ==========================================
// 3. LÓGICA DE LOGIN
// ==========================================
async function fazerLogin() {
    const nickOuEmail = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!nickOuEmail || !password) return alert("Preencha todos os campos.");

    const loginFinal = nickOuEmail.includes('@') ? nickOuEmail : `${nickOuEmail}@academia.com`;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ 
        email: loginFinal, 
        password 
    });

    if (error) return alert("Nickname ou senha incorretos.");
    if (data.user) verificarPermissao(data.user.id);
}

async function verificarPermissao(userId) {
    const { data } = await supabaseClient.from('perfis').select('role').eq('id', userId).single();
    if (data && data.role.toLowerCase() === window.abaAtual.toLowerCase()) {
        window.location.href = data.role === 'admin' ? 'admin.html' : 'aluno.html';
    } else {
        alert("Acesso Negado para esta categoria!");
        await supabaseClient.auth.signOut();
    }
}

// ==========================================
// 4. FUNÇÕES DO ADMINISTRADOR
// ==========================================

async function cadastrarNovoAluno() {
    const nomeEl = document.getElementById('novoNome');
    const nickEl = document.getElementById('novoNick');
    const senhaEl = document.getElementById('novaSenha');
    const fotoEl = document.getElementById('novoFoto');
    const fraseEl = document.getElementById('novoFrase');

    const nome = nomeEl.value;
    const nick = nickEl.value.trim().toLowerCase();
    const password = senhaEl.value;
    const foto_url = fotoEl ? fotoEl.value : '';
    const frase = fraseEl ? fraseEl.value : '';

    const emailFicticio = `${nick}@academia.com`;
    const { data, error } = await supabaseClient.auth.signUp({ email: emailFicticio, password });

    if (error) return alert("Erro Auth: " + error.message);

    if (data.user) {
        await supabaseClient.from('perfis').insert([{ 
            id: data.user.id, nome, nickname: nick, role: 'usuario',
            foto_url: foto_url || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            frase: frase || 'Foco na missão!'
        }]);
        alert(`Aluno ${nick} cadastrado!`);
        carregarAlunos();
    }
}

async function carregarAlunos() {
    const { data } = await supabaseClient.from('perfis').select('id, nome').neq('role', 'admin');
    const selectsParaPreencher = ['selectAlunos', 'selectAlunosEdicao', 'selectOrigem', 'selectDestino'];
    
    if (data) {
        const options = '<option value="">Selecione o Aluno</option>' + 
                        data.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
        
        selectsParaPreencher.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.innerHTML = options;
        });
    }
}

async function atribuirTreino() {
    const aluno_id = document.getElementById('selectAlunos').value;
    const ordemVal = document.getElementById('exOrdem').value;

    if (!aluno_id) return alert("Selecione um aluno!");

    const { error } = await supabaseClient.from('treinos').insert([{ 
        aluno_id,
        exercicio: document.getElementById('exNome').value,
        series: parseInt(document.getElementById('exSeries').value),
        reps: document.getElementById('exReps').value,
        descanso: parseInt(
