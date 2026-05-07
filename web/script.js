import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: 'AIzaSyAHO9XOzAdSZ9KWIP9ss2v6aUaSFyLAGtU',
  authDomain: 'walidify.firebaseapp.com',
  projectId: 'walidify',
  storageBucket: 'walidify.firebasestorage.app',
  messagingSenderId: '277638219996',
  appId: '1:277638219996:web:661f2d7c105df26d38cc19'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- GLOBALS ----------
let currentLang = "EN";
let cart = [];
let selectedProduct = null;
let productsList = [];

// ---------- Helper: Normalize Algerian phone for WhatsApp ----------
function normalizeWhatsAppNumber(phone) {
  let cleaned = phone.replace(/\s+/g, '').replace(/^0/, '');
  if (!cleaned.startsWith('213')) cleaned = '213' + cleaned;
  return cleaned;
}

// ---------- Toast Notification ----------
function showToast(msg, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast-message bg-gray-800 border border-primary text-white px-4 py-2 rounded-xl shadow-lg text-sm mb-2`;
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------- Fetch products from Firestore ----------
async function fetchProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    productsList = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      productsList.push({
        id: doc.id,
        title: data.title,
        titleAr: data.titleAr,
        titleFr: data.titleFr,
        description: data.description,
        descriptionAr: data.descriptionAr,
        descriptionFr: data.descriptionFr,
        price: data.price,
        oldPrice: data.oldPrice,
        discount: data.discount,
        image: data.image,
        previews: data.previews || [],
        category: data.category
      });
    });
    renderProducts();
  } catch (err) {
    console.error("Error fetching products:", err);
    showToast("Failed to load products. Check connection.", "error");
  }
}

// ---------- Render product cards ----------
function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML = "";
  productsList.forEach(p => {
    let title = p.title;
    if (currentLang === "AR") title = p.titleAr || p.title;
    if (currentLang === "FR") title = p.titleFr || p.title;

    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.category = p.category || "ai";
    card.innerHTML = `
      <img src="${p.image || 'https://placehold.co/300x400?text=No+Image'}" alt="${escapeHtml(title)}" loading="lazy">
      <div class="card-content">
        <h3 class="font-bold text-md truncate">${escapeHtml(title)}</h3>
        <div class="flex justify-between items-center mt-2">
          <span class="text-primary font-bold">$${p.price}</span>
          <button class="view-btn bg-primary/80 hover:bg-primary text-white px-3 py-1 rounded-lg text-sm transition" data-id="${p.id}">View</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
  attachViewEvents();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function attachViewEvents() {
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => openProductModal(btn.dataset.id));
  });
}

// ---------- Product Modal ----------
function openProductModal(productId) {
  selectedProduct = productsList.find(p => p.id === productId);
  if (!selectedProduct) return;

  let title = selectedProduct.title;
  let desc = selectedProduct.description;
  if (currentLang === "AR") {
    title = selectedProduct.titleAr || selectedProduct.title;
    desc = selectedProduct.descriptionAr || selectedProduct.description;
  } else if (currentLang === "FR") {
    title = selectedProduct.titleFr || selectedProduct.title;
    desc = selectedProduct.descriptionFr || selectedProduct.description;
  }

  document.getElementById("modalProductImage").src = selectedProduct.image || '';
  document.getElementById("modalProductTitle").innerText = title;
  document.getElementById("modalProductDesc").innerText = desc;
  openModal("productModal");
}

// ---------- Cart Logic ----------
function addToCart(product, quantity = 1) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ id: product.id, title: product.title, price: product.price, quantity, image: product.image });
  }
  updateCartUI();
  showToast(`${product.title} added to cart (x${quantity})`);
}

