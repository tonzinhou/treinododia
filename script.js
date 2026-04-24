// 1. CONFIGURAÇÃO
const SUPABASE_URL = 'https://qdmvlpnevvxvjdvgooeh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r-__wMRaOzmh1AGM-tSkbQ_Kp5HkQUx';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let treinoSelecionado = 'A';
let intervaloTimer;

const coresGrupos = {
    'Peito': '#ff4444', 'Costas': '#44ff44', 'Pernas': '#4444ff',
    'Ombros': '#ff8800', 'Braços': '#ff44ff', 'Core': '#00ffff'
};

// 2. FUNÇÕES ALUNO
async function carregarDadosAluno() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return window.location.href = 'index.html';
    
    const { data } = await supabaseClient.from('perfis').select('nome').eq('id', user.id).single();
    if (data) document.getElementById('nome-aluno').innerText = data.nome;
    
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
                                <button onclick="salvarCarga('${item.id}', this)" style="cursor:pointer; background:#333; color:#ffcc00; border:1px solid #ffcc00; border-radius:4px; font-size:0.7rem; padding:4px 8px;">SALVAR</button>
                            </div>
                            <button onclick="iniciarDescanso(${item.descanso || 60})" style="margin-top:8px; background:#252525; color:#ffcc00; border:1px solid #444; padding:5px; border-radius:4px; font-size:0.75rem; cursor:pointer;">⏱️ Descanso ${item.descanso || 60}s</button>
                        </div>
                        <div class="acoes" style="display:flex; flex-direction:column; gap:10px; align-items:flex-end;">
                            <span style="font-size:1.5rem; cursor:pointer;" onclick="this.style.opacity = this.style.opacity === '0.3' ? '1' : '0.3'">✅</span>
                            ${temVideo ? `<button onclick="toggleVideo(this, '${item.video_url}')" class="btn-video">VÍDEO ▾</button>` : ''}
                        </div>
                    </div>
                    <div class="video-dropdown"><div class="video-container"><iframe src="" frameborder="0" allowfullscreen></iframe></div></div>
                </div>`;
        });
    } else {
        container.innerHTML = `<p class="msg-status">Nenhum treino para a letra ${treinoSelecionado}.</p>`;
    }
}

// 3. UTILITÁRIOS
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
    if (!error) { btn.innerText = "OK!"; setTimeout(() => btn.innerText = "SALVAR", 2000); }
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

async function logout() { await supabaseClient.auth.signOut(); window.location.href = 'index.html'; }
