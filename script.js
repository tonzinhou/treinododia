// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://qdmvlpnevvxvjdvgooeh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r-__wMRaOzmh1AGM-tSkbQ_Kp5HkQUx';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let abaAtual = 'usuario'; 
let treinoSelecionado = 'A'; 
let intervaloTimer; 

const coresGrupos = {
    'Peito': '#ff4444', 'Costas': '#44ff44', 'Pernas': '#4444ff',
    'Ombros': '#ff8800', 'Braços': '#ff44ff', 'Core': '#00ffff'
};

// 2. LÓGICA DE LOGIN (NICKNAME)
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
    if (data && data.role.toLowerCase() === abaAtual.toLowerCase()) {
        window.location.href = data.role === 'admin' ? 'admin.html' : 'aluno.html';
    } else {
        alert("Acesso Negado!");
        await supabaseClient.auth.signOut();
    }
}

window.switchTab = function(tipo) {
    abaAtual = tipo;
    const btnAluno = document.getElementById('tab-aluno');
    const btnAdmin = document.getElementById('tab-admin');
    if (tipo === 'admin') {
        btnAdmin.classList.add('active'); btnAluno.classList.remove('active');
        document.getElementById('login-title').innerText = 'Acesso Administrador';
    } else {
        btnAluno.classList.add('active'); btnAdmin.classList.remove('active');
        document.getElementById('login-title').innerText = 'Acesso Aluno';
    }
};

// 3. FUNÇÕES DO ADMINISTRADOR
async function cadastrarNovoAluno() {
    const nomeEl = document.getElementById('novoNome');
    const nickEl = document.getElementById('novoNick');
    const senhaEl = document.getElementById('novaSenha');
    const fotoEl = document.getElementById('novoFoto');
    const fraseEl = document.getElementById('novoFrase');

    if (!nomeEl || !nickEl || !senhaEl) return alert("Campos obrigatórios não encontrados.");

    const nome = nomeEl.value;
    const nick = nickEl.value.trim().toLowerCase();
    const password = senhaEl.value;
    const foto_url = fotoEl ? fotoEl.value : '';
    const frase = fraseEl ? fraseEl.value : '';

    if (!nome || !nick || !password) return alert("Preencha Nome, Nickname e Senha!");

    const emailFicticio = `${nick}@academia.com`;

    const { data, error } = await supabaseClient.auth.signUp({ email: emailFicticio, password });

    if (error) return alert("Erro Auth: " + error.message);

    if (data.user) {
        const { error: perfilError } = await supabaseClient.from('perfis').insert([{ 
            id: data.user.id, nome, nickname: nick, role: 'usuario',
            foto_url: foto_url || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            frase: frase || 'Foco na missão!'
        }]);

        if (perfilError) return alert("Erro Perfil: " + perfilError.message);
        
        alert(`Aluno ${nick} cadastrado!`);
        carregarAlunos();
    }
}

async function carregarAlunos() {
    const { data } = await supabaseClient.from('perfis').select('id, nome').neq('role', 'admin');
    const s1 = document.getElementById('selectAlunos');
    const s2 = document.getElementById('selectAlunosEdicao');
    const opt = '<option value="">Selecione o Aluno</option>' + (data ? data.map(a => `<option value="${a.id}">${a.nome}</option>`).join('') : '');
    if (s1) s1.innerHTML = opt;
    if (s2) s2.innerHTML = opt;
}

async function atribuirTreino() {
    const aluno_id = document.getElementById('selectAlunos').value;
    if (!aluno_id) return alert("Selecione um aluno!");

    const { error } = await supabaseClient.from('treinos').insert([{ 
        aluno_id,
        exercicio: document.getElementById('exNome').value,
        series: parseInt(document.getElementById('exSeries').value),
        reps: document.getElementById('exReps').value,
        descanso: parseInt(document.getElementById('exDescanso').value) || 60,
        video_url: document.getElementById('exVideo').value,
        letra_treino: document.getElementById('exLetra').value,
        grupo: document.getElementById('exGrupo').value
    }]);
    if (error) alert(error.message); else alert("Adicionado!");
}

async function buscarTreinosParaEdicao() {
    const alunoId = document.getElementById('selectAlunosEdicao').value;
    const container = document.getElementById('lista-edicao-treinos');
    if(!alunoId) return container.innerHTML = "";

    const { data: treinos } = await supabaseClient.from('treinos').select('*').eq('aluno_id', alunoId).order('letra_treino');
    
    container.innerHTML = "";
    treinos?.forEach(t => {
        container.innerHTML += `
            <div style="background: #252525; padding: 15px; border-radius: 8px; border-left: 4px solid #ffcc00; margin-bottom:10px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <select id="edit-letra-${t.id}">
                        <option value="A" ${t.letra_treino === 'A' ? 'selected' : ''}>Treino A</option>
                        <option value="B" ${t.letra_treino === 'B' ? 'selected' : ''}>Treino B</option>
                        <option value="C" ${t.letra_treino === 'C' ? 'selected' : ''}>Treino C</option>
                        <option value="C" ${t.letra_treino === 'D' ? 'selected' : ''}>Treino D</option>
                        <option value="C" ${t.letra_treino === 'E' ? 'selected' : ''}>Treino E</option>
                    </select>
                    <select id="edit-grupo-${t.id}">
                        <option value="Peito" ${t.grupo === 'Peito' ? 'selected' : ''}>Peito</option>
                        <option value="Costas" ${t.grupo === 'Costas' ? 'selected' : ''}>Costas</option>
                        <option value="Pernas" ${t.grupo === 'Pernas' ? 'selected' : ''}>Pernas</option>
                        <option value="Ombros" ${t.grupo === 'Ombros' ? 'selected' : ''}>Ombros</option>
                        <option value="Braços" ${t.grupo === 'Braços' ? 'selected' : ''}>Braços</option>
                        <option value="Core" ${t.grupo === 'Core' ? 'selected' : ''}>Core</option>
                    </select>
                </div>
                <input type="text" value="${t.exercicio}" id="edit-nome-${t.id}">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; margin: 10px 0;">
                    <input type="number" value="${t.series}" id="edit-ser-${t.id}">
                    <input type="number" value="${t.reps}" id="edit-rep-${t.id}">
                    <input type="number" value="${t.des || t.descanso}" id="edit-des-${t.id}">
                </div>
                <input type="text" value="${t.video_url || ''}" id="edit-video-${t.id}" placeholder="Link do Vídeo">
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button onclick="salvarEdicao('${t.id}')" style="flex: 2; background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">Salvar</button>
                    <button onclick="excluirExercicio('${t.id}')" style="flex: 1; background: #ff4444; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">Excluir</button>
                </div>
            </div>`;
    });
}