function updateCartUI() {
  const badge = document.getElementById("cartBadge");
  if (badge) badge.innerText = cart.reduce((s, i) => s + i.quantity, 0);

  const cartContainer = document.getElementById("cartItemsList");
  const totalSpan = document.getElementById("cartTotal");
  let total = 0;

  if (cartContainer) {
    if (cart.length === 0) {
      cartContainer.innerHTML = `<div class="text-center py-4 text-gray-400">${getTranslation("cartEmpty")}</div>`;
    } else {
      cartContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        let displayTitle = item.title;
        const original = productsList.find(p => p.id === item.id);
        if (original) {
          if (currentLang === "AR") displayTitle = original.titleAr || original.title;
          else if (currentLang === "FR") displayTitle = original.titleFr || original.title;
        }
        return `
          <div class="flex items-center gap-3 border-b border-gray-700 pb-3">
            <img src="${item.image}" class="cart-item-img w-12 h-auto rounded object-cover" style="aspect-ratio:9/16" alt="">
            <div class="flex-1">
              <div class="font-semibold">${escapeHtml(displayTitle)}</div>
              <div class="text-sm text-gray-300">$${item.price} each</div>
            </div>
            <div class="flex items-center gap-2">
              <button class="qty-dec bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded" data-id="${item.id}">-</button>
              <span class="w-8 text-center">${item.quantity}</span>
              <button class="qty-inc bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded" data-id="${item.id}">+</button>
            </div>
            <div class="w-20 text-right font-bold">$${itemTotal.toFixed(2)}</div>
            <button class="remove-item text-red-400 hover:text-red-300" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
          </div>
        `;
      }).join('');

      if (totalSpan) totalSpan.innerText = `$${total.toFixed(2)}`;

      // Delegate events
      document.querySelectorAll('.qty-dec').forEach(btn => btn.onclick = () => updateQuantity(btn.dataset.id, -1));
      document.querySelectorAll('.qty-inc').forEach(btn => btn.onclick = () => updateQuantity(btn.dataset.id, 1));
      document.querySelectorAll('.remove-item').forEach(btn => btn.onclick = () => removeFromCart(btn.dataset.id));
    }
  }
}

function updateQuantity(id, delta) {
  const index = cart.findIndex(i => i.id === id);
  if (index !== -1) {
    const newQty = cart[index].quantity + delta;
    if (newQty <= 0) cart.splice(index, 1);
    else cart[index].quantity = newQty;
    updateCartUI();
  }
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  updateCartUI();
}

// ---------- Wilayas ----------
const wilayasList = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar", "Blida", "Bouira",
  "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda",
  "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara",
  "Ouargla", "Oran", "El Bayadh", "Illizi", "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt",
  "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent", "Ghardaïa",
  "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal", "Béni Abbès", "In Salah", "In Guezzam", "Touggourt",
  "Djanet", "El M'Ghair", "El Menia"
];
function populateWilayas() {
  const select = document.getElementById("wilaya");
  if (!select) return;
  select.innerHTML = '<option value="">Select Wilaya</option>';
  wilayasList.forEach(w => {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = w;
    select.appendChild(opt);
  });
}

// ---------- Telegram Order ----------
const TELEGRAM_TOKEN = "7844729808:AAHo63qnseNesZNtprvMm3d1R51yyrqAEvI";
const TELEGRAM_CHAT_ID = "7773047224";

async function sendOrderToTelegram(orderData) {
  const { fullName, phoneWhatsapp, email, discountCode, wilaya, municipality, cartItems, total } = orderData;
  const whatsappNumber = normalizeWhatsAppNumber(phoneWhatsapp);
  const whatsappLink = `https://wa.me/${whatsappNumber}`;

  let itemsText = cartItems.map(item => {
    let title = item.title;
    const orig = productsList.find(p => p.id === item.id);
    if (orig) {
      if (currentLang === "AR") title = orig.titleAr || orig.title;
      else if (currentLang === "FR") title = orig.titleFr || orig.title;
    }
    return `${title} x${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`;
  }).join('\n');

  const message = `🛍️ *NEW ORDER FROM WALIDIFY* 🛍️\n\n👤 *Customer:* ${fullName}\n📞 *Phone/WhatsApp:* ${phoneWhatsapp}\n📧 *Email:* ${email || "Not provided"}\n🏷️ *Discount Code:* ${discountCode || "None"}\n📍 *Wilaya:* ${wilaya}\n🏠 *Municipality:* ${municipality}\n\n📦 *Products:*\n${itemsText}\n\n💰 *Total Amount:* $${total.toFixed(2)}\n\n[Click to chat on WhatsApp](${whatsappLink})`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown", disable_web_page_preview: false })
    });
    if (response.ok) {
      showToast(getTranslation("orderSent"));
      return true;
    }
    showToast(getTranslation("orderFailed"), "error");
    return false;
  } catch (err) {
    console.error(err);
    showToast(getTranslation("networkError"), "error");
    return false;
  }
}

// ---------- Save Order to Firestore ----------
async function saveOrderToFirestore(orderData) {
  try {
    await addDoc(collection(db, "orders"), {
      ...orderData,
      createdAt: Timestamp.now(),
      status: "pending"
    });
  } catch (err) {
    console.error("Failed to save order to Firestore:", err);
  }
}

