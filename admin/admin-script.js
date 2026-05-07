import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const CLOUD_NAME = "dhlust6os";
const UPLOAD_PRESET = "walidify";
let currentMainImage = "";
let currentPreviewImages = [];
let cachedOrders = []; // Cache to reduce Firestore reads

// ---------- Admin Authentication ----------
const ADMIN_PASSWORD = "admin2025";
const passwordModal = document.getElementById("passwordModal");
const adminPanel = document.getElementById("adminPanel");
const verifyBtn = document.getElementById("verifyBtn");
const passwordInput = document.getElementById("adminPassword");
const logoutBtn = document.getElementById("logoutBtn");

verifyBtn.onclick = () => {
  if (passwordInput.value === ADMIN_PASSWORD) {
    passwordModal.style.display = "none";
    adminPanel.classList.remove("hidden");
    loadAllData();
  } else {
    alert("Incorrect password");
    passwordInput.value = "";
  }
};
logoutBtn.onclick = () => {
  adminPanel.classList.add("hidden");
  passwordModal.style.display = "flex";
  passwordInput.value = "";
};

// ---------- Toast ----------
function showToast(msg, type = "success") { alert(msg); }

// ---------- Cloudinary Upload ----------
async function uploadToCloudinary(file, isMulti = false) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await response.json();
    if (data.secure_url) {
      if (isMulti) {
        currentPreviewImages.push(data.secure_url);
        document.getElementById("previewUrls").value = JSON.stringify(currentPreviewImages);
        renderMultiPreviews();
      } else {
        currentMainImage = data.secure_url;
        document.getElementById("mainImageUrl").value = currentMainImage;
        document.getElementById("mainPreview").innerHTML = `<img src="${currentMainImage}" class="w-20 h-28 object-cover rounded">`;
      }
      showToast("Image uploaded successfully");
      return data.secure_url;
    }
    throw new Error("Upload failed");
  } catch (err) {
    console.error(err);
    showToast("Upload failed", "error");
    return null;
  }
}

document.getElementById("uploadMainBtn").onclick = () => {
  const input = document.createElement("input");
  input.type = "file"; input.accept = "image/*";
  input.onchange = (e) => { if (e.target.files[0]) uploadToCloudinary(e.target.files[0], false); };
  input.click();
};
document.getElementById("uploadMultiBtn").onclick = () => {
  const input = document.createElement("input");
  input.type = "file"; input.multiple = true; input.accept = "image/*";
  input.onchange = (e) => { Array.from(e.target.files).forEach(file => uploadToCloudinary(file, true)); };
  input.click();
};
function renderMultiPreviews() {
  document.getElementById("multiPreview").innerHTML = currentPreviewImages.map(url => `<img src="${url}" class="w-16 h-24 object-cover rounded">`).join("");
}

// ---------- Discount Calculation ----------
function updateDiscount() {
  const current = parseFloat(document.getElementById("currentPrice").value) || 0;
  const oldPrice = parseFloat(document.getElementById("oldPrice").value) || 0;
  let discount = 0;
  if (oldPrice > current && oldPrice > 0) discount = Math.round(((oldPrice - current) / oldPrice) * 100);
  document.getElementById("discountPercent").value = discount;
}
document.getElementById("currentPrice").addEventListener("input", updateDiscount);
document.getElementById("oldPrice").addEventListener("input", updateDiscount);

// ---------- Save Product ----------
document.getElementById("saveProductBtn").onclick = async () => {
  const title = document.getElementById("titleEn").value.trim();
  const titleAr = document.getElementById("titleAr").value.trim();
  const titleFr = document.getElementById("titleFr").value.trim();
  const description = document.getElementById("descEn").value.trim();
  const descriptionAr = document.getElementById("descAr").value.trim();
  const descriptionFr = document.getElementById("descFr").value.trim();
  const price = parseFloat(document.getElementById("currentPrice").value);
  const oldPrice = parseFloat(document.getElementById("oldPrice").value) || null;
  const discount = parseInt(document.getElementById("discountPercent").value) || 0;
  const category = document.getElementById("category").value;

  if (!title || !price || !currentMainImage) {
    showToast("Please fill title, price and upload a main image", "error");
    return;
  }

  try {
    await addDoc(collection(db, "products"), {
      title, titleAr, titleFr, description, descriptionAr, descriptionFr,
      price, oldPrice, discount, category, image: currentMainImage, previews: currentPreviewImages, createdAt: Timestamp.now()
    });
    showToast("Product added successfully");
    clearProductForm();
    loadProducts();
    loadStats();
  } catch (err) {
    console.error(err);
    showToast("Error adding product", "error");
  }
};

