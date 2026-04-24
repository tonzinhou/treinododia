// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://qdmvlpnevvxvjdvgooeh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r-__wMRaOzmh1AGM-tSkbQ_Kp5HkQUx';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let abaAtual = 'usuario';

// 2. FUNÇÃO DE TROCA DE ABAS
window.switchTab = function(tipo) {
    console.log("Trocando para a aba:", tipo);
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

// 3. FUNÇÃO DE LOGIN
async function fazerLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) return alert("Preencha e-mail e senha.");

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email, password: password
        });
        if (error) return alert("Erro: " + error.message);
        if (data.user) verificarPermissao(data.user.id);
    } catch (err) { 
        console.error(err); 
    }
}

async function verificarPermissao(userId) {
    const { data } = await supabaseClient.from('perfis').select('role').eq('id', userId);
    if (!data || data.length === 0) return alert("Perfil não encontrado.");
    
    const perfil = data[0];
    if (perfil.role.trim().toLowerCase() === abaAtual.trim().toLowerCase()) {
        window.location.href = perfil.role === 'admin' ? 'admin.html' : 'aluno.html';
    } else {
        alert("Acesso Negado! Sua conta é " + perfil.role + " mas você tentou entrar como " + abaAtual);
        await supabaseClient.auth.signOut();
    }
}

// 4. FUNÇÕES ADMIN
async function cadastrarNovoAluno() {
    const nome = document.getElementById('novoNome').value;
    const email = document.getElementById('novoEmail').value;
    const password = document.getElementById('novaSenha').value;

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert(error.message);

    if (data.user) {
        await supabaseClient.from('perfis').insert([{ id: data.user.id, nome, role: 'usuario' }]);
        alert("Cadastrado!");
        carregarAlunos();
    }
}

async function carregarAlunos() {
    const { data } = await supabaseClient.from('perfis').select('id, nome').neq('role', 'admin');
    const select = document.getElementById('selectAlunos');
    if (select && data) {
        select.innerHTML = '<option value="">Selecione o Aluno</option>';
        data.forEach(a => {
            select.innerHTML += `<option value="${a.id}">${a.nome}</option>`;
        });
    }
}

async function atribuirTreino() {
    const { error } = await supabaseClient.from('treinos').insert([{ 
        aluno_id: document.getElementById('selectAlunos').value,
        exercicio: document.getElementById('exNome').value,
        series: parseInt(document.getElementById('exSeries').value),
        reps: parseInt(document.getElementById('exReps').value),
        video_url: document.getElementById('exVideo').value
    }]);
    if (error) alert(error.message); else alert("Treino salvo!");
}

// 5. FUNÇÕES ALUNO
async function carregarDadosAluno() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return window.location.href = 'index.html';
    const { data } = await supabaseClient.from('perfis').select('nome').eq('id', user.id).single();
    if (data) document.getElementById('nome-aluno').innerText = data.nome;
    carregarTreinos(user.id);
}

async function carregarTreinos(alunoId) {
    const { data: treinos } = await supabaseClient.from('treinos').select('*').eq('aluno_id', alunoId);
    const container = document.getElementById('lista-exercicios');
    if (!container) return;

    if (treinos && treinos.length > 0) {
        container.innerHTML = "";
        treinos.forEach(item => {
            const btnVideo = item.video_url 
                ? `<button onclick="abrirVideo('${item.video_url}')" class="btn-video">Assistir Execução 🎥</button>` 
                : `<span style="color:#555">Sem vídeo</span>`;

            container.innerHTML += `
                <div class="card-treino">
                    <div class="info">
                        <h3>${item.exercicio}</h3>
                        <span>${item.series} x ${item.reps}</span>
                        <div style="margin-top:10px">${btnVideo}</div>
                    </div>
                    <div class="check">✅</div>
                </div>`;
        });
    } else {
        container.innerHTML = "<p>Nenhum treino encontrado.</p>";
    }
}

// 6. LÓGICA DO MODAL DE VÍDEO
function abrirVideo(url) {
    let videoId = "";
    if (url.includes("v=")) {
        videoId = url.split("v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1];
    }

    if (videoId) {
        const modal = document.getElementById('videoModal');
        const iframe = document.getElementById('videoPlayer');
        if (modal && iframe) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            modal.style.display = "block";
        }
    } else {
        window.open(url, '_blank');
    }
}

function fecharModal() {
    const modal = document.getElementById('videoModal');
    const iframe = document.getElementById('videoPlayer');
    if (modal && iframe) {
        modal.style.display = "none";
        iframe.src = "";
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('videoModal');
    if (event.target == modal) fecharModal();
};

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
