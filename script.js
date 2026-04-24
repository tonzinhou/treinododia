// 1. CONFIGURAÇÃO DO SUPABASE (Troque pelos seus dados!)
const SUPABASE_URL = 'https://qdmvlpnevvxvjdvgooeh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r-__wMRaOzmh1AGM-tSkbQ_Kp5HkQUx';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let abaAtual = 'usuario';

// 2. FUNÇÃO QUE ESTAVA DANDO ERRO (Coloquei no topo para garantir)
window.switchTab = function(tipo) {
    console.log("Trocando para a aba:", tipo); // Isso aparecerá no F12 se funcionar
    abaAtual = tipo;

    const btnAluno = document.getElementById('tab-aluno');
    const btnAdmin = document.getElementById('tab-admin');
    const titulo = document.getElementById('login-title');
    const desc = document.getElementById('login-desc');

    if (!btnAluno || !btnAdmin) {
        console.error("Botões não encontrados! Verifique os IDs no HTML.");
        return;
    }

    // Alternar classes e textos
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
    console.log("Tentando logar..."); // Isso deve aparecer no F12
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
            console.error("Erro do Supabase:", error.message);
            alert("Erro no login: " + error.message);
            return;
        }

        if (data.user) {
            console.log("Usuário autenticado, verificando permissões...");
            verificarPermissao(data.user.id);
        }
		if (data.user) {
		    alert("Seu ID real é: " + data.user.id); // ADICIONE ESTA LINHA
		    console.log("ID para copiar:", data.user.id);
		    verificarPermissao(data.user.id);
		}
    } 

catch (err) {
        console.error("Erro inesperado:", err);
    }
}

// 4. VERIFICAÇÃO DE PERMISSÃO
async function verificarPermissao(userId) {
    console.log("Iniciando busca para o UID:", userId);

    // Buscamos sem o .single() para evitar o erro de coerção
    const { data, error } = await supabaseClient
        .from('perfis')
        .select('role')
        .eq('id', userId);

    if (error) {
        console.error("Erro na consulta:", error.message);
        alert("Erro técnico: " + error.message);
        return;
    }

    // Verificamos se a lista veio vazia
    if (!data || data.length === 0) {
        console.error("Nenhum perfil encontrado para este ID.");
        alert("Usuário logado com sucesso, mas não possui perfil na tabela 'perfis'. Verifique se o UID no banco está correto.");
        await supabaseClient.auth.signOut();
        return;
    }

    // Se encontrou, pegamos o primeiro item da lista [0]
    const perfil = data[0];
    console.log("Perfil encontrado no banco:", perfil.role);

    if (perfil.role.trim().toLowerCase() === abaAtual.trim().toLowerCase()) {
        const destino = perfil.role === 'admin' ? 'admin.html' : 'aluno.html';
        window.location.href = destino;
    } else {
        alert("Acesso Negado! Você tentou entrar como " + abaAtual + " mas seu perfil é " + perfil.role);
        await supabaseClient.auth.signOut();
    }
}

// 5. FUNÇÕES DO PAINEL ADMIN (Para o admin.html funcionar)
async function cadastrarNovoAluno() {
    const nome = document.getElementById('novoNome').value;
    const email = document.getElementById('novoEmail').value;
    const password = document.getElementById('novaSenha').value;

    if (!nome || !email || !password) {
        alert("Preencha todos os campos do novo aluno!");
        return;
    }

    // O erro estava aqui: certifique-se de usar 'supabaseClient'
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        alert("Erro ao criar login: " + error.message);
        return;
    }

    if (data.user) {
        // Agora criamos o perfil dele na tabela 'perfis'
        const { error: profileError } = await supabaseClient
            .from('perfis')
            .insert([
                { id: data.user.id, nome: nome, role: 'usuario' }
            ]);

        if (profileError) {
            alert("Erro ao salvar perfil: " + profileError.message);
        } else {
            alert(`Aluno ${nome} cadastrado com sucesso!`);
            // Limpa os campos após o sucesso
            document.getElementById('novoNome').value = '';
            document.getElementById('novoEmail').value = '';
            document.getElementById('novaSenha').value = '';
            
            // Recarrega a lista de alunos para o select
            carregarAlunos();
        }
    }
}

