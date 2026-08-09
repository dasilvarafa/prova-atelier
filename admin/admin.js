// ========================================
// ATELIER 3D - PAINEL ADMIN
// ========================================

const SUPABASE_URL = 'https://sqxermwhzvzjjjxvsiwv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_niWluhjYlUicrJCAsISBDg_DisFW1iU';

const ADMIN_EMAIL = 'admin@radreia.com';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');

const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');

const portfolioForm = document.getElementById('portfolio-form');
const portfolioStatus = document.getElementById('portfolio-status');
const portfolioList = document.getElementById('portfolio-list');

const adminUser = document.getElementById('admin-user');
const logoutBtn = document.getElementById('logout-btn');

let editingItemId = null;

const portfolioSubmitButton =
  portfolioForm.querySelector('button[type="submit"]');

const cancelEditButton = document.createElement('button');

cancelEditButton.type = 'button';
cancelEditButton.textContent = 'Cancelar edição';
cancelEditButton.style.marginLeft = '10px';
cancelEditButton.style.display = 'none';

portfolioSubmitButton.insertAdjacentElement(
  'afterend',
  cancelEditButton
);


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

function resetEditMode(clearStatus = true) {

  editingItemId = null;

  portfolioForm.reset();

  const imageInput =
    document.getElementById('portfolio-image');

  imageInput.required = true;

  portfolioSubmitButton.textContent =
    'Adicionar ao portfólio';

  cancelEditButton.style.display =
    'none';

  if (clearStatus) {
    setStatus(portfolioStatus, '');
  }
}

cancelEditButton.addEventListener(
  'click',
  () => {
    resetEditMode(true);
  }
);


// ========================================
// LOGIN
// ========================================