// ---------- Checkout Form Handler ----------
document.getElementById("orderForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fullName = document.getElementById("fullName").value.trim();
  const phoneWhatsapp = document.getElementById("phoneWhatsapp").value.trim();
  const email = document.getElementById("email").value.trim();
  const discountCode = document.getElementById("discountCode").value.trim();
  const wilaya = document.getElementById("wilaya").value;
  const municipality = document.getElementById("municipality").value.trim();

  if (!fullName || !phoneWhatsapp || !wilaya || !municipality) {
    showToast(getTranslation("fillRequired"), "error");
    return;
  }
  if (cart.length === 0) {
    showToast(getTranslation("cartEmptyCheckout"), "error");
    closeModal("checkoutModal");
    return;
  }

  const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const orderData = {
    fullName, phoneWhatsapp, email, discountCode, wilaya, municipality,
    cartItems: cart.map(item => ({ id: item.id, title: item.title, price: item.price, quantity: item.quantity })),
    total
  };

  const telegramOk = await sendOrderToTelegram(orderData);
  if (telegramOk) {
    await saveOrderToFirestore(orderData);
    cart = [];
    updateCartUI();
    closeModal("checkoutModal");
  }
});

// ---------- I18N Translations ----------
const translations = {
  EN: { heroTitle: "Digital Products. <br>Made for Creators.", heroDesc: "AI Prompts • Premium PDF Books • Instant Delivery", featuredTitle: "Featured Products", freeTitle: "50 ChatGPT Prompts Pack", freeDesc: "Instant creativity boost for writers & entrepreneurs.", allBtn: "All", aiBtn: "AI Prompts", pdfBtn: "PDF Books", cartEmpty: "Your cart is empty.", cartEmptyToast: "Your cart is empty. Add items first.", cartTitle: "Your Cart", cartTotalLabel: "Total:", continueShopping: "Continue Shopping", checkoutNow: "Checkout Now", checkoutTitle: "Order Details (Algeria)", fillRequired: "Please fill all required fields.", orderSent: "✅ Order sent successfully! We'll contact you soon.", orderFailed: "❌ Failed to send order. Please try again.", networkError: "❌ Network error. Check your connection.", cartEmptyCheckout: "Your cart is empty.", login: "Login", signup: "Sign Up", addToCart: "Add to Cart", orderNow: "Order Now" },
  AR: { heroTitle: "منتجات رقمية. <br>مصممة للمبدعين.", heroDesc: "نصوص AI • كتب PDF متميزة • تسليم فوري", featuredTitle: "المنتجات المميزة", freeTitle: "حزمة 50 نصًا لـ ChatGPT", freeDesc: "تعزيز فوري للإبداع للكتّاب ورواد الأعمال.", allBtn: "الكل", aiBtn: "نصوص AI", pdfBtn: "كتب PDF", cartEmpty: "سلتك فارغة.", cartEmptyToast: "سلتك فارغة. أضف منتجات أولاً.", cartTitle: "سلتك", cartTotalLabel: "الإجمالي:", continueShopping: "مواصلة التسوق", checkoutNow: "إتمام الشراء", checkoutTitle: "بيانات الطلب (الجزائر)", fillRequired: "يرجى ملء جميع الحقول المطلوبة.", orderSent: "✅ تم إرسال الطلب بنجاح! سنتواصل معك قريباً.", orderFailed: "❌ فشل إرسال الطلب. حاول مرة أخرى.", networkError: "❌ خطأ في الشبكة. تحقق من اتصالك.", cartEmptyCheckout: "سلتك فارغة.", login: "تسجيل الدخول", signup: "إنشاء حساب", addToCart: "أضف للسلة", orderNow: "اطلب الآن" },
  FR: { heroTitle: "Produits numériques. <br>Conçus pour les créateurs.", heroDesc: "Prompts IA • Livres PDF premium • Livraison instantanée", featuredTitle: "Produits en vedette", freeTitle: "Pack de 50 prompts ChatGPT", freeDesc: "Boost instantané de créativité pour rédacteurs et entrepreneurs.", allBtn: "Tous", aiBtn: "Prompts IA", pdfBtn: "Livres PDF", cartEmpty: "Votre panier est vide.", cartEmptyToast: "Votre panier est vide. Ajoutez des articles d'abord.", cartTitle: "Votre panier", cartTotalLabel: "Total:", continueShopping: "Continuer les achats", checkoutNow: "Valider la commande", checkoutTitle: "Détails de la commande (Algérie)", fillRequired: "Veuillez remplir tous les champs obligatoires.", orderSent: "✅ Commande envoyée avec succès ! Nous vous contacterons bientôt.", orderFailed: "❌ Échec de l'envoi. Réessayez.", networkError: "❌ Erreur réseau. Vérifiez votre connexion.", cartEmptyCheckout: "Votre panier est vide.", login: "Connexion", signup: "S'inscrire", addToCart: "Ajouter au panier", orderNow: "Commander" }
};

