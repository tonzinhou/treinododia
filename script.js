// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://qdmvlpnevvxvjdvgooeh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r-__wMRaOzmh1AGM-tSkbQ_Kp5HkQUx';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let abaAtual = 'usuario';
let treinoSelecionado = 'A';
let intervaloTimer;

// 2. MAPEAMENTO DE CORES POR GRUPO MUSCULAR
const coresGrupos = {
    'Peito': '#ff4444',
    'Costas': '#44ff44',
    'Pernas': '#4444ff',
    'Ombros': '#ff8800',
    'Braços': '#ff44ff',
    'Core': '#00ffff'
};

// 3. CONTROLE DE ACESSO E LOGIN
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

// 4. FUNÇÕES DO ADMINISTRADOR
async function cadastrarNovoAluno() {
    const nome = document.getElementById('novoNome').value;
    const email = document.getElementById('novoEmail').value;
    const password = document.getElementById('novaSenha').value;

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert(error.message);

    if (data.user) {
        await supabaseClient.from('perfis').insert([{ id: data.user.id, nome, role: 'usuario' }]);
        alert("Aluno Cadastrado!");
        carregarAlunos();
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
    const { error } = await supabaseClient.from('treinos').insert([{ 
        aluno_id: document.getElementById('selectAlunos').value,
        exercicio: document.getElementById('exNome').value,
        series: parseInt(document.getElementById('exSeries').value),
        reps: parseInt(document.getElementById('exReps').value),
        descanso: parseInt(document.getElementById('exDescanso').value) || 60,
        video_url: document.getElementById('exVideo').value,
        letra_treino: document.getElementById('exLetra').value,
        grupo: document.getElementById('exGrupo').value
    }]);
    if (error) alert(error.message); else alert("Treino salvo!");
}

// 5. FUNÇÕES DO ALUNO
window.filtrarTreino = function(letra) {
    treinoSelecionado = letra;
    document.querySelectorAll('.filtro-treinos button').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#252525';
        btn.style.color = 'white';
    });

    const btnAtivo = document.getElementById(`btn-treino-${letra}`);
    if (btnAtivo) {
        btnAtivo.classList.add('active');
        btnAtivo.style.background = '#ffcc00';
        btnAtivo.style.color = 'black';
    }

    supabaseClient.auth.getUser().then(({data}) => {
        if (data.user) carregarTreinos(data.user.id);
    });
};

async function carregarDadosAluno() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return window.location.href = 'index.html';
    const { data } = await supabaseClient.from('perfis').select('nome').eq('id', user.id).single();
    if (data) document.getElementById('nome-aluno').innerText = data.nome;
    carregarTreinos(user.id);
}

async function carregarTreinos(alunoId) {
    const { data: treinos } = await supabaseClient
        .from('treinos')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('letra_treino', treinoSelecionado);

    const container = document.getElementById('lista-exercicios');
    if (!container) return;
    container.innerHTML = "";

    if (treinos && treinos.length > 0) {
        treinos.forEach(item => {
            const temVideo = item.video_url && item.video_url.includes("youtu");
            const corDoExercicio = coresGrupos[item.grupo] || '#ffcc00';
            const tempoDescanso = item.descanso || 60;
            
            container.innerHTML += `
                <div class="card-treino">
                    <div class="card-content">
                        <div class="info">
                            <h3 style="color: ${corDoExercicio}">${item.exercicio}</h3>
                            <span style="font-size: 0.7rem; text-transform: uppercase;">${item.grupo}</span><br>
                            <span>${item.series} x ${item.reps}</span>
                            
                            <div class="controle-carga" style="margin-top: 10px; display: flex; gap: 5px;">
                                <input type="text" class="input-carga" placeholder="Peso" value="${item.carga || ''}" 
                                       style="width: 70px; padding: 5px; font-size: 0.8rem; background: #000; border: 1px solid #444; color: #ffcc00;">
                                <button onclick="salvarCarga('${item.id}', this)" 
                                        style="font-size: 0.7rem; padding: 5px 10px; background: #333; color: #ffcc00; border: 1px solid #ffcc00; border-radius: 4px; cursor: pointer;">
                                    SALVAR
                                </button>
                            </div>

                            <button onclick="iniciarDescanso(${tempoDescanso})" 
                                    style="margin-top: 10px; background: #252525; color: #ffcc00; border: 1px solid #444; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                                ⏱️ Descansar ${tempoDescanso}s
                            </button>
                        </div>
                        <div class="acoes">
                            ${temVideo ? `<button onclick="toggleVideo(this, '${item.video_url}')" class="btn-video">VÍDEO ▾</button>` : ''}
                            <span style="margin-left:10px; cursor:pointer; font-size: 1.5rem;" onclick="toggleCheck(this)">✅</span>
                        </div>
                    </div>
                    <div class="video-dropdown">
                        <div class="video-container">
                            <iframe src="" frameborder="0" allowfullscreen></iframe>
                        </div>
                    </div>
                </div>`;
        });
    } else {
        container.innerHTML = `<p class='msg-vazio'>Nenhum exercício para o Treino ${treinoSelecionado}.</p>`;
    }
}

// 6. UTILITÁRIOS (VÍDEO, CARGA, TIMER)
function toggleVideo(botao, url) {
    const card = botao.closest('.card-treino');
    const gaveta = card.querySelector('.video-dropdown');
    const iframe = gaveta.querySelector('iframe');

    if (gaveta.classList.contains('open')) {
        gaveta.classList.remove('open');
        iframe.src = "";
        botao.innerText = "VÍDEO ▾";
    } else {
        let videoId = "";
        if (url.includes("v=")) videoId = url.split("v=")[1].split("&")[0];
        else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1];

        if (videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            gaveta.classList.add('open');
            botao.innerText = "FECHAR ▴";
        } else {
            window.open(url, '_blank');
        }
    }
}

async function salvarCarga(exercicioId, botao) {
    const card = botao.closest('.card-treino');
    const valorCarga = card.querySelector('.input-carga').value;
    const { error } = await supabaseClient.from('treinos').update({ carga: valorCarga }).eq('id', exercicioId);
    if (!error) {
        botao.innerText = "OK!";
        setTimeout(() => { botao.innerText = "SALVAR"; }, 2000);
    }
}

function iniciarDescanso(segundos) {
    clearInterval(intervaloTimer);
    let tempo = segundos;
    const display = document.getElementById('cronometro-tempo');
    const container = document.getElementById('cronometro-container');
    
    container.classList.add('visible');

    intervaloTimer = setInterval(() => {
        const min = Math.floor(tempo / 60);
        const seg = tempo % 60;
        display.innerText = `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
        
        if (tempo <= 0) {
            clearInterval(intervaloTimer);
            document.getElementById('alarme-audio').play();
            display.innerText = "TREINE!";
            setTimeout(() => { container.classList.remove('visible'); }, 4000);
        }
        tempo--;
    }, 1000);
}

function pararCronometro() {
    clearInterval(intervaloTimer);
    document.getElementById('cronometro-container').classList.remove('visible');
}

function toggleCheck(el) {
    el.style.opacity = el.style.opacity === "0.3" ? "1" : "0.3";
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
