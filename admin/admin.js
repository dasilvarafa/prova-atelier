// ========================================
// ATELIER 3D - PAINEL ADMIN
// ========================================

// Use os MESMOS valores que colocamos no js/script.js
const SUPABASE_URL = 'https://sqxermwhzvzjjjxvsiwv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_niWluhjYlUicrJCAsISBDg_DisFW1iU';

const ADMIN_EMAIL = 'admin@radreia.com';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Elementos da página
const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');

const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');

const portfolioForm = document.getElementById('portfolio-form');
const portfolioStatus = document.getElementById('portfolio-status');
const portfolioList = document.getElementById('portfolio-list');

const adminUser = document.getElementById('admin-user');
const logoutBtn = document.getElementById('logout-btn');


// ========================================
// INTERFACE
// ========================================

function showLogin() {
  loginSection.classList.remove('hidden');
  adminSection.classList.add('hidden');
}

function showAdmin(email) {
  loginSection.classList.add('hidden');
  adminSection.classList.remove('hidden');
  adminUser.textContent = email;
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? '#ff7b7b' : '#9cff9c';
}


// ========================================
// LOGIN
// ========================================

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  setStatus(loginStatus, 'Entrando...');

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    if (!data.user || data.user.email !== ADMIN_EMAIL) {
      await supabaseClient.auth.signOut();
      throw new Error('Usuário não autorizado.');
    }

    setStatus(loginStatus, '');

    showAdmin(data.user.email);

    await loadPortfolio();

  } catch (error) {
    console.error(error);

    setStatus(
      loginStatus,
      'E-mail ou senha incorretos.',
      true
    );
  }
});


// ========================================
// LOGOUT
// ========================================

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();

  portfolioForm.reset();

  showLogin();
});


// ========================================
// VERIFICAR SESSÃO
// ========================================

async function checkSession() {

  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error || !session) {
    showLogin();
    return;
  }

  if (session.user.email !== ADMIN_EMAIL) {
    await supabaseClient.auth.signOut();
    showLogin();
    return;
  }

  showAdmin(session.user.email);

  await loadPortfolio();
}


// ========================================
// UPLOAD DA IMAGEM
// ========================================

async function uploadImage(file) {

  const extension =
    file.name.split('.').pop().toLowerCase();

  const fileName =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

  const { error } =
    await supabaseClient.storage
      .from('portfolio-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

  if (error) throw error;

  const { data } =
    supabaseClient.storage
      .from('portfolio-images')
      .getPublicUrl(fileName);

  return {
    publicUrl: data.publicUrl,
    fileName
  };
}


// ========================================
// ADICIONAR TRABALHO
// ========================================

portfolioForm.addEventListener(
  'submit',
  async (event) => {

    event.preventDefault();

    const imageInput =
      document.getElementById('portfolio-image');

    const file = imageInput.files[0];

    if (!file) {
      setStatus(
        portfolioStatus,
        'Escolha uma imagem.',
        true
      );
      return;
    }

    setStatus(
      portfolioStatus,
      'Enviando imagem...'
    );

    let uploadedFileName = null;

    try {

      const uploaded = await uploadImage(file);

      uploadedFileName = uploaded.fileName;

      setStatus(
        portfolioStatus,
        'Salvando trabalho...'
      );

      const newItem = {

        title_pt:
          document.getElementById('title-pt')
            .value.trim(),

        title_en:
          document.getElementById('title-en')
            .value.trim(),

        description_pt:
          document.getElementById('description-pt')
            .value.trim(),

        description_en:
          document.getElementById('description-en')
            .value.trim(),

        category:
          document.getElementById('category')
            .value,

        image_url:
          uploaded.publicUrl,

        alt_pt:
          document.getElementById('alt-pt')
            .value.trim(),

        alt_en:
          document.getElementById('alt-en')
            .value.trim(),

        display_order: 0,
        is_visible: true,
        is_featured: false
      };

      const { error } =
        await supabaseClient
          .from('portfolio_items')
          .insert(newItem);

      if (error) throw error;

      portfolioForm.reset();

      setStatus(
        portfolioStatus,
        'Trabalho adicionado com sucesso!'
      );

      await loadPortfolio();

    } catch (error) {

      console.error(error);

      // Se a foto subiu mas o banco falhou,
      // remove a foto para não deixar arquivo perdido.
      if (uploadedFileName) {
        await supabaseClient.storage
          .from('portfolio-images')
          .remove([uploadedFileName]);
      }

      setStatus(
        portfolioStatus,
        'Erro ao salvar o trabalho.',
        true
      );
    }
  }
);


// ========================================
// LISTAR TRABALHOS
// ========================================

async function loadPortfolio() {

  portfolioList.innerHTML = 'Carregando...';

  const { data, error } =
    await supabaseClient
      .from('portfolio_items')
      .select(
        'id,title_pt,title_en,category,image_url,created_at'
      )
      .order('created_at', {
        ascending: false
      });

  if (error) {

    console.error(error);

    portfolioList.innerHTML =
      'Erro ao carregar os trabalhos.';

    return;
  }

  if (!data || data.length === 0) {

    portfolioList.innerHTML =
      '<p>Nenhum trabalho cadastrado ainda.</p>';

    return;
  }

  portfolioList.innerHTML =
    data.map(item => {

      const title = escapeHtml(
        item.title_pt || 'Sem título'
      );

      const category = escapeHtml(
        item.category || ''
      );

      const image = item.image_url
        ? `
          <img
            src="${escapeAttribute(item.image_url)}"
            alt="${title}"
            style="
              width:100%;
              max-width:220px;
              border-radius:10px;
              margin-top:12px;
            "
          >
        `
        : '';

      return `
        <div
          class="card"
          data-id="${item.id}"
          style="margin-top:16px;"
        >

          <strong>${title}</strong>

          <div style="margin-top:6px;">
            Categoria: ${category}
          </div>

          ${image}

          <br>

          <button
            type="button"
            class="danger delete-item"
            data-id="${item.id}"
            data-image="${escapeAttribute(
              item.image_url || ''
            )}"
          >
            Excluir
          </button>

        </div>
      `;

    }).join('');
}


// ========================================
// EXCLUIR TRABALHO
// ========================================

portfolioList.addEventListener(
  'click',
  async (event) => {

    const button =
      event.target.closest('.delete-item');

    if (!button) return;

    const id = button.dataset.id;
    const imageUrl = button.dataset.image;

    const confirmed = window.confirm(
      'Deseja realmente excluir este trabalho?'
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Excluindo...';

    try {

      // Remove imagem do Storage
      if (imageUrl) {

        const marker =
          '/storage/v1/object/public/portfolio-images/';

        if (imageUrl.includes(marker)) {

          const filePath =
            decodeURIComponent(
              imageUrl.split(marker)[1]
            );

          if (filePath) {

            const { error: storageError } =
              await supabaseClient.storage
                .from('portfolio-images')
                .remove([filePath]);

            if (storageError) {
              console.error(
                'Erro ao remover imagem:',
                storageError
              );
            }
          }
        }
      }

      // Remove registro do banco
      const { error } =
        await supabaseClient
          .from('portfolio_items')
          .delete()
          .eq('id', id);

      if (error) throw error;

      await loadPortfolio();

    } catch (error) {

      console.error(error);

      alert(
        'Não foi possível excluir o trabalho.'
      );

      button.disabled = false;
      button.textContent = 'Excluir';
    }
  }
);


// ========================================
// SEGURANÇA DE TEXTO
// ========================================

function escapeHtml(value) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}


// ========================================
// INICIAR PAINEL
// ========================================

checkSession();
