const translations={
pt:{
navPortfolio:"Portfólio",navProcess:"Como funciona",navContact:"Contato",quote:"Pedir orçamento ↗",
eyebrow:"Impressão 3D personalizada",heroTitle:"Ideias únicas.<br>Objetos reais.",heroLead:"Presentes, decorações, carimbos, placas e pequenos projetos feitos sob encomenda. Cada criação nasce de uma foto, uma frase, um logotipo ou simplesmente de uma ideia.",
seeWork:"Ver trabalhos",tellIdea:"Conte sua ideia",stat1a:"24 exemplos",stat1b:"Criações reais",stat2a:"Sob medida",stat2b:"Cores, nomes e detalhes",stat3a:"Contato direto",stat3b:"Da ideia à impressão",heroPhotoTitle:"Criações personalizadas",heroPhotoText:"Cada peça conta uma história.",
portfolioEyebrow:"Portfólio",portfolioTitle:"Trabalhos reais.",portfolioText:"Esta galeria utiliza fotografias reais dos trabalhos produzidos. Cada projeto pode ser adaptado em cores, tamanhos e detalhes.",
all:"Todos",gifts:"Presentes",stamps:"Carimbos",decor:"Decoração",sculptures:"Esculturas",events:"Eventos",accessories:"Acessórios",
processEyebrow:"Como funciona",processTitle:"Da ideia à criação.",processText:"Um processo simples e direto para criar um objeto personalizado sem complicações.",
step1Title:"Conte a ideia",step1Text:"Envie uma foto, desenho, frase ou referência.",step2Title:"Definimos os detalhes",step2Text:"Tamanho, cores, quantidade, acabamento, preço e prazo.",step3Title:"Produção",step3Text:"O projeto é preparado, impresso e conferido.",step4Title:"Entrega",step4Text:"Retirada ou envio conforme combinado.",
contactEyebrow:"Orçamento",contactTitle:"Tem uma ideia para criar?",contactText:"Envie uma foto ou descrição. Na versão final serão adicionados WhatsApp, e-mail, redes sociais e os dados do ateliê.",whatsapp:"Abrir WhatsApp ↗",tempName:"Nome provisório",madeBy:"Site criado por"
},
en:{
navPortfolio:"Portfolio",navProcess:"How it works",navContact:"Contact",quote:"Request a quote ↗",
eyebrow:"Custom 3D printing",heroTitle:"Unique ideas.<br>Real objects.",heroLead:"Gifts, decorations, stamps, plaques and small custom projects. Every creation starts from a photo, a phrase, a logo or simply an idea.",
seeWork:"See our work",tellIdea:"Share your idea",stat1a:"24 examples",stat1b:"Real creations",stat2a:"Made to measure",stat2b:"Colors, names and details",stat3a:"Direct contact",stat3b:"From idea to print",heroPhotoTitle:"Personalized creations",heroPhotoText:"Every piece tells a story.",
portfolioEyebrow:"Portfolio",portfolioTitle:"Real work.",portfolioText:"This gallery features real photographs of completed work. Every project can be adapted in colors, sizes and details.",
all:"All",gifts:"Gifts",stamps:"Stamps",decor:"Decoration",sculptures:"Sculptures",events:"Events",accessories:"Accessories",
processEyebrow:"How it works",processTitle:"From idea to creation.",processText:"A simple and direct process to create a personalized object without complications.",
step1Title:"Share your idea",step1Text:"Send a photo, drawing, phrase or reference.",step2Title:"We define the details",step2Text:"Size, colors, quantity, finish, price and timing.",step3Title:"Production",step3Text:"The project is prepared, printed and checked.",step4Title:"Delivery",step4Text:"Pickup or shipping as agreed.",
contactEyebrow:"Quote",contactTitle:"Have an idea to create?",contactText:"Send a photo or description. The final version will include WhatsApp, email, social media and workshop details.",whatsapp:"Open WhatsApp ↗",tempName:"Temporary name",madeBy:"Website created by"
}
};
let currentLang="pt";
function setLang(lang){
 currentLang=lang; document.documentElement.lang=lang==="pt"?"pt-BR":"en";
 document.querySelectorAll("[data-i18n]").forEach(el=>{el.innerHTML=translations[lang][el.dataset.i18n]||el.innerHTML;});
 document.querySelectorAll(".language button").forEach(b=>b.classList.toggle("active",b.dataset.lang===lang));
 document.querySelectorAll(".work-card").forEach(card=>{
   const title=lang==="pt"?card.dataset.titlePt:card.dataset.titleEn;
   card.querySelector(".card-title").textContent=title;
   card.querySelector("img").alt=title;
 });
}
document.querySelectorAll(".language button").forEach(b=>b.addEventListener("click",()=>setLang(b.dataset.lang)));
const filters=document.querySelectorAll(".filter"),cards=document.querySelectorAll(".work-card");
filters.forEach(btn=>btn.addEventListener("click",()=>{filters.forEach(b=>b.classList.remove("active"));btn.classList.add("active");const f=btn.dataset.filter;cards.forEach(c=>c.style.display=(f==="all"||c.dataset.category===f)?"block":"none");}));
const lightbox=document.getElementById("lightbox"),lbImg=lightbox.querySelector("img"),caption=lightbox.querySelector(".caption");
function openCard(card){lbImg.src=card.dataset.image;const title=currentLang==="pt"?card.dataset.titlePt:card.dataset.titleEn;lbImg.alt=title;caption.textContent=title;lightbox.classList.add("open");document.body.style.overflow="hidden";}
cards.forEach(card=>{card.addEventListener("click",()=>openCard(card));card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")openCard(card);});});
function closeBox(){lightbox.classList.remove("open");document.body.style.overflow="";}
lightbox.querySelector(".close").addEventListener("click",closeBox);lightbox.addEventListener("click",e=>{if(e.target===lightbox)closeBox();});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeBox();});

// Supabase configuration
const SUPABASE_URL = 'https://sqxermwhzvzjjjxvsiwv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_niWluhjYlUicrJCAsISBDg_DisFW1iU';
// Upload de imagem para o Supabase Storage
async function uploadPortfolioImage(file) {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;

  const { error } = await supabaseClient.storage
    .from('portfolio-images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    console.error('Erro no upload:', error);
    throw error;
  }

  const { data } = supabaseClient.storage
    .from('portfolio-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;
async function loginAdmin(email, password) {
  if (!supabaseClient) {
    throw new Error('Supabase não foi carregado.');
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Erro no login:', error);
    throw error;
  }

  return data;
}

const ADMIN_EMAIL = 'admin@radreia.com';

async function getAdminSession() {
  if (!supabaseClient) return null;

  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error('Erro ao verificar sessão:', error);
    return null;
  }

  if (!session) return null;

  if (session.user.email !== ADMIN_EMAIL) {
    await supabaseClient.auth.signOut();
    return null;
  }

  return session;
}
