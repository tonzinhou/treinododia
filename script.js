// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://qdmvlpnevvxvjdvgooeh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r-__wMRaOzmh1AGM-tSkbQ_Kp5HkQUx';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let abaAtual = 'usuario'; // Controle do Login (Aluno/Admin)
let treinoSelecionado = 'A'; // Filtro padrão do Aluno
let intervaloTimer; // Referência para o cronômetro

// Mapeamento de Cores para Grupos Musculares
const coresGrupos = {
    'Peito': '#ff4444', 
    'Costas': '#44ff44', 
    'Pernas': '#4444ff',
    'Ombros': '#ff8800', 
    'Braços': '#ff44ff', 
    'Core': '#00ffff'
};

// 2. LÓGICA DE LOGIN E ACESSO
window.switchTab = function(tipo) {
    abaAtual = tipo;
    const btnAluno = document.getElementById('tab-aluno');
    const btnAdmin = document.getElementById('tab-admin');
    const titulo = document.getElementById('login-title');
    const desc = document.getElementById('login-desc');

    if (!btnAluno || !btnAdmin) return;

    if (tipo === 'admin') {
        btnAdmin.classList.add('active');
        btnAluno.classList.remove('active');
        titulo.innerText = 'Acesso Administrador';
        desc.innerText = 'Área restrita para gestão.';
    } else {
        btnAluno.classList.add('active');
        btnAdmin.classList.remove('active');
        titulo.innerText = 'Acesso Aluno';
        desc.innerText = 'Digite seus dados para ver seu treino.';
    }
};

async function fazerLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) return alert("Preencha e-mail e senha.");

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Erro: " + error.message);
    if (data.user) verificarPermissao(data.user.id);
}

async function verificarPermissao(userId) {
    const { data } = await supabaseClient.from('perfis').select('role').eq('id', userId).single();
    if (data && data.role.toLowerCase() === abaAtual.toLowerCase()) {
        window.location.href = data.role === 'admin' ? 'admin.html' : 'aluno.html';
    } else {
        alert("Acesso Negado para esta categoria!");
        await supabaseClient.auth.signOut();
    }
}

// 3. FUNÇÕES DO ADMINISTRADOR (CADASTRO E PRESCRIÇÃO)
async function cadastrarNovoAluno() {
    const nome = document.getElementById('novoNome').value;
    const email = document.getElementById('novoEmail').value;
    const password = document.getElementById('novaSenha').value;
    const foto_url = document.getElementById('novoFoto') ? document.getElementById('novoFoto').value : '';
    const frase = document.getElementById('novoFrase') ? document.getElementById('novoFrase').value : '';

    if (!nome || !email || !password) return alert("Nome, E-mail e Senha são obrigatórios.");

    // Criar usuário no Supabase Auth
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    
    if (error) return alert("Erro ao criar conta: " + error.message);

    if (data.user) {
        // Criar perfil na tabela 'perfis'
        const { error: perfilError } = await supabaseClient.from('perfis').insert([{ 
            id: data.user.id, 
            nome: nome, 
            role: 'usuario',
            foto_url: foto_url || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            frase: frase || 'Foco na missão!'
        }]);

        if (perfilError) return alert("Erro ao salvar perfil: " + perfilError.message);
        
        alert("Aluno " + nome + " cadastrado com sucesso!");
        carregarAlunos(); // Atualiza a lista de seleção
    }
}

async function carregarAlunos() {
    const { data } = await supabaseClient.from('perfis').select('id, nome').neq('role', 'admin');
    const select = document.getElementById('selectAlunos');
    if (select && data) {
        select.innerHTML = '<option value="">Selecione o Aluno</option>';
        data.forEach(a => select.innerHTML += `<option value="${a.id}">${a.nome}</option>`);
    }
}

async function atribuirTreino() {
    const aluno_id = document.getElementById('selectAlunos').value;
    if (!aluno_id) return alert("Selecione um aluno primeiro!");

    const { error } = await supabaseClient.from('treinos').insert([{ 
        aluno_id: aluno_id,
        exercicio: document.getElementById('exNome').value,
        series: parseInt(document.getElementById('exSeries').value),
        reps: parseInt(document.getElementById('exReps').value),
        descanso: parseInt(document.getElementById('exDescanso').value) || 60,
        video_url: document.getElementById('exVideo').value,
        letra_treino: document.getElementById('exLetra').value,
        grupo: document.getElementById('exGrupo').value
    }]);

    if (error) alert("Erro ao salvar treino: " + error.message); 
    else alert("Exercício adicionado!");
}

