// ===== SCRAPMART APP LOGIC =====

// State
let state = {
  coins: 0,
  totalEarned: 0,
  totalOrders: 0,
  totalKg: 0,
  transactions: [],
  coinsByCompany: {}, // { companyId: coinCount }
  coupons: [],        // { companyId, code, offer, date }
};

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  renderCategories();
  renderCompanies("all");
  populateSellForm();
  updateWallet();
  animateStats();
  setupNavScroll();
  setupHamburger();
  setupFilterButtons();
  updateNavCoins();
});

// ===== STATE PERSISTENCE =====
function saveState() {
  localStorage.setItem("scrapmart_state", JSON.stringify(state));
}
function loadState() {
  const saved = localStorage.getItem("scrapmart_state");
  if (saved) state = JSON.parse(saved);
}

// ===== NAVIGATION =====
function showSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: "smooth" });
  setActiveNav(id);
  if (window.innerWidth < 768) closeHamburger();
}

function setActiveNav(id) {
  document.querySelectorAll(".nav-link").forEach((l) => {
    l.classList.toggle("active", l.getAttribute("href") === "#" + id);
  });
}

function setupNavScroll() {
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 60);
    // Active nav on scroll
    const sections = ["home", "categories", "companies", "sell", "wallet"];
    let current = "home";
    sections.forEach((s) => {
      const el = document.getElementById(s);
      if (el && window.scrollY >= el.offsetTop - 120) current = s;
    });
    setActiveNav(current);
  });
}

function setupHamburger() {
  document.getElementById("hamburger").addEventListener("click", () => {
    document.getElementById("navLinks").classList.toggle("open");
    document.getElementById("hamburger").classList.toggle("open");
  });
}

function closeHamburger() {
  document.getElementById("navLinks").classList.remove("open");
  document.getElementById("hamburger").classList.remove("open");
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => closeHamburger());
});

// ===== ANIMATE STATS =====
function animateStats() {
  const activeCount = COMPANIES.filter((c) => c.status === "Active").length;
  animateNumber("statCompanies", activeCount);
  animateNumber("statSales", 12400 + state.totalKg);
  animateNumber("statUsers", 3820 + state.totalOrders);
  document.getElementById("activeCount").textContent = activeCount;
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  let current = 0;
  const step = Math.ceil(target / 60);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString("en-IN");
    if (current >= target) clearInterval(timer);
  }, 20);
}

// ===== RENDER CATEGORIES =====
function renderCategories() {
  const grid = document.getElementById("categoriesGrid");
  grid.innerHTML = CATEGORIES.map(
    (cat) => `
    <div class="cat-card" onclick="filterByCategory('${cat.name}')">
      <div class="cat-icon" style="background:${cat.color}22; color:${cat.color}">
        <i class="${cat.icon}"></i>
      </div>
      <div class="cat-info">
        <h3>${cat.name}</h3>
        <p>${cat.desc}</p>
        <div class="cat-rate">
          <span>From <b>₹${cat.baseRate}/kg</b></span>
          <span class="cat-coin"><i class="fas fa-coins"></i> +${cat.coinPer10kg} coins/10kg</span>
        </div>
      </div>
      <div class="cat-arrow"><i class="fas fa-chevron-right"></i></div>
    </div>
  `
  ).join("");
}

function filterByCategory(catName) {
  showSection("companies");
  setTimeout(() => {
    document.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.filter === catName);
    });
    renderCompanies(catName);
  }, 400);
}

