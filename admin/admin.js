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

const currentImagesSection =
  document.getElementById('current-images-section');

const currentImages =
  document.getElementById('current-images');

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
      
const newUploadedImages = [];

      const {
  data: existingImages,
  error: existingImagesError
} =
  await supabaseClient
    .from('portfolio_images')
    .select(`
      id,
      display_order
    `)
    .eq(
      'portfolio_item_id',
      editingItemId
    );

if (existingImagesError) {
  throw existingImagesError;
}

const currentImageCount =
  existingImages?.length || 0;

if (
  currentImageCount +
  files.length >
  5
) {

  setStatus(
    portfolioStatus,
    `Este trabalho já possui ${currentImageCount} foto(s). O máximo permitido é 5.`,
    true
  );

  return;
}
      
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

// ========================================
// ADICIONAR NOVAS FOTOS NA EDIÇÃO
// ========================================

if (files.length > 0) {

  setStatus(
    portfolioStatus,
    'Enviando novas fotos...'
  );

  for (const file of files) {

    const uploaded =
      await uploadImage(file);

    newUploadedImages.push(uploaded);
  }

  const highestOrder =
    existingImages.length > 0
      ? Math.max(
          ...existingImages.map(
            image =>
              image.display_order || 0
          )
        )
      : -1;

  const newImageRows =
    newUploadedImages.map(
      (image, index) => ({

        portfolio_item_id:
          editingItemId,

        image_url:
          image.publicUrl,

        file_path:
          image.fileName,

        alt_pt:
          altPt,

        alt_en:
          altEn,

        display_order:
          highestOrder + index + 1,

        is_cover: false
      })
    );

  const {
    error: newImagesError
  } =
    await supabaseClient
      .from('portfolio_images')
      .insert(newImageRows);

  if (newImagesError) {
    throw newImagesError;
  }
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

      const {
  data: itemImages,
  error: itemImagesError
} =
  await supabaseClient
    .from('portfolio_images')
    .select(`
      id,
      image_url,
      file_path,
      display_order,
      is_cover
    `)
    .eq(
      'portfolio_item_id',
      editingItemId
    )
    .order(
      'display_order',
      {
        ascending: true
      }
    );

if (itemImagesError) {
  throw itemImagesError;
}

if (
  itemImages &&
  itemImages.length > 0
) {

  currentImagesSection
    .classList.remove('hidden');

  currentImages.innerHTML =
    itemImages.map(image => `
      <div
        style="
          width:130px;
          border:1px solid #333;
          border-radius:10px;
          padding:8px;
        "
      >
        <img
          src="${escapeAttribute(
            image.image_url
          )}"
          alt=""
          style="
            width:100%;
            height:100px;
            object-fit:cover;
            border-radius:8px;
          "
        >

        <div
          style="
            margin-top:6px;
            font-size:12px;
          "
        >
         ${
  image.is_cover
    ? `
      <button
        type="button"
        disabled
        style="
          margin-top:6px;
          width:100%;
        "
      >
        ⭐ Capa
      </button>
    `
    : `
      <button
        type="button"
        class="set-cover-image"
        data-image-id="${image.id}"
        data-image-url="${escapeAttribute(image.image_url)}"
        style="
          margin-top:6px;
          width:100%;
        "
      >
        Definir como capa
      </button>
    `
}

<button
  type="button"
  class="delete-portfolio-image"
  data-image-id="${image.id}"
  data-file-path="${escapeAttribute(image.file_path || '')}"
  data-is-cover="${image.is_cover}"
  style="
    margin-top:6px;
    width:100%;
    color:#ff7b7b;
  "
>
  Excluir foto
</button>

        </div>
      </div>
    `).join('');

} else {

  currentImagesSection
    .classList.add('hidden');

  currentImages.innerHTML = '';
}

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
// DEFINIR FOTO COMO CAPA
// ========================================

currentImages.addEventListener(
  'click',
  async (event) => {

    const button =
      event.target.closest('.set-cover-image');

    if (!button || !editingItemId) return;

    const imageId =
      button.dataset.imageId;

    const imageUrl =
      button.dataset.imageUrl;

    try {

      button.disabled = true;
      button.textContent = 'Alterando...';


      // Busca as fotos atuais do trabalho
      const {
        data: images,
        error: imagesError
      } =
        await supabaseClient
          .from('portfolio_images')
          .select(`
            id,
            display_order,
            is_cover
          `)
          .eq(
            'portfolio_item_id',
            editingItemId
          );

      if (imagesError) {
        throw imagesError;
      }


      const selectedImage =
        images.find(
          image =>
            String(image.id) ===
            String(imageId)
        );

      const oldCover =
        images.find(
          image => image.is_cover
        );

      if (!selectedImage) {
        throw new Error(
          'Imagem não encontrada.'
        );
      }


      const selectedOldOrder =
        selectedImage.display_order;


      // Nova foto vira capa e vai
      // para a primeira posição
      const {
        error: newCoverError
      } =
        await supabaseClient
          .from('portfolio_images')
          .update({
            is_cover: true,
            display_order: 0
          })
          .eq(
            'id',
            imageId
          );

      if (newCoverError) {
        throw newCoverError;
      }


      // A capa anterior deixa de ser capa
      // e assume a posição da foto escolhida
      if (
        oldCover &&
        String(oldCover.id) !==
        String(imageId)
      ) {

        const {
          error: oldCoverError
        } =
          await supabaseClient
            .from('portfolio_images')
            .update({
              is_cover: false,
              display_order:
                selectedOldOrder
            })
            .eq(
              'id',
              oldCover.id
            );

        if (oldCoverError) {
          throw oldCoverError;
        }
      }


      // Atualiza também a foto principal
      // usada no card do site
      const {
        error: itemError
      } =
        await supabaseClient
          .from('portfolio_items')
          .update({
            image_url: imageUrl
          })
          .eq(
            'id',
            editingItemId
          );

      if (itemError) {
        throw itemError;
      }


      setStatus(
        portfolioStatus,
        'Capa alterada com sucesso!'
      );

      // Recarrega o painel
      await loadPortfolio();

      // Clica novamente em Editar
      // para atualizar as miniaturas
      const editButton =
        portfolioList.querySelector(
          `.edit-item[data-id="${editingItemId}"]`
        );

      if (editButton) {
        editButton.click();
      }

    } catch (error) {

      console.error(error);

      setStatus(
        portfolioStatus,
        'Erro ao alterar a capa.',
        true
      );

      button.disabled = false;
      button.textContent =
        'Definir como capa';
    }
  }
);

// ========================================
// EXCLUIR FOTO INDIVIDUAL
// ========================================

currentImages.addEventListener(
  'click',
  async (event) => {

    const button =
      event.target.closest(
        '.delete-portfolio-image'
      );

    if (!button || !editingItemId) return;

    const imageId =
      button.dataset.imageId;

    const filePath =
      button.dataset.filePath;

    const isCover =
      button.dataset.isCover === 'true';

    try {

      const {
        data: images,
        error: imagesError
      } =
        await supabaseClient
          .from('portfolio_images')
          .select(`
            id,
            image_url,
            file_path,
            display_order,
            is_cover
          `)
          .eq(
            'portfolio_item_id',
            editingItemId
          )
          .order(
            'display_order',
            { ascending: true }
          );

      if (imagesError) {
        throw imagesError;
      }

      // Nunca deixa o trabalho sem foto
      if (!images || images.length <= 1) {

        alert(
          'O trabalho precisa ter pelo menos uma foto.'
        );

        return;
      }

      const confirmed =
        window.confirm(
          'Deseja realmente excluir esta foto?'
        );

      if (!confirmed) return;

      button.disabled = true;
      button.textContent = 'Excluindo...';


      // Se estiver excluindo a capa,
      // outra foto assume automaticamente.
      if (isCover) {

        const newCover =
          images.find(
            image =>
              String(image.id) !==
              String(imageId)
          );

        if (!newCover) {
          throw new Error(
            'Não foi possível definir uma nova capa.'
          );
        }

        const {
          error: coverError
        } =
          await supabaseClient
            .from('portfolio_images')
            .update({
              is_cover: true,
              display_order: 0
            })
            .eq(
              'id',
              newCover.id
            );

        if (coverError) {
          throw coverError;
        }

        const {
          error: itemError
        } =
          await supabaseClient
            .from('portfolio_items')
            .update({
              image_url:
                newCover.image_url
            })
            .eq(
              'id',
              editingItemId
            );

        if (itemError) {
          throw itemError;
        }
      }


      // Remove registro da foto
      const {
        error: deleteError
      } =
        await supabaseClient
          .from('portfolio_images')
          .delete()
          .eq(
            'id',
            imageId
          );

      if (deleteError) {
        throw deleteError;
      }


      // Remove arquivo físico
      // do Storage
      if (filePath) {

        const {
          error: storageError
        } =
          await supabaseClient.storage
            .from('portfolio-images')
            .remove([filePath]);

        if (storageError) {
          console.error(
            'Erro ao remover arquivo:',
            storageError
          );
        }
      }


      setStatus(
        portfolioStatus,
        'Foto excluída com sucesso!'
      );


      await loadPortfolio();

      // Atualiza novamente a área
      // de edição e as miniaturas
      const editButton =
        portfolioList.querySelector(
          `.edit-item[data-id="${editingItemId}"]`
        );

      if (editButton) {
        editButton.click();
      }

    } catch (error) {

      console.error(error);

      setStatus(
        portfolioStatus,
        'Erro ao excluir a foto.',
        true
      );

      button.disabled = false;
      button.textContent =
        'Excluir foto';
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
