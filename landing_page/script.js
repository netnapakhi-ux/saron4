/* ==========================================================
   SARON — script.js (shared by all pages)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

/* ---------- ตั้งค่า (แก้ 2 บรรทัดนี้) ---------- */
const APPS_SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
const CSV_URL = "PASTE_YOUR_PUBLISHED_GOOGLE_SHEET_CSV_URL_HERE";

/* ---------- ตัวกรอง mood ----------
   ค่า mood ใน products.json:
   fresh = มะกรูด, confident = มะนาว, romance = อัญชัน */
const MOOD_FILTERS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "fresh", label: "สูตรมะกรูด" },
  { value: "confident", label: "สูตรมะนาว" },
  { value: "romance", label: "สูตรอัญชัน" }
];

// ชื่ออื่นที่ใช้ใน ?mood= ได้ (แปลงเป็นค่าใน products.json)
const MOOD_ALIASES = {
  makrut: "fresh",
  manao: "confident",
  ounchan: "romance"
};

/* ==========================================================
   เริ่มทำงานตามหน้าที่เปิดอยู่ (ตรวจจาก element ในหน้า)
   ========================================================== */
document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("product-list")) initProductPage();
  if (document.getElementById("orderForm")) initOrderPage();
  if (document.getElementById("ordersTable")) initAdminPage();
});

/* ==========================================================
   1) หน้า product.html
   ========================================================== */
let allProducts = [];

function initProductPage() {
  const list = document.getElementById("product-list");
  list.textContent = "กำลังโหลดสินค้า...";

  fetch("products.json")
    .then(function (res) {
      if (!res.ok) throw new Error("โหลด products.json ไม่สำเร็จ");
      return res.json();
    })
    .then(function (products) {
      allProducts = products;

      const params = new URLSearchParams(window.location.search);
      let mood = (params.get("mood") || "all").toLowerCase();
      mood = MOOD_ALIASES[mood] || mood;
      const valid = MOOD_FILTERS.some(function (f) { return f.value === mood; });
      if (!valid) mood = "all";

      renderFilterBar(mood);
      renderProducts(mood);
    })
    .catch(function (error) {
      console.error(error);
      list.textContent = "ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่อีกครั้ง";
    });
}

function renderFilterBar(activeMood) {
  const bar = document.getElementById("filter-bar");
  if (!bar) return;
  bar.innerHTML = "";

  MOOD_FILTERS.forEach(function (f) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-btn";
    btn.textContent = f.label;
    btn.dataset.mood = f.value === "all" ? "" : f.value;
    if (f.value === activeMood) btn.classList.add("active");

    btn.addEventListener("click", function () {
      bar.querySelectorAll(".filter-btn").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      renderProducts(f.value);
    });

    bar.appendChild(btn);
  });
}

function renderProducts(mood) {
  const list = document.getElementById("product-list");
  list.innerHTML = "";

  const items = allProducts.filter(function (p) {
    return mood === "all" || p.mood === mood;
  });

  if (items.length === 0) {
    list.textContent = "ไม่พบสินค้า";
    return;
  }

  items.forEach(function (p) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.mood = p.mood;

    const img = document.createElement("img");
    img.className = "product-image";
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";

    const body = document.createElement("div");
    body.className = "product-body";

    const name = document.createElement("h3");
    name.textContent = p.name;

    const size = document.createElement("div");
    size.className = "product-meta";
    size.textContent = p.size;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = formatPrice(p.price) + " บาท";

    const buy = document.createElement("a");
    buy.className = "btn btn-accent btn-block";
    buy.textContent = "สั่งซื้อ";
    buy.href =
      "order.html?item=" + encodeURIComponent(p.name) +
      "&price=" + encodeURIComponent(p.price);

    body.appendChild(name);
    body.appendChild(size);
    body.appendChild(price);
    body.appendChild(buy);

    card.appendChild(img);
    card.appendChild(body);
    list.appendChild(card);
  });
}

function formatPrice(n) {
  return Number(n).toLocaleString("th-TH");
}

/* ==========================================================
   2) หน้า order.html
   ========================================================== */
function initOrderPage() {
  const form = document.getElementById("orderForm");

  // อ่าน item และ price จาก URL แล้วเติมลงฟอร์มทันที
  const params = new URLSearchParams(window.location.search);
  const item = params.get("item");
  const price = params.get("price");

  const itemsInput = document.getElementById("items");
  const totalInput = document.getElementById("total");

  if (item !== null && itemsInput) itemsInput.value = item;
  if (price !== null && totalInput) totalInput.value = price;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const payload = {
      customerName: document.getElementById("customerName").value,
      contact: document.getElementById("contact").value,
      items: document.getElementById("items").value,
      total: document.getElementById("total").value,
      note: document.getElementById("note").value
    };

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = "thankyou.html"; })
    .catch(error => {
      console.error(error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    });
  });
}

/* ==========================================================
   3) หน้า admin.html
   ========================================================== */
function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;

  setAdminMessage(tbody, "กำลังโหลดข้อมูล...");

  fetch(CSV_URL)
    .then(function (res) {
      if (!res.ok) throw new Error("โหลด CSV ไม่สำเร็จ");
      return res.text();
    })
    .then(function (text) {
      let rows = parseCSV(text);

      // ตัดแถวว่าง
      rows = rows.filter(function (r) {
        return r.some(function (cell) { return cell.trim() !== ""; });
      });

      // ตัดแถวหัวตาราง (ถ้าแถวแรกเป็นหัวคอลัมน์ ไม่ใช่วันที่)
      if (rows.length > 0 && !looksLikeDataRow(rows[0])) rows.shift();

      // เรียงรายการล่าสุดขึ้นก่อน (Sheet เพิ่มแถวใหม่ต่อท้ายเสมอ)
      rows.reverse();

      renderOrders(tbody, rows);
    })
    .catch(function (error) {
      console.error(error);
      setAdminMessage(tbody, "ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบ CSV_URL");
    });
}

// แถวแรกที่ขึ้นต้นด้วยตัวเลขถือเป็นข้อมูล (วันเวลา) ไม่ใช่หัวตาราง
function looksLikeDataRow(row) {
  return /^\s*\d/.test(row[0] || "");
}

function setAdminMessage(tbody, message) {
  tbody.innerHTML = "";
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 6;
  td.textContent = message;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function renderOrders(tbody, rows) {
  tbody.innerHTML = "";

  if (rows.length === 0) {
    setAdminMessage(tbody, "ยังไม่มีคำสั่งซื้อ");
    return;
  }

  rows.forEach(function (row) {
    const tr = document.createElement("tr");
    // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
    for (let i = 0; i < 6; i++) {
      const td = document.createElement("td");
      td.textContent = row[i] !== undefined ? row[i] : "";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
}

/* ---------- ฟังก์ชัน parse CSV (เขียนเอง ไม่ใช้ library) ----------
   รองรับ: ข้อความในเครื่องหมายคำพูด, comma และขึ้นบรรทัดใหม่ใน field,
   เครื่องหมายคำพูดซ้อน ("") และ \r\n */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  // ตัด BOM ถ้ามี
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // แถวสุดท้าย (กรณีไฟล์ไม่ได้จบด้วยบรรทัดใหม่)
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