// ===== RENDER COMPANIES =====
function renderCompanies(filter) {
  const grid = document.getElementById("companiesGrid");
  const filtered =
    filter === "all"
      ? COMPANIES
      : COMPANIES.filter((c) => c.categories.includes(filter));

  grid.innerHTML = filtered
    .map((c) => {
      const isActive = c.status === "Active";
      const coinProgress = state.coinsByCompany[c.id] || 0;
      const progressPct = Math.min((coinProgress / COIN_THRESHOLD) * 100, 100);
      return `
      <div class="company-card ${isActive ? "" : "inactive-card"}" id="card-${c.id}">
        <div class="cc-header">
          <div class="cc-logo" style="color:${c.logoColor}"><i class="${c.logo}"></i></div>
          <div class="cc-meta">
            <h3>${c.name}</h3>
            <span class="cc-location"><i class="fas fa-map-marker-alt"></i> ${c.location}</span>
          </div>
          <div class="cc-status ${isActive ? "status-active" : "status-inactive"}">
            <i class="fas fa-circle"></i> ${c.status}
          </div>
        </div>
        <div class="cc-badge" style="background:${c.badgeColor}22; color:${c.badgeColor}">${c.badge}</div>
        <p class="cc-desc">${c.desc}</p>
        <div class="cc-categories">
          ${c.categories.map((cat) => `<span class="cc-cat">${cat}</span>`).join("")}
        </div>
        <div class="cc-rates">
          ${c.categories
            .map((cat) => {
              const key = cat.toLowerCase().replace("-", "");
              const rate = c.rates[key];
              return rate ? `<div class="rate-pill"><span>${cat}</span><b>₹${rate}/kg</b></div>` : "";
            })
            .join("")}
        </div>
        <div class="cc-rating">
          <div class="stars">${renderStars(c.rating)}</div>
          <span>${c.rating} (${c.reviews} reviews)</span>
          <span class="cc-min">Min: ${c.minQty}kg</span>
          ${c.pickup ? '<span class="cc-pickup"><i class="fas fa-truck"></i> Pickup</span>' : '<span class="cc-dropoff"><i class="fas fa-store"></i> Drop-off</span>'}
        </div>
        <div class="cc-coin-bar">
          <div class="ccb-label">
            <span><i class="fas fa-coins"></i> ${coinProgress} / ${COIN_THRESHOLD} coins</span>
            ${coinProgress >= COIN_THRESHOLD ? '<span class="coupon-ready">🎁 Coupon Ready!</span>' : ""}
          </div>
          <div class="ccb-track"><div class="ccb-fill" style="width:${progressPct}%"></div></div>
        </div>
        <div class="cc-actions">
          <button class="btn-sm btn-outline" onclick="openCompanyModal('${c.id}')"><i class="fas fa-eye"></i> Details</button>
          ${isActive ? `<button class="btn-sm btn-primary" onclick="quickSell('${c.id}')"><i class="fas fa-plus"></i> Sell Here</button>` : '<button class="btn-sm btn-disabled" disabled>Unavailable</button>'}
        </div>
      </div>
    `;
    })
    .join("");
}

function renderStars(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) stars += '<i class="fas fa-star"></i>';
    else if (i - rating < 1) stars += '<i class="fas fa-star-half-stroke"></i>';
    else stars += '<i class="far fa-star"></i>';
  }
  return stars;
}

// ===== FILTER BUTTONS =====
function setupFilterButtons() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderCompanies(btn.dataset.filter);
    });
  });
}

// ===== SELL FORM =====
function populateSellForm() {
  const catSel = document.getElementById("scrapCategory");
  catSel.innerHTML = '<option value="">-- Select Category --</option>' +
    CATEGORIES.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  updateCompanyDropdown();
}

function updateCompanyDropdown() {
  const catId = document.getElementById("scrapCategory").value;
  const companySel = document.getElementById("scrapCompany");
  const activeCompanies = COMPANIES.filter((c) => {
    if (c.status !== "Active") return false;
    if (!catId) return true;
    const catName = CATEGORIES.find((cat) => cat.id === catId)?.name;
    return c.categories.includes(catName);
  });
  companySel.innerHTML =
    '<option value="">-- Select Company --</option>' +
    activeCompanies.map((c) => `<option value="${c.id}">${c.name} — ₹${getCategoryRate(c, catId)}/kg</option>`).join("");
  updatePriceEstimate();
}