function clearProductForm() {
  ["titleEn","titleAr","titleFr","descEn","descAr","descFr","currentPrice","oldPrice","discountPercent"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("category").value = "ai";
  currentMainImage = "";
  currentPreviewImages = [];
  document.getElementById("mainImageUrl").value = "";
  document.getElementById("previewUrls").value = "";
  document.getElementById("mainPreview").innerHTML = "";
  document.getElementById("multiPreview").innerHTML = "";
}

// ---------- Load Products ----------
async function loadProducts() {
  const container = document.getElementById("productsList");
  container.innerHTML = '<div class="col-span-full text-center py-8">Loading products...</div>';
  try {
    const snap = await getDocs(collection(db, "products"));
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (products.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400">No products yet.</div>';
      return;
    }
    container.innerHTML = products.map(p => `
      <div class="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
        <img src="${p.image || 'https://placehold.co/300x400'}" class="h-40 w-full object-cover">
        <div class="p-3">
          <h3 class="font-bold truncate">${escapeHtml(p.title)}</h3>
          <p class="text-primary font-bold mt-1">$${p.price}</p>
          <button class="delete-product mt-2 bg-red-600/80 hover:bg-red-600 text-white text-sm px-3 py-1 rounded-lg w-full" data-id="${p.id}">Delete</button>
        </div>
      </div>
    `).join('');
    document.querySelectorAll(".delete-product").forEach(btn => {
      btn.onclick = async () => {
        if (confirm("Delete this product permanently?")) {
          await deleteDoc(doc(db, "products", btn.dataset.id));
          loadProducts(); loadStats();
        }
      };
    });
  } catch (err) {
    container.innerHTML = '<div class="col-span-full text-center py-8 text-red-400">Error loading products</div>';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- Load Orders ----------
async function loadOrders() {
  cachedOrders = [];
  const container = document.getElementById("ordersTableBody");
  container.innerHTML = '<tr><td colspan="6" class="text-center py-4">Loading orders...</td></tr>';
  try {
    const snap = await getDocs(collection(db, "orders"));
    cachedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderOrdersTable(cachedOrders);
  } catch (err) {
    container.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-400">Error loading orders</td></tr>';
  }
}

function renderOrdersTable(orders) {
  const container = document.getElementById("ordersTableBody");
  if (orders.length === 0) {
    container.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">No orders found</td></tr>';
    return;
  }
  container.innerHTML = orders.map(o => `
    <tr class="border-b border-gray-800">
      <td class="p-2">${escapeHtml(o.fullName || '')}</td>
      <td>${escapeHtml(o.phoneWhatsapp || '')}</td>
      <td>${escapeHtml(o.wilaya || '')}</td>
      <td>$${(o.total || 0).toFixed(2)}</td>
      <td>
        <select class="order-status bg-zinc-800 rounded px-2 py-1 text-sm" data-id="${o.id}">
          <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
      </td>
      <td><a href="https://wa.me/${normalizePhone(o.phoneWhatsapp || '')}" target="_blank" class="text-green-400 hover:text-green-300"><i class="fab fa-whatsapp"></i> WhatsApp</a></td>
    </tr>
  `).join('');

  document.querySelectorAll(".order-status").forEach(select => {
    select.onchange = async () => {
      await updateDoc(doc(db, "orders", select.dataset.id), { status: select.value });
      loadStats(); loadRevenue(); renderOrdersTable(cachedOrders);
      showToast("Order status updated");
    };
  });
}

function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\s+/g, '').replace(/^0/, '');
  return cleaned.startsWith('213') ? cleaned : '213' + cleaned;
}

// ---------- Stats & Revenue ----------
async function loadStats() {
  try {
    const ordersSnap = await getDocs(collection(db, "orders"));
    const orders = ordersSnap.docs.map(d => d.data());
    document.getElementById("totalOrders").innerText = orders.length;
    document.getElementById("newOrders").innerText = orders.filter(o => o.status === "pending").length;
    document.getElementById("completedOrders").innerText = orders.filter(o => o.status === "completed").length;
    document.getElementById("totalProducts").innerText = (await getDocs(collection(db, "products"))).size;
  } catch (err) { console.error(err); }
}

async function loadRevenue() {
  try {
    const snap = await getDocs(collection(db, "orders"));
    const completed = snap.docs.map(d => d.data()).filter(o => o.status === "completed" && o.createdAt);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    let today = 0, week = 0, month = 0, year = 0;
    completed.forEach(order => {
      const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const total = order.total || 0;
      if (orderDate >= todayStart) today += total;
      if (orderDate >= weekAgo) week += total;
      if (orderDate >= monthAgo) month += total;
      if (orderDate >= yearStart) year += total;
    });
    document.getElementById("todayRev").innerText = `$${today.toFixed(2)}`;
    document.getElementById("weekRev").innerText = `$${week.toFixed(2)}`;
    document.getElementById("monthRev").innerText = `$${month.toFixed(2)}`;
    document.getElementById("yearRev").innerText = `$${year.toFixed(2)}`;
  } catch (err) { console.error(err); }
}

// ---------- Tabs & Filters ----------
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tabId = btn.dataset.tab;
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.add("hidden"));
    document.getElementById(`${tabId}Tab`).classList.remove("hidden");
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("text-purple-400", "border-purple-400"));
    btn.classList.add("text-purple-400", "border-b-2", "border-purple-400");
    if (tabId === "products") loadProducts();
    if (tabId === "orders") loadOrders();
    if (tabId === "revenue") loadRevenue();
  });
});

document.getElementById("searchOrder")?.addEventListener("input", filterOrdersUI);
document.getElementById("statusFilter")?.addEventListener("change", filterOrdersUI);

function filterOrdersUI() {
  const searchTerm = document.getElementById("searchOrder").value.toLowerCase();
  const status = document.getElementById("statusFilter").value;
  let filtered = cachedOrders;
  if (status !== "all") filtered = filtered.filter(o => o.status === status);
  if (searchTerm) filtered = filtered.filter(o => (o.fullName && o.fullName.toLowerCase().includes(searchTerm)) || (o.phoneWhatsapp && o.phoneWhatsapp.includes(searchTerm)));
  renderOrdersTable(filtered);
}

async function loadAllData() { await loadStats(); await loadProducts(); await loadOrders(); await loadRevenue(); }
document.querySelector("[data-tab='products']").click();