function getTranslation(key) {
  return translations[currentLang][key] || translations["EN"][key];
}

function applyLanguage(lang) {
  currentLang = lang;
  const html = document.documentElement;
  html.setAttribute("dir", lang === "AR" ? "rtl" : "ltr");
  document.getElementById("langToggle").innerHTML = `🌐 ${lang}`;
  const t = translations[lang];
  if (t) {
    document.getElementById("heroTitle").innerHTML = t.heroTitle;
    document.getElementById("heroDesc").innerText = t.heroDesc;
    document.getElementById("featuredTitle").innerText = t.featuredTitle;
    document.getElementById("freeTitle").innerText = t.freeTitle;
    document.getElementById("freeDesc").innerText = t.freeDesc;
    const filterBtns = document.querySelectorAll(".filter-btn");
    if (filterBtns.length >= 3) {
      filterBtns[0].innerText = t.allBtn;
      filterBtns[1].innerText = t.aiBtn;
      filterBtns[2].innerText = t.pdfBtn;
    }
    document.getElementById("cartTitle").innerText = t.cartTitle;
    document.getElementById("cartTotalLabel").innerText = t.cartTotalLabel;
    document.getElementById("continueShoppingBtn").innerText = t.continueShopping;
    document.getElementById("checkoutNowBtn").innerText = t.checkoutNow;
    document.getElementById("checkoutTitle").innerText = t.checkoutTitle;
    document.getElementById("submitOrderBtn").innerText = t.checkoutNow;
  }
  renderProducts();
  updateCartUI();
}

// ---------- Modal Controls ----------
window.openModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add("active"); document.body.classList.add("modal-open"); }
};
window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove("active"); document.body.classList.remove("modal-open"); }
};
window.switchToSignup = function() { closeModal("loginModal"); openModal("signupModal"); };
window.switchToLogin = function() { closeModal("signupModal"); openModal("loginModal"); };
window.onclick = (e) => { if (e.target.classList && e.target.classList.contains("modal")) closeModal(e.target.id); };

// ---------- Product Modal Buttons ----------
document.getElementById("modalAddToCart")?.addEventListener("click", () => { if (selectedProduct) { addToCart(selectedProduct, 1); closeModal("productModal"); } });
document.getElementById("modalOrderNow")?.addEventListener("click", () => { if (selectedProduct) { const exists = cart.find(i => i.id === selectedProduct.id); if (!exists) addToCart(selectedProduct, 1); else updateQuantity(selectedProduct.id, 1); closeModal("productModal"); openModal("checkoutModal"); } });
document.getElementById("previewBtn")?.addEventListener("click", () => { alert("📄 Preview: First pages would be shown here (demo)."); });

// ---------- Filters ----------
function initFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("bg-primary", "text-white"));
      btn.classList.add("bg-primary", "text-white");
      const filter = btn.dataset.filter;
      document.querySelectorAll(".product-card").forEach(card => {
        card.style.display = (filter === "all" || card.dataset.category === filter) ? "flex" : "none";
      });
    });
  });
}

// ---------- Cart Modal Buttons ----------
document.getElementById("continueShoppingBtn")?.addEventListener("click", () => closeModal("cartModal"));
document.getElementById("checkoutNowBtn")?.addEventListener("click", () => { if (cart.length === 0) { showToast(getTranslation("cartEmptyToast"), "error"); return; } closeModal("cartModal"); openModal("checkoutModal"); });

// ---------- Initialization ----------
document.getElementById("langToggle")?.addEventListener("click", () => applyLanguage({ EN: "AR", AR: "FR", FR: "EN" }[currentLang]));
document.getElementById("cartBtn")?.addEventListener("click", () => openModal("cartModal"));
populateWilayas();
applyLanguage("EN");
initFilters();
fetchProducts();
updateCartUI();