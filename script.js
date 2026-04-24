// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://qdmvlpnevvxvjdvgooeh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r-__wMRaOzmh1AGM-tSkbQ_Kp5HkQUx';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let abaAtual = 'usuario';
let treinoSelecionado = 'A'; // Padrão inicial para o aluno

// 2. MAPEAMENTO DE CORES POR GRUPO MUSCULAR
const coresGrupos = {
    'Peito': '#ff4444',    // Vermelho
    'Costas': '#44ff44',   // Verde
    'Pernas': '#4444ff',   // Azul
    'Ombros': '#ff8800',   // Laranja
    'Braços': '#ff44ff',   // Rosa/Roxo
    'Core': '#00ffff'      // Ciano
};

// 3. CONTROLE DE ABAS (LOGIN)
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

// 4. LOGIN E PERMISSÕES
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

// 5. FUNÇÕES DO ADMIN (CADASTRO E PRESCRIÇÃO)
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
        video_url: document.getElementById('exVideo').value,
        letra_treino: document.getElementById('exLetra').value, // NOVO
        grupo: document.getElementById('exGrupo').value          // NOVO
    }]);
    if (error) alert(error.message); else alert("Treino salvo!");
}

// 6. FUNÇÕES DO ALUNO (FILTROS E EXIBIÇÃO)

// Função para o aluno trocar entre Treino A, B ou C
window.filtrarTreino = function(letra) {
    treinoSelecionado = letra;
    console.log("Mudando para o treino:", letra);

    // 1. Atualiza o visual dos botões
    document.querySelectorAll('.filtro-treinos button').forEach(btn => {
        btn.classList.remove('active'); // Remove a cor amarela de todos
        btn.style.background = '#252525';
        btn.style.color = 'white';
    });

    // 2. Destaca o botão clicado
    const btnAtivo = document.getElementById(`btn-treino-${letra}`);
    if (btnAtivo) {
        btnAtivo.classList.add('active');
        btnAtivo.style.background = '#ffcc00';
        btnAtivo.style.color = 'black';
    }

    // 3. Recarrega os dados do banco
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
    const { data: treinos, error } = await supabaseClient
        .from('treinos')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('letra_treino', treinoSelecionado); // Filtra pela aba A, B ou C

    const container = document.getElementById('lista-exercicios');
    if (!container) return;

    if (treinos && treinos.length > 0) {
        container.innerHTML = "";
        treinos.forEach(item => {
            const temVideo = item.video_url && item.video_url.includes("youtu");
            const corDoExercicio = coresGrupos[item.grupo] || '#ffcc00'; // Usa a cor do grupo ou dourado
            
            container.innerHTML += `
    <div class="card-treino">
        <div class="card-content">
            <div class="info">
                <h3 style="color: ${corDoExercicio}">${item.exercicio}</h3>
                <span style="font-size: 0.7rem; text-transform: uppercase;">${item.grupo}</span><br>
                <span>${item.series} x ${item.reps}</span>
                
                <div class="controle-carga" style="margin-top: 10px; display: flex; gap: 5px; align-items: center;">
                    <input type="text" class="input-carga" placeholder="Peso" value="${item.carga || ''}" 
                           style="width: 70px; padding: 5px; font-size: 0.8rem; background: #000; border: 1px solid #444;">
                    <button onclick="salvarCarga('${item.id}', this)" 
                            style="font-size: 0.7rem; padding: 5px 10px; background: #333; color: #ffcc00; border: 1px solid #ffcc00; border-radius: 4px; cursor: pointer;">
                        SALVAR
                    </button>
                </div>
            </div>
            <div class="acoes">
                ${temVideo ? `<button onclick="toggleVideo(this, '${item.video_url}')" class="btn-video">VÍDEO ▾</button>` : ''}
                <span style="margin-left:10px; cursor:pointer;" onclick="this.innerText = this.innerText === '✅' ? '⬜' : '✅'">✅</span>
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

// 7. LÓGICA DE ABRIR/FECHAR VÍDEO
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

// 8* controle de carga
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
async function salvarCarga(exercicioId, botao) {
    const card = botao.closest('.card-treino');
    const valorCarga = card.querySelector('.input-carga').value;

    const { error } = await supabaseClient
        .from('treinos')
        .update({ carga: valorCarga })
        .eq('id', exercicioId);

    if (error) {
        alert("Erro ao salvar carga: " + error.message);
    } else {
        // Efeito visual de sucesso
        botao.innerText = "✅";
        setTimeout(() => { botao.innerText = "SALVAR"; }, 2000);
    }
}