function getCategoryRate(company, catId) {
  if (!catId) return "—";
  const key = catId.replace("-", "");
  return company.rates[key] || "—";
}

function updatePriceEstimate() {
  const catId = document.getElementById("scrapCategory").value;
  const companyId = document.getElementById("scrapCompany").value;
  const qty = parseFloat(document.getElementById("scrapQty").value) || 0;
  const preview = document.getElementById("pricePreview");

  if (!catId || !companyId || !qty) {
    preview.style.display = "none";
    return;
  }

  const company = COMPANIES.find((c) => c.id === companyId);
  const key = catId.replace("-", "");
  const rate = company?.rates[key] || 0;
  const total = rate * qty;
  const coinBonus = company?.coinBonus[key] || 0;
  const coinsEarned = Math.floor((qty / 10) * coinBonus) + Math.floor(qty);

  document.getElementById("ppRate").textContent = `₹${rate}/kg`;
  document.getElementById("ppQty").textContent = `${qty} kg`;
  document.getElementById("ppTotal").textContent = `₹${total.toFixed(2)}`;
  document.getElementById("ppCoins").textContent = `+${coinsEarned} coins`;
  preview.style.display = "block";

  // Update coin progress
  const currentCoins = state.coinsByCompany[companyId] || 0;
  const projected = currentCoins + coinsEarned;
  const pct = Math.min((projected / COIN_THRESHOLD) * 100, 100);
  document.getElementById("sellCoinVal").textContent = `${Math.min(projected, COIN_THRESHOLD)} / ${COIN_THRESHOLD}`;
  document.getElementById("sellCoinFill").style.width = pct + "%";
  document.getElementById("sellCoinProgress").style.display = "block";
}

function submitSale() {
  const name = document.getElementById("sellerName").value.trim();
  const phone = document.getElementById("sellerPhone").value.trim();
  const catId = document.getElementById("scrapCategory").value;
  const companyId = document.getElementById("scrapCompany").value;
  const qty = parseFloat(document.getElementById("scrapQty").value);
  const address = document.getElementById("pickupAddress").value.trim();

  if (!name || !phone || !catId || !companyId || !qty || !address) {
    showToast("Please fill all fields!", "error");
    return;
  }

  const company = COMPANIES.find((c) => c.id === companyId);
  const category = CATEGORIES.find((c) => c.id === catId);
  const key = catId.replace("-", "");
  const rate = company.rates[key] || 0;
  const total = rate * qty;
  const coinBonus = company.coinBonus[key] || 0;
  const coinsEarned = Math.floor((qty / 10) * coinBonus) + Math.floor(qty);

  if (qty < company.minQty) {
    showToast(`Minimum quantity for ${company.name} is ${company.minQty} kg`, "error");
    return;
  }

  // Update state
  state.totalEarned += total;
  state.totalOrders += 1;
  state.totalKg += qty;
  state.coins += coinsEarned;
  state.coinsByCompany[companyId] = (state.coinsByCompany[companyId] || 0) + coinsEarned;

  const txn = {
    id: Date.now(),
    sellerName: name,
    category: category.name,
    company: company.name,
    companyId,
    qty,
    rate,
    total,
    coinsEarned,
    date: new Date().toLocaleDateString("en-IN"),
    status: "Confirmed",
  };
  state.transactions.unshift(txn);
  saveState();

  // Check coupon
  const totalCoinsForCompany = state.coinsByCompany[companyId];
  const alreadyHasCoupon = state.coupons.find((cp) => cp.companyId === companyId);
  if (totalCoinsForCompany >= COIN_THRESHOLD && !alreadyHasCoupon) {
    state.coupons.push({
      companyId,
      companyName: company.name,
      code: company.coupon.code,
      offer: company.coupon.offer,
      minPurchase: company.coupon.minPurchase,
      date: new Date().toLocaleDateString("en-IN"),
    });
    saveState();
    setTimeout(() => showCouponModal(company), 1800);
  }

  // Show success
  document.getElementById("successMsg").innerHTML = `
    <b>${name}</b>, your sale of <b>${qty} kg ${category.name}</b> to <b>${company.name}</b> is confirmed!<br>
    Estimated payout: <b style="color:var(--green)">₹${total.toFixed(2)}</b>
  `;
  document.getElementById("successCoins").innerHTML = `
    <i class="fas fa-coins"></i> +${coinsEarned} Golden Coins Earned!
    <br><small>Total: ${state.coins} coins</small>
  `;
  openModal("successModal");

  // Reset form
  document.getElementById("sellForm").reset();
  document.getElementById("pricePreview").style.display = "none";
  document.getElementById("sellCoinProgress").style.display = "none";

  // Update UI
  updateWallet();
  updateNavCoins();
  renderCompanies(document.querySelector(".filter-btn.active").dataset.filter);
}