// 4. FUNÇÕES DO ALUNO
async function carregarDadosAluno() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return window.location.href = 'index.html';
    
    const { data } = await supabaseClient.from('perfis').select('nome, foto_url, frase').eq('id', user.id).single();
    if (data) {
        document.getElementById('nome-aluno').innerText = data.nome;
        if (data.foto_url) document.getElementById('img-aluno').src = data.foto_url;
        if (data.frase) document.querySelector('.frase-motivacional').innerText = `"${data.frase}"`;
    }
    carregarTreinos(user.id);
}

window.filtrarTreino = function(letra) {
    treinoSelecionado = letra;
    document.querySelectorAll('.filtro-treinos button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-treino-${letra}`).classList.add('active');
    
    supabaseClient.auth.getUser().then(({data}) => {
        if (data.user) carregarTreinos(data.user.id);
    });
};

async function carregarTreinos(alunoId) {
    const { data: treinos } = await supabaseClient
        .from('treinos').select('*')
        .eq('aluno_id', alunoId).eq('letra_treino', treinoSelecionado);

    const container = document.getElementById('lista-exercicios');
    if (!container) return;
    container.innerHTML = "";

    if (treinos && treinos.length > 0) {
        treinos.forEach(item => {
            const temVideo = item.video_url && item.video_url.includes("youtu");
            const cor = coresGrupos[item.grupo] || '#ffcc00';
            
            container.innerHTML += `
                <div class="card-treino">
                    <div class="card-content">
                        <div class="info">
                            <h3 style="color: ${cor}">${item.exercicio}</h3>
                            <span style="font-size:0.75rem; color:#aaa">${item.series}x${item.reps} - ${item.grupo}</span>
                            <div style="margin-top:8px; display:flex; gap:5px; align-items:center;">
                                <input type="text" class="input-carga" placeholder="Carga" value="${item.carga || ''}">
                                <button onclick="salvarCarga('${item.id}', this)" class="btn-acao-mini">SALVAR</button>
                            </div>
                            <button onclick="iniciarDescanso(${item.descanso || 60})" class="btn-timer">⏱️ Descanso ${item.descanso || 60}s</button>
                        </div>
                        <div class="acoes">
                            <span class="check-icon" onclick="toggleCheck(this)">✅</span>
                            ${temVideo ? `<button onclick="toggleVideo(this, '${item.video_url}')" class="btn-video">VÍDEO ▾</button>` : ''}
                        </div>
                    </div>
                    <div class="video-dropdown"><div class="video-container"><iframe src="" frameborder="0" allowfullscreen></iframe></div></div>
                </div>`;
        });
    } else {
        container.innerHTML = `<p class="msg-status">Nenhum exercício para o Treino ${treinoSelecionado}.</p>`;
    }
}

// 5. UTILITÁRIOS (CRONÔMETRO, CARGA, VÍDEO)
function iniciarDescanso(segundos) {
    clearInterval(intervaloTimer);
    let tempo = segundos;
    const container = document.getElementById('cronometro-container');
    const display = document.getElementById('cronometro-tempo');
    container.classList.add('visible');

    intervaloTimer = setInterval(() => {
        const min = Math.floor(tempo / 60);
        const seg = tempo % 60;
        display.innerText = `${min.toString().padStart(2,'0')}:${seg.toString().padStart(2,'0')}`;
        if (tempo <= 0) {
            clearInterval(intervaloTimer);
            document.getElementById('alarme-audio').play();
            display.innerText = "TREINE!";
            setTimeout(() => container.classList.remove('visible'), 5000);
        }
        tempo--;
    }, 1000);
}

function pararCronometro() {
    clearInterval(intervaloTimer);
    document.getElementById('cronometro-container').classList.remove('visible');
}

async function salvarCarga(id, btn) {
    const carga = btn.closest('.info').querySelector('.input-carga').value;
    const { error } = await supabaseClient.from('treinos').update({ carga }).eq('id', id);
    if (!error) { 
        btn.innerText = "OK!"; 
        setTimeout(() => btn.innerText = "SALVAR", 2000); 
    }
}

function toggleVideo(btn, url) {
    const gaveta = btn.closest('.card-treino').querySelector('.video-dropdown');
    const iframe = gaveta.querySelector('iframe');
    if (gaveta.classList.contains('open')) {
        gaveta.classList.remove('open'); iframe.src = ""; btn.innerText = "VÍDEO ▾";
    } else {
        let id = url.includes("v=") ? url.split("v=")[1].split("&")[0] : url.split("youtu.be/")[1];
        iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
        gaveta.classList.add('open'); btn.innerText = "FECHAR ▴";
    }
}

function toggleCheck(el) {
    el.style.opacity = el.style.opacity === "0.3" ? "1" : "0.3";
}

async function logout() { await supabaseClient.auth.signOut(); window.location.href = 'index.html'; }
