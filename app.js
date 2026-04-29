const STORAGE_KEY = "moneyapp.budget.v1";
const presets = [20, 50, 100, 200];
const colors = ["#20867a", "#d96c4f", "#547aa5", "#e5b84c", "#8b6bb1", "#4c8f62"];

const defaultState = {
  income: 10000,
  funds: [
    { id: "living", name: "生活", percent: 50, color: colors[0], spent: 800 },
    { id: "rent", name: "房租", percent: 30, color: colors[1], spent: 0 },
    { id: "saving", name: "储蓄", percent: 20, color: colors[2], spent: 0 }
  ],
  history: []
};

let state = loadState();
let activeFundId = null;
let toastTimer = null;

const fundList = document.querySelector("#fundList");
const totalRemaining = document.querySelector("#totalRemaining");
const spentRatio = document.querySelector("#spentRatio");
const allocationRatio = document.querySelector("#allocationRatio");
const summaryFill = document.querySelector("#summaryFill");
const monthTitle = document.querySelector("#monthTitle");
const expenseDialog = document.querySelector("#expenseDialog");
const expenseForm = document.querySelector("#expenseForm");
const expenseTitle = document.querySelector("#expenseTitle");
const expenseHint = document.querySelector("#expenseHint");
const expenseAmount = document.querySelector("#expenseAmount");
const presetGrid = document.querySelector("#presetGrid");
const settingsDialog = document.querySelector("#settingsDialog");
const settingsForm = document.querySelector("#settingsForm");
const incomeInput = document.querySelector("#incomeInput");
const budgetEditor = document.querySelector("#budgetEditor");
const percentSummary = document.querySelector("#percentSummary");
const amountSummary = document.querySelector("#amountSummary");
const toast = document.querySelector("#toast");

document.querySelector("#openSettings").addEventListener("click", openSettings);
document.querySelector("#addFund").addEventListener("click", addSettingRow);
expenseForm.addEventListener("submit", saveExpense);
settingsForm.addEventListener("submit", saveSettings);
incomeInput.addEventListener("input", updateSettingSummary);
budgetEditor.addEventListener("input", updateSettingSummary);

presetGrid.innerHTML = presets
  .map((amount) => `<button type="button" data-amount="${amount}">¥${amount}</button>`)
  .join("");
presetGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-amount]");
  if (!button) return;
  expenseAmount.value = button.dataset.amount;
  expenseAmount.focus();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      showToast("离线缓存暂时不可用");
    });
  });
}