// ===== QUICK SELL =====
function quickSell(companyId) {
  showSection("sell");
  setTimeout(() => {
    document.getElementById("scrapCompany").value = companyId;
    updatePriceEstimate();
  }, 600);
}

// ===== WALLET UPDATE =====
function updateWallet() {
  document.getElementById("totalEarned").textContent = `₹${state.totalEarned.toFixed(2)}`;
  document.getElementById("totalCoins").textContent = state.coins;
  document.getElementById("totalOrders").textContent = state.totalOrders;
  document.getElementById("totalKg").textContent = `${state.totalKg} kg`;

  // Coin progress per company
  const list = document.getElementById("coinCompaniesList");
  const companyIds = Object.keys(state.coinsByCompany);
  if (companyIds.length === 0) {
    list.innerHTML = '<p class="empty-msg"><i class="fas fa-coins"></i> No coin activity yet. Start selling!</p>';
  } else {
    list.innerHTML = companyIds
      .map((cid) => {
        const company = COMPANIES.find((c) => c.id === cid);
        if (!company) return "";
        const coins = state.coinsByCompany[cid];
        const pct = Math.min((coins / COIN_THRESHOLD) * 100, 100);
        const hasCoupon = state.coupons.find((cp) => cp.companyId === cid);
        return `
        <div class="company-coin-row">
          <div class="ccr-logo" style="color:${company.logoColor}"><i class="${company.logo}"></i></div>
          <div class="ccr-info">
            <span class="ccr-name">${company.name}</span>
            <div class="ccr-bar"><div class="ccr-fill" style="width:${pct}%"></div></div>
            <span class="ccr-count">${Math.min(coins, COIN_THRESHOLD)} / ${COIN_THRESHOLD} coins ${hasCoupon ? "🎁 Coupon Unlocked!" : ""}</span>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // Coupons
  const couponsList = document.getElementById("couponsList");
  if (state.coupons.length === 0) {
    couponsList.innerHTML = '<p class="empty-msg"><i class="fas fa-ticket"></i> No coupons yet. Earn 500 coins with any company!</p>';
  } else {
    couponsList.innerHTML = state.coupons
      .map(
        (cp) => `
      <div class="coupon-card">
        <div class="coupon-left">
          <i class="fas fa-gift"></i>
          <div>
            <h4>${cp.companyName}</h4>
            <p>${cp.offer}</p>
            <small>Min purchase: ${cp.minPurchase} • Earned: ${cp.date}</small>
          </div>
        </div>
        <div class="coupon-right">
          <div class="coupon-code-display">${cp.code}</div>
          <button onclick="copyCoupon('${cp.code}')"><i class="fas fa-copy"></i> Copy</button>
        </div>
      </div>
    `
      )
      .join("");
  }

  // Transaction history
  const tbody = document.getElementById("historyBody");
  if (state.transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><i class="fas fa-inbox"></i> No transactions yet</td></tr>';
  } else {
    tbody.innerHTML = state.transactions
      .map(
        (t, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="table-cat">${t.category}</span></td>
        <td>${t.company}</td>
        <td>${t.qty} kg</td>
        <td class="td-earn">₹${t.total.toFixed(2)}</td>
        <td class="td-coins"><i class="fas fa-coins"></i> ${t.coinsEarned}</td>
        <td>${t.date}</td>
        <td><span class="status-badge">${t.status}</span></td>
      </tr>
    `
      )
      .join("");
  }
}

function updateNavCoins() {
  document.getElementById("navCoinCount").textContent = state.coins;
}

// ===== COMPANY MODAL =====
function openCompanyModal(companyId) {
  const c = COMPANIES.find((comp) => comp.id === companyId);
  if (!c) return;

  const rates = Object.entries(c.rates)
    .filter(([, v]) => v > 0)
    .map(
      ([k, v]) => `
    <div class="modal-rate-row">
      <span>${k.charAt(0).toUpperCase() + k.slice(1)}</span>
      <b>₹${v}/kg</b>
      <span class="modal-coin-hint"><i class="fas fa-coins"></i> +${c.coinBonus[k]} coins/10kg</span>
    </div>
  `
    )
    .join("");

  const coinProgress = state.coinsByCompany[c.id] || 0;
  const pct = Math.min((coinProgress / COIN_THRESHOLD) * 100, 100);

  document.getElementById("companyModalContent").innerHTML = `
    <div class="modal-company-header" style="border-color:${c.logoColor}">
      <div class="modal-logo" style="color:${c.logoColor}"><i class="${c.logo}"></i></div>
      <div>
        <h2>${c.name}</h2>
        <span class="cc-status ${c.status === "Active" ? "status-active" : "status-inactive"}">
          <i class="fas fa-circle"></i> ${c.status}
        </span>
      </div>
    </div>
    <div class="modal-meta">
      <span><i class="fas fa-map-marker-alt"></i> ${c.location}</span>
      <span><i class="fas fa-phone"></i> ${c.phone}</span>
      <span><i class="fas fa-clock"></i> ${c.openTime}</span>
      <span>${c.pickup ? '<i class="fas fa-truck"></i> Doorstep Pickup' : '<i class="fas fa-store"></i> Drop-off Only'}</span>
    </div>
    <p class="modal-desc">${c.desc}</p>
    <div class="modal-divider"></div>
    <h4>Rate Card</h4>
    <div class="modal-rates">${rates}</div>
    <div class="modal-divider"></div>
    <h4>Coupon Reward</h4>
    <div class="modal-coupon-info">
      <i class="fas fa-ticket" style="color:${c.logoColor}"></i>
      <div>
        <b>${c.coupon.offer}</b>
        <p>Code: <code>${c.coupon.code}</code> | Min: ${c.coupon.minPurchase}</p>
        <p>Earn 500 coins with this company to unlock!</p>
      </div>
    </div>
    <div class="modal-divider"></div>
    <h4>Your Coin Progress</h4>
    <div class="modal-coin-prog">
      <div class="mcp-bar"><div class="mcp-fill" style="width:${pct}%"></div></div>
      <span>${coinProgress} / ${COIN_THRESHOLD} coins</span>
    </div>
    <div class="modal-actions">
      ${c.status === "Active" ? `<button class="btn-primary" onclick="quickSell('${c.id}'); closeModal('companyModal')"><i class="fas fa-plus-circle"></i> Sell to this company</button>` : '<button class="btn-disabled" disabled>Company Inactive</button>'}
    </div>
  `;
  openModal("companyModal");
}

// ===== MODALS =====
function openModal(id) {
  document.getElementById(id).classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  document.body.style.overflow = "";
}
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

function showCouponModal(company) {
  document.getElementById("couponMsg").innerHTML = `
    You've earned <b>500+ coins</b> with <b>${company.name}</b>!<br>
    Enjoy your exclusive reward.
  `;
  document.getElementById("couponCode").textContent = company.coupon.code;
  openModal("couponModal");
}

// ===== TOAST =====
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ===== COPY COUPON =====
function copyCoupon(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast(`Coupon code "${code}" copied!`);
  });
}
