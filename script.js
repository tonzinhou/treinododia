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

    if (!email || !password) {
        alert("Por favor, preencha e-mail e senha.");
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            alert("Erro no login: " + error.message);
            return;
        }

        if (data.user) {
            verificarPermissao(data.user.id);
        }
    } catch (err) {
        console.error("Erro inesperado:", err);
    }
}

// 4. VERIFICAÇÃO DE PERMISSÃO E REDIRECIONAMENTO
async function verificarPermissao(userId) {
    const { data, error } = await supabaseClient
        .from('perfis')
        .select('role')
        .eq('id', userId);

    if (error) {
        alert("Erro técnico: " + error.message);
        return;
    }

    if (!data || data.length === 0) {
        alert("Perfil não encontrado na tabela 'perfis'.");
        await supabaseClient.auth.signOut();
        return;
    }

    const perfil = data[0];
    
    // Compara a aba selecionada com o cargo no banco
    if (perfil.role.trim().toLowerCase() === abaAtual.trim().toLowerCase()) {
        window.location.href = perfil.role === 'admin' ? 'admin.html' : 'aluno.html';
    } else {
        alert("Acesso Negado! Você tentou entrar como " + abaAtual + " mas seu perfil é " + perfil.role);
        await supabaseClient.auth.signOut();
    }
}

// 5. FUNÇÕES DO PAINEL ADMIN
async function cadastrarNovoAluno() {
    const nome = document.getElementById('novoNome').value;
    const email = document.getElementById('novoEmail').value;
    const password = document.getElementById('novaSenha').value;

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        alert("Erro ao criar login: " + error.message);
        return;
    }

    if (data.user) {
        const { error: profileError } = await supabaseClient
            .from('perfis')
            .insert([{ id: data.user.id, nome: nome, role: 'usuario' }]);

        if (profileError) {
            alert("Erro ao salvar perfil: " + profileError.message);
        } else {
            alert(`Aluno ${nome} cadastrado!`);
            carregarAlunos();
        }
    }
}

async function carregarAlunos() {
    const { data, error } = await supabaseClient
        .from('perfis')
        .select('id, nome')
        .neq('role', 'admin');

    const select = document.getElementById('selectAlunos');
    if (!select) return;

    if (data) {
        select.innerHTML = '<option value="">Selecione o Aluno</option>';
        data.forEach(aluno => {
            let option = document.createElement('option');
            option.value = aluno.id;
            option.text = aluno.nome;
            select.appendChild(option);
        });
    }
}

async function atribuirTreino() {
    const alunoId = document.getElementById('selectAlunos').value;
    const exercicio = document.getElementById('exNome').value;
    const series = document.getElementById('exSeries').value;
    const reps = document.getElementById('exReps').value;
    const videoUrl = document.getElementById('exVideo').value;

    const { error } = await supabaseClient
        .from('treinos')
        .insert([{ 
            aluno_id: alunoId, 
            exercicio: exercicio, 
            series: parseInt(series), 
            reps: parseInt(reps),
            video_url: videoUrl 
        }]);

    if (error) alert("Erro: " + error.message);
    else alert("Treino salvo!");
}

// 6. FUNÇÕES DA ÁREA DO ALUNO
async function carregarDadosAluno() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const { data: perfil } = await supabaseClient
        .from('perfis')
        .select('nome')
        .eq('id', user.id)
        .single();

    if (perfil) document.getElementById('nome-aluno').innerText = perfil.nome;
    carregarTreinos(user.id);
}

async function carregarTreinos(alunoId) {
    const { data: treinos, error } = await supabaseClient
        .from('treinos')
        .select('*')
        .eq('aluno_id', alunoId);

    const container = document.getElementById('lista-exercicios');
    if (!container) return;

    if (treinos && treinos.length > 0) {
        container.innerHTML = "";
        treinos.forEach(item => {
            const linkVideo = item.video_url 
                ? `<a href="${item.video_url}" target="_blank" class="btn-video">Assistir Execução 🎥</a>` 
                : `<span style="color: #555; font-size: 0.8rem;">Sem vídeo disponível</span>`;

            container.innerHTML += `
                <div class="card-treino">
                    <div class="info">
                        <h3>${item.exercicio}</h3>
                        <span>${item.series} séries de ${item.reps} reps</span>
                        <div style="margin-top: 10px;">${linkVideo}</div>
                    </div>
                    <div class="check">✅</div>
                </div>
            `;
        });
    } else {
        container.innerHTML = "<p>Nenhum treino encontrado.</p>";
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
