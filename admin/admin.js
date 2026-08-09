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

    const files = Array.from(imageInput.files);

    if (files.length === 0) {
      setStatus(
        portfolioStatus,
        'Escolha pelo menos uma imagem.',
        true
      );
      return;
    }

    if (files.length > 5) {
      setStatus(
        portfolioStatus,
        'Você pode escolher no máximo 5 imagens.',
        true
      );
      return;
    }

    setStatus(
      portfolioStatus,
      'Enviando imagens...'
    );

    const uploadedImages = [];
    let createdItemId = null;

    try {

      // Envia todas as imagens
      for (const file of files) {
        const uploaded = await uploadImage(file);
        uploadedImages.push(uploaded);
      }

      setStatus(
        portfolioStatus,
        'Salvando trabalho...'
      );

      const altPt =
        document.getElementById('alt-pt')
          .value.trim();

      const altEn =
        document.getElementById('alt-en')
          .value.trim();

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

        // A primeira foto será a capa
        image_url:
          uploadedImages[0].publicUrl,

        alt_pt: altPt,
        alt_en: altEn,

        display_order: 0,
        is_visible: true,
        is_featured: false
      };

      const {
        data: createdItem,
        error: itemError
      } =
        await supabaseClient
          .from('portfolio_items')
          .insert(newItem)
          .select('id')
          .single();

      if (itemError) throw itemError;

      createdItemId = createdItem.id;

      // Salva as fotos ligadas ao trabalho
      const imageRows =
        uploadedImages.map((image, index) => ({
          portfolio_item_id: createdItemId,
          image_url: image.publicUrl,
          file_path: image.fileName,
          alt_pt: altPt,
          alt_en: altEn,
          display_order: index,
          is_cover: index === 0
        }));

      const { error: imagesError } =
        await supabaseClient
          .from('portfolio_images')
          .insert(imageRows);

      if (imagesError) throw imagesError;

      portfolioForm.reset();

      setStatus(
        portfolioStatus,
        'Trabalho adicionado com sucesso!'
      );

      await loadPortfolio();

    } catch (error) {

      console.error(error);

      // Se o registro principal foi criado,
      // remove ele e as imagens ligadas no banco.
      if (createdItemId) {
        await supabaseClient
          .from('portfolio_items')
          .delete()
          .eq('id', createdItemId);
      }

      // Remove do Storage as fotos já enviadas.
      if (uploadedImages.length > 0) {
        await supabaseClient.storage
          .from('portfolio-images')
          .remove(
            uploadedImages.map(
              image => image.fileName
            )
          );
      }

      setStatus(
        portfolioStatus,
        'Erro ao salvar o trabalho.',
        true
      );
    }
  }
););


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

    const confirmed = window.confirm(
      'Deseja realmente excluir este trabalho e todas as fotos?'
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Excluindo...';

    try {

      // Busca todas as fotos ligadas ao trabalho
      const {
        data: images,
        error: imagesError
      } =
        await supabaseClient
          .from('portfolio_images')
          .select('file_path')
          .eq('portfolio_item_id', id);

      if (imagesError) throw imagesError;

      // Remove todas as fotos do Storage
      const filePaths = (images || [])
        .map(image => image.file_path)
        .filter(Boolean);

      if (filePaths.length > 0) {

        const { error: storageError } =
          await supabaseClient.storage
            .from('portfolio-images')
            .remove(filePaths);

        if (storageError) {
          console.error(
            'Erro ao remover imagens:',
            storageError
          );
        }
      }

      // Apaga o trabalho.
      // As linhas de portfolio_images
      // são apagadas automaticamente pelo CASCADE.
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