// Função para carregar a lista de alunos no select do Admin
async function carregarAlunos() {
    console.log("Iniciando busca de alunos...");
    
    const { data, error } = await supabaseClient
        .from('perfis')
        .select('id, nome')
        .neq('role', 'admin'); // Pega todos que não são admin

    const select = document.getElementById('selectAlunos');
    
    if (!select) return; // Segurança caso o elemento não exista na tela

    if (error) {
        console.error("Erro ao carregar alunos:", error.message);
        return;
    }

    if (data) {
        select.innerHTML = '<option value="">Selecione o Aluno</option>';
        data.forEach(aluno => {
            let option = document.createElement('option');
            option.value = aluno.id;
            option.text = aluno.nome;
            select.appendChild(option);
        });
        console.log("Lista de alunos atualizada!");
    }
}

// Busca o nome do aluno e chama a função de carregar treinos
async function carregarDadosAluno() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Busca o nome do perfil
    const { data: perfil } = await supabaseClient
        .from('perfis')
        .select('nome')
        .eq('id', user.id)
        .single();

    if (perfil) {
        document.getElementById('nome-aluno').innerText = perfil.nome;
    }

    carregarTreinos(user.id);
}

async function atribuirTreino() {
    const alunoId = document.getElementById('selectAlunos').value;
    const exercicio = document.getElementById('exNome').value;
    const series = document.getElementById('exSeries').value;
    const reps = document.getElementById('exReps').value;
    const videoUrl = document.getElementById('exVideo').value; // <--- Lendo o link

    if (!alunoId || !exercicio) return alert("Selecione o aluno e o exercício!");

    const { error } = await supabaseClient
        .from('treinos')
        .insert([{ 
            aluno_id: alunoId, 
            exercicio: exercicio, 
            series: parseInt(series), 
            reps: parseInt(reps),
            video_url: videoUrl // <--- Enviando para o banco
        }]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        alert("Exercício com vídeo cadastrado!");
        // Limpa os campos
        document.getElementById('exNome').value = "";
        document.getElementById('exVideo').value = "";
    }
}

// Busca os treinos específicos deste aluno
async function carregarTreinos(alunoId) {
    const { data: treinos, error } = await supabaseClient
        .from('treinos')
        .select('*')
        .eq('aluno_id', alunoId);

    const container = document.getElementById('lista-exercicios');

    if (error) {
        container.innerHTML = "<p>Erro ao carregar ficha.</p>";
        return;
    }

    if (treinos.length === 0) {
        container.innerHTML = "<p class='msg-vazio'>Nenhum exercício prescrito ainda. Consulte seu instrutor!</p>";
    } else {
        container.innerHTML = ""; // Limpa o carregando
        treinos.forEach(item => {
            container.innerHTML += `
                <div class="card-treino">
                    <div class="info">
                        <h3>${item.exercicio}</h3>
                        <span>${item.series} séries de ${item.reps} reps</span>
                    		const linkVideo = item.video_url 
    ? `<a href="${item.video_url}" target="_blank" class="btn-video">Assistir Execução 🎥</a>` 
    : `<span style="color: #555; font-size: 0.8rem;">Sem vídeo disponível</span>`;

container.innerHTML += `
    <div class="card-treino">
        <div class="info">
            <h3>${item.exercicio}</h3>
            <p>${item.series} x ${item.reps}</p>
            ${linkVideo}
        </div>
        <div class="check">✅</div>
    </div>
			</div>
                    <div class="check">✅</div>
                </div>
            `;
        });
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}