loginForm.addEventListener(
  'submit',
  async (event) => {

    event.preventDefault();

    const email =
      document.getElementById('email')
        .value.trim();

    const password =
      document.getElementById('password')
        .value;

    setStatus(
      loginStatus,
      'Entrando...'
    );

    try {

      const { data, error } =
        await supabaseClient.auth
          .signInWithPassword({
            email,
            password
          });

      if (error) throw error;

      if (
        !data.user ||
        data.user.email !== ADMIN_EMAIL
      ) {

        await supabaseClient.auth.signOut();

        throw new Error(
          'Usuário não autorizado.'
        );
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
  }
);


// ========================================
// LOGOUT
// ========================================

logoutBtn.addEventListener(
  'click',
  async () => {

    await supabaseClient.auth.signOut();

    resetEditMode(true);

    showLogin();
  }
);


// ========================================
// VERIFICAR SESSÃO
// ========================================

async function checkSession() {

  const {
    data: { session },
    error
  } =
    await supabaseClient.auth
      .getSession();

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
    file.name
      .split('.')
      .pop()
      .toLowerCase();

  const fileName =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

  const { error } =
    await supabaseClient.storage
      .from('portfolio-images')
      .upload(
        fileName,
        file,
        {
          contentType: file.type,
          upsert: false
        }
      );

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
// ADICIONAR / SALVAR EDIÇÃO
// ========================================

portfolioForm.addEventListener(
  'submit',
  async (event) => {

    event.preventDefault();

    const imageInput =
      document.getElementById(
        'portfolio-image'
      );

    const files =
      Array.from(imageInput.files);


    // ========================================
    // SALVAR EDIÇÃO
    // ========================================

    if (editingItemId) {

      setStatus(
        portfolioStatus,
        'Salvando alterações...'
      );

      try {

        const altPt =
          document.getElementById(
            'alt-pt'
          ).value.trim();

        const altEn =
          document.getElementById(
            'alt-en'
          ).value.trim();

        const updatedItem = {

          title_pt:
            document.getElementById(
              'title-pt'
            ).value.trim(),

          title_en:
            document.getElementById(
              'title-en'
            ).value.trim(),

          description_pt:
            document.getElementById(
              'description-pt'
            ).value.trim(),

          description_en:
            document.getElementById(
              'description-en'
            ).value.trim(),

          category:
            document.getElementById(
              'category'
            ).value,

          alt_pt: altPt,
          alt_en: altEn
        };

        const { error } =
          await supabaseClient
            .from('portfolio_items')
            .update(updatedItem)
            .eq(
              'id',
              editingItemId
            );

        if (error) throw error;


        // Atualiza também o texto
        // alternativo das fotos.
        const {
          error: imagesError
        } =
          await supabaseClient
            .from('portfolio_images')
            .update({
              alt_pt: altPt,
              alt_en: altEn
            })
            .eq(
              'portfolio_item_id',
              editingItemId
            );

        if (imagesError) {
          throw imagesError;
        }

        resetEditMode(false);

        setStatus(
          portfolioStatus,
          'Alterações salvas com sucesso!'
        );

        await loadPortfolio();

        return;

      } catch (error) {

        console.error(error);

        setStatus(
          portfolioStatus,
          'Erro ao salvar as alterações.',
          true
        );

        return;
      }
    }


    // ========================================
    // NOVO TRABALHO
    // ========================================

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

      for (const file of files) {

        const uploaded =
          await uploadImage(file);

        uploadedImages.push(
          uploaded
        );
      }

      setStatus(
        portfolioStatus,
        'Salvando trabalho...'
      );

      const altPt =
        document.getElementById(
          'alt-pt'
        ).value.trim();

      const altEn =
        document.getElementById(
          'alt-en'
        ).value.trim();

      const newItem = {

        title_pt:
          document.getElementById(
            'title-pt'
          ).value.trim(),

        title_en:
          document.getElementById(
            'title-en'
          ).value.trim(),

        description_pt:
          document.getElementById(
            'description-pt'
          ).value.trim(),

        description_en:
          document.getElementById(
            'description-en'
          ).value.trim(),

        category:
          document.getElementById(
            'category'
          ).value,

        // Primeira foto = capa
        image_url:
          uploadedImages[0]
            .publicUrl,

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

      if (itemError) {
        throw itemError;
      }

      createdItemId =
        createdItem.id;


      // Salva todas as fotos
      // ligadas ao trabalho.

      const imageRows =
        uploadedImages.map(
          (image, index) => ({

            portfolio_item_id:
              createdItemId,

            image_url:
              image.publicUrl,

            file_path:
              image.fileName,

            alt_pt:
              altPt,

            alt_en:
              altEn,

            display_order:
              index,

            is_cover:
              index === 0
          })
        );

      const {
        error: imagesError
      } =
        await supabaseClient
          .from('portfolio_images')
          .insert(imageRows);

      if (imagesError) {
        throw imagesError;
      }

      portfolioForm.reset();

      imageInput.required = true;

      setStatus(
        portfolioStatus,
        'Trabalho adicionado com sucesso!'
      );

      await loadPortfolio();

    } catch (error) {

      console.error(error);


      // Remove registro principal
      // caso algo falhe.

      if (createdItemId) {

        await supabaseClient
          .from('portfolio_items')
          .delete()
          .eq(
            'id',
            createdItemId
          );
      }


      // Remove imagens que já
      // foram enviadas ao Storage.

      if (
        uploadedImages.length > 0
      ) {

        await supabaseClient.storage
          .from('portfolio-images')
          .remove(
            uploadedImages.map(
              image =>
                image.fileName
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
);


// ========================================
// LISTAR TRABALHOS
// ========================================

async function loadPortfolio() {

  portfolioList.innerHTML =
    'Carregando...';

  const { data, error } =
    await supabaseClient
      .from('portfolio_items')
      .select(
        'id,title_pt,title_en,category,image_url,created_at'
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );

  if (error) {

    console.error(error);

    portfolioList.innerHTML =
      'Erro ao carregar os trabalhos.';

    return;
  }

  if (
    !data ||
    data.length === 0
  ) {

    portfolioList.innerHTML =
      '<p>Nenhum trabalho cadastrado ainda.</p>';

    return;
  }

  portfolioList.innerHTML =
    data.map(item => {

      const title =
        escapeHtml(
          item.title_pt ||
          'Sem título'
        );

      const category =
        escapeHtml(
          item.category ||
          ''
        );

      const image =
        item.image_url
          ? `
            <img
              src="${escapeAttribute(
                item.image_url
              )}"
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

          <strong>
            ${title}
          </strong>

          <div
            style="margin-top:6px;"
          >
            Categoria:
            ${category}
          </div>

          ${image}

          <br>

          <button
            type="button"
            class="edit-item"
            data-id="${item.id}"
            style="margin-right:10px;"
          >
            Editar
          </button>

          <button
            type="button"
            class="danger delete-item"
            data-id="${item.id}"
          >
            Excluir
          </button>

        </div>
      `;

    }).join('');
}


// ========================================
// EDITAR TRABALHO
// ========================================

portfolioList.addEventListener(
  'click',
  async (event) => {

    const button =
      event.target.closest(
        '.edit-item'
      );

    if (!button) return;

    const id =
      button.dataset.id;

    try {

      const {
        data: item,
        error
      } =
        await supabaseClient
          .from('portfolio_items')
          .select(`
            id,
            title_pt,
            title_en,
            description_pt,
            description_en,
            category,
            alt_pt,
            alt_en
          `)
          .eq(
            'id',
            id
          )
          .single();

      if (error) {
        throw error;
      }

      editingItemId =
        item.id;

      const imageInput =
        document.getElementById(
          'portfolio-image'
        );

      // Durante edição,
      // não exige nova foto.
      imageInput.value = '';
      imageInput.required = false;


      document.getElementById(
        'title-pt'
      ).value =
        item.title_pt || '';

      document.getElementById(
        'title-en'
      ).value =
        item.title_en || '';

      document.getElementById(
        'description-pt'
      ).value =
        item.description_pt || '';

      document.getElementById(
        'description-en'
      ).value =
        item.description_en || '';

      document.getElementById(
        'category'
      ).value =
        item.category || '';

      document.getElementById(
        'alt-pt'
      ).value =
        item.alt_pt || '';

      document.getElementById(
        'alt-en'
      ).value =
        item.alt_en || '';


      portfolioSubmitButton
        .textContent =
          'Salvar alterações';

      cancelEditButton
        .style.display =
          'inline-block';


      setStatus(
        portfolioStatus,
        'Editando trabalho.'
      );


      portfolioForm.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

    } catch (error) {

      console.error(error);

      alert(
        'Não foi possível carregar este trabalho para edição.'
      );
    }
  }
);


// ========================================
// EXCLUIR TRABALHO
// ========================================

portfolioList.addEventListener(
  'click',
  async (event) => {

    const button =
      event.target.closest(
        '.delete-item'
      );

    if (!button) return;

    const id =
      button.dataset.id;

    const confirmed =
      window.confirm(
        'Deseja realmente excluir este trabalho e todas as fotos?'
      );

    if (!confirmed) return;

    button.disabled = true;

    button.textContent =
      'Excluindo...';

    try {

      // Busca todas as fotos
      // ligadas ao trabalho.

      const {
        data: images,
        error: imagesError
      } =
        await supabaseClient
          .from('portfolio_images')
          .select('file_path')
          .eq(
            'portfolio_item_id',
            id
          );

      if (imagesError) {
        throw imagesError;
      }


      // Remove as fotos
      // do Storage.

      const filePaths =
        (images || [])
          .map(
            image =>
              image.file_path
          )
          .filter(Boolean);

      if (
        filePaths.length > 0
      ) {

        const {
          error: storageError
        } =
          await supabaseClient
            .storage
            .from(
              'portfolio-images'
            )
            .remove(
              filePaths
            );

        if (storageError) {

          console.error(
            'Erro ao remover imagens:',
            storageError
          );
        }
      }


      // Remove o trabalho.
      // portfolio_images é removido
      // automaticamente pelo CASCADE.

      const { error } =
        await supabaseClient
          .from('portfolio_items')
          .delete()
          .eq(
            'id',
            id
          );

      if (error) {
        throw error;
      }


      if (
        String(editingItemId) ===
        String(id)
      ) {

        resetEditMode(true);
      }


      await loadPortfolio();

    } catch (error) {

      console.error(error);

      alert(
        'Não foi possível excluir o trabalho.'
      );

      button.disabled = false;

      button.textContent =
        'Excluir';
    }
  }
);


// ========================================
// SEGURANÇA DE TEXTO
// ========================================

function escapeHtml(value) {

  return String(value)
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    );
}

function escapeAttribute(value) {
  return escapeHtml(value);
}


// ========================================
// INICIAR PAINEL
// ========================================

checkSession();