async function salvarEdicao(id) {
    const { error } = await supabaseClient.from('treinos').update({
        exercicio: document.getElementById(`edit-nome-${id}`).value,
        series: parseInt(document.getElementById(`edit-ser-${id}`).value),
        reps: parseInt(document.getElementById(`edit-rep-${id}`).value),
        descanso: parseInt(document.getElementById(`edit-des-${id}`).value),
        letra_treino: document.getElementById(`edit-letra-${id}`).value,
        grupo: document.getElementById(`edit-grupo-${id}`).value,
        video_url: document.getElementById(`edit-video-${id}`).value
    }).eq('id', id);
    if (error) alert("Erro!"); else alert("Atualizado!");
}

async function excluirExercicio(id) {
    if(confirm("Excluir?")) {
        const { error } = await supabaseClient.from('treinos').delete().eq('id', id);
        if(!error) buscarTreinosParaEdicao();
    }
}

// 4. FUNÇÕES DO ALUNO (TIMER, CARGA, ETC)
// [Mantenha as funções carregarDadosAluno, carregarTreinos, iniciarDescanso, salvarCarga e toggleVideo que já funcionavam]
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
    supabaseClient.auth.getUser().then(({data}) => { if (data.user) carregarTreinos(data.user.id); });
};

async function carregarTreinos(alunoId) {
    const { data: treinos } = await supabaseClient.from('treinos').select('*').eq('aluno_id', alunoId).eq('letra_treino', treinoSelecionado);
    const container = document.getElementById('lista-exercicios');
    if (!container) return;
    container.innerHTML = "";
    treinos?.forEach(item => {
        const cor = coresGrupos[item.grupo] || '#ffcc00';
        container.innerHTML += `<div class="card-treino"><div class="card-content"><div class="info"><h3 style="color:${cor}">${item.exercicio}</h3><span>${item.series}x${item.reps} - ${item.grupo}</span><div style="margin-top:8px; display:flex; gap:5px;"><input type="text" class="input-carga" value="${item.carga || ''}"><button onclick="salvarCarga('${item.id}', this)" class="btn-acao-mini">SALVAR</button></div><button onclick="iniciarDescanso(${item.descanso || 60})" class="btn-timer">⏱️ Descanso ${item.descanso || 60}s</button></div><div class="acoes"><span onclick="toggleCheck(this)" class="check-icon">✅</span>${item.video_url ? `<button onclick="toggleVideo(this, '${item.video_url}')" class="btn-video">VÍDEO ▾</button>` : ''}</div></div><div class="video-dropdown"><div class="video-container"><iframe src=""></iframe></div></div></div>`;
    });
}

function iniciarDescanso(segundos) {
    clearInterval(intervaloTimer);
    let tempo = segundos;
    const container = document.getElementById('cronometro-container');
    const display = document.getElementById('cronometro-tempo');
    container.classList.add('visible');
    intervaloTimer = setInterval(() => {
        const min = Math.floor(tempo / 60); const seg = tempo % 60;
        display.innerText = `${min.toString().padStart(2,'0')}:${seg.toString().padStart(2,'0')}`;
        if (tempo <= 0) { clearInterval(intervaloTimer); document.getElementById('alarme-audio').play(); display.innerText = "TREINE!"; setTimeout(() => container.classList.remove('visible'), 5000); }
        tempo--;
    }, 1000);
}

function toggleCheck(el) { el.style.opacity = el.style.opacity === "0.3" ? "1" : "0.3"; }
async function salvarCarga(id, btn) {
    const carga = btn.closest('.info').querySelector('.input-carga').value;
    await supabaseClient.from('treinos').update({ carga }).eq('id', id);
    btn.innerText = "OK!"; setTimeout(() => btn.innerText = "SALVAR", 2000);
}
function toggleVideo(btn, url) {
    const gaveta = btn.closest('.card-treino').querySelector('.video-dropdown');
    const iframe = gaveta.querySelector('iframe');
    if (gaveta.classList.contains('open')) { gaveta.classList.remove('open'); iframe.src = ""; btn.innerText = "VÍDEO ▾"; }
    else { let id = url.includes("v=") ? url.split("v=")[1].split("&")[0] : url.split("youtu.be/")[1]; iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1`; gaveta.classList.add('open'); btn.innerText = "FECHAR ▴"; }
}
async function logout() { await supabaseClient.auth.signOut(); window.location.href = 'index.html'; }
function pararCronometro() { clearInterval(intervaloTimer); document.getElementById('cronometro-container').classList.remove('visible'); }
async function trocarFotoPerfil() { const l = prompt("Link da foto:"); if(l) { const { data:{user} } = await supabaseClient.auth.getUser(); await supabaseClient.from('perfis').update({foto_url:l}).eq('id',user.id); document.getElementById('img-aluno').src=l; } }