render();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeState(input) {
  const income = toMoney(input.income) || defaultState.income;
  const funds = Array.isArray(input.funds) && input.funds.length
    ? input.funds.map((fund, index) => ({
        id: fund.id || createId(),
        name: String(fund.name || `用途 ${index + 1}`).slice(0, 12),
        percent: clamp(toMoney(fund.percent), 0, 100),
        color: fund.color || colors[index % colors.length],
        spent: Math.max(0, toMoney(fund.spent))
      }))
    : structuredClone(defaultState.funds);

  return {
    income,
    funds,
    history: Array.isArray(input.history) ? input.history : []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const month = new Date().toLocaleDateString("zh-CN", { month: "long" });
  monthTitle.textContent = `${month}口袋`;

  const viewFunds = state.funds.map(toViewFund);
  const totalAllocated = sum(viewFunds, "allocated");
  const remaining = sum(viewFunds, "remaining");
  const spent = sum(viewFunds, "spent");
  const percentTotal = sum(state.funds, "percent");
  const usedPercent = totalAllocated > 0 ? Math.min(100, (spent / totalAllocated) * 100) : 0;

  totalRemaining.textContent = formatMoney(remaining);
  spentRatio.textContent = `已用 ${formatPercent(usedPercent)}`;
  allocationRatio.textContent = `分配 ${formatPercent(percentTotal)}`;
  summaryFill.style.width = `${usedPercent}%`;

  if (!viewFunds.length) {
    fundList.innerHTML = `<div class="empty-state">还没有资金用途，点右上角设置添加。</div>`;
    return;
  }

  fundList.innerHTML = viewFunds.map(renderFundCard).join("");
  fundList.querySelectorAll(".fund-card").forEach((card) => {
    card.addEventListener("click", () => openExpense(card.dataset.id));
  });
}

function renderFundCard(fund) {
  const remainingPercent = fund.allocated > 0 ? Math.max(0, (fund.remaining / fund.allocated) * 100) : 0;
  const spentText = fund.spent > 0 ? `已花 ${formatMoney(fund.spent)}` : "还没动用";

  return `
    <button class="fund-card" type="button" data-id="${fund.id}" style="--fund-color: ${fund.color}">
      <div class="fund-head">
        <p class="fund-name"><span class="fund-dot"></span>${escapeHtml(fund.name)}</p>
        <span class="fund-percent">${formatPercent(fund.percent)}</span>
      </div>
      <p class="fund-money">${formatMoney(fund.remaining)}</p>
      <div class="fund-track" aria-hidden="true">
        <span style="width: ${remainingPercent}%; background: ${fund.color}"></span>
      </div>
      <div class="fund-meta">
        <span>${spentText}</span>
        <span>预算 ${formatMoney(fund.allocated)}</span>
      </div>
    </button>
  `;
}

function openExpense(fundId) {
  const fund = state.funds.find((item) => item.id === fundId);
  if (!fund) return;

  const viewFund = toViewFund(fund);
  activeFundId = fundId;
  expenseTitle.textContent = fund.name;
  expenseHint.textContent = `当前剩余 ${formatMoney(viewFund.remaining)}，输入金额后会立即扣减。`;
  expenseAmount.value = "";
  expenseDialog.showModal();
  requestAnimationFrame(() => expenseAmount.focus());
}

function saveExpense(event) {
  event.preventDefault();
  const submitter = event.submitter;
  if (submitter?.value === "cancel") {
    expenseDialog.close();
    return;
  }

  const amount = toMoney(expenseAmount.value);
  const fund = state.funds.find((item) => item.id === activeFundId);
  if (!fund || amount <= 0) {
    showToast("请输入有效金额");
    return;
  }

  const viewFund = toViewFund(fund);
  if (amount > viewFund.remaining) {
    showToast("金额超过该用途剩余额度");
    return;
  }

  fund.spent = roundMoney(fund.spent + amount);
  state.history.unshift({
    id: createId(),
    fundId: fund.id,
    fundName: fund.name,
    amount,
    createdAt: new Date().toISOString()
  });
  state.history = state.history.slice(0, 80);
  saveState();
  expenseDialog.close();
  render();
  showToast(`${fund.name} 已记 ${formatMoney(amount)}`);
}

function openSettings() {
  incomeInput.value = state.income;
  budgetEditor.innerHTML = state.funds.map(renderSettingRow).join("");
  attachRemoveHandlers();
  updateSettingSummary();
  settingsDialog.showModal();
}

function renderSettingRow(fund, index) {
  return `
    <div class="budget-row" data-id="${fund.id}" data-spent="${fund.spent}" data-color="${fund.color}">
      <label class="budget-field">
        <span>用途</span>
        <input class="fund-name-input" maxlength="12" value="${escapeHtml(fund.name)}" required />
      </label>
      <label class="budget-field">
        <span>比例 %</span>
        <input class="fund-percent-input" inputmode="decimal" min="0" max="100" step="1" type="number" value="${fund.percent}" required />
      </label>
      <button class="remove-button" type="button" aria-label="删除用途 ${index + 1}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  `;
}

function attachRemoveHandlers() {
  budgetEditor.querySelectorAll(".remove-button").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".budget-row").remove();
      updateSettingSummary();
    });
  });
}

function addSettingRow() {
  const index = budgetEditor.querySelectorAll(".budget-row").length;
  const fund = {
    id: createId(),
    name: `新用途 ${index + 1}`,
    percent: 10,
    color: colors[index % colors.length],
    spent: 0
  };
  budgetEditor.insertAdjacentHTML("beforeend", renderSettingRow(fund, index));
  attachRemoveHandlers();
  updateSettingSummary();
  const newRow = budgetEditor.lastElementChild;
  newRow?.querySelector(".fund-name-input")?.select();
}

function saveSettings(event) {
  event.preventDefault();
  const submitter = event.submitter;
  if (submitter?.value === "cancel") {
    settingsDialog.close();
    return;
  }

  const income = toMoney(incomeInput.value);
  const rows = [...budgetEditor.querySelectorAll(".budget-row")];
  const nextFunds = rows.map((row, index) => ({
    id: row.dataset.id || createId(),
    name: row.querySelector(".fund-name-input").value.trim(),
    percent: clamp(toMoney(row.querySelector(".fund-percent-input").value), 0, 100),
    color: row.dataset.color || colors[index % colors.length],
    spent: Math.max(0, toMoney(row.dataset.spent))
  })).filter((fund) => fund.name && fund.percent > 0);

  if (income <= 0) {
    showToast("收入需要大于 0");
    return;
  }

  if (!nextFunds.length) {
    showToast("至少保留一个用途");
    return;
  }

  state = { ...state, income, funds: nextFunds };
  saveState();
  settingsDialog.close();
  render();
  showToast("预算已更新");
}

function updateSettingSummary() {
  const income = toMoney(incomeInput.value);
  const percents = [...budgetEditor.querySelectorAll(".fund-percent-input")].map((input) => toMoney(input.value));
  const percentTotal = percents.reduce((total, value) => total + value, 0);
  percentSummary.textContent = `已分配 ${formatPercent(percentTotal)}`;
  amountSummary.textContent = `预算 ${formatMoney((income * percentTotal) / 100)}`;
}

function toViewFund(fund) {
  const allocated = roundMoney((state.income * fund.percent) / 100);
  const remaining = Math.max(0, roundMoney(allocated - fund.spent));
  return { ...fund, allocated, remaining };
}

function toMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? roundMoney(number) : 0;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function formatMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
}

function formatPercent(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

function createId() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}
