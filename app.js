const STORAGE_KEY = "moneyapp.budget.v2";
const LEGACY_STORAGE_KEY = "moneyapp.budget.v1";
const presets = [20, 50, 100, 200];

const categories = [
  {
    id: "daily",
    label: "烟火",
    color: "#48c7b5"
  },
  {
    id: "fixed",
    label: "恒常",
    color: "#67a8ff"
  },
  {
    id: "saving",
    label: "归藏",
    color: "#8bdc9a"
  }
];

const colors = ["#48c7b5", "#67a8ff", "#8bdc9a", "#78c6ff", "#60d394", "#91b7ff"];

const defaultState = {
  income: 0,
  funds: [],
  history: []
};

let state = loadState();
let activeFundId = null;
let activeSpentFundId = null;
let longPressTimer = null;
let longPressTriggered = false;
let toastTimer = null;

const fundList = document.querySelector("#fundList");
const dailyAverageSpent = document.querySelector("#dailyAverageSpent");
const dailyAverageRemaining = document.querySelector("#dailyAverageRemaining");
const summaryFixed = document.querySelector("#summaryFixed");
const summarySaving = document.querySelector("#summarySaving");
const summaryDaily = document.querySelector("#summaryDaily");
const expenseDialog = document.querySelector("#expenseDialog");
const expenseForm = document.querySelector("#expenseForm");
const expenseTitle = document.querySelector("#expenseTitle");
const expenseHint = document.querySelector("#expenseHint");
const expenseAmount = document.querySelector("#expenseAmount");
const presetGrid = document.querySelector("#presetGrid");
const spentDialog = document.querySelector("#spentDialog");
const spentForm = document.querySelector("#spentForm");
const spentTitle = document.querySelector("#spentTitle");
const spentHint = document.querySelector("#spentHint");
const spentAmount = document.querySelector("#spentAmount");
const settingsDialog = document.querySelector("#settingsDialog");
const settingsForm = document.querySelector("#settingsForm");
const incomeInput = document.querySelector("#incomeInput");
const budgetEditor = document.querySelector("#budgetEditor");
const percentSummary = document.querySelector("#percentSummary");
const amountSummary = document.querySelector("#amountSummary");
const toast = document.querySelector("#toast");

document.querySelector("#openSettings").addEventListener("click", openSettings);
document.querySelector("#addFund").addEventListener("click", addSettingRow);
document.querySelector("#resetState").addEventListener("click", resetToInitialState);
expenseForm.addEventListener("submit", saveExpense);
spentForm.addEventListener("submit", saveSpentAmount);
settingsForm.addEventListener("submit", saveSettings);
incomeInput.addEventListener("input", syncBudgetRowsForIncome);
budgetEditor.addEventListener("input", handleBudgetEditorInput);
budgetEditor.addEventListener("change", handleBudgetEditorInput);
budgetEditor.addEventListener("click", handleBudgetEditorClick);
fundList.addEventListener("click", handleFundClick);
fundList.addEventListener("contextmenu", handleFundContextMenu);
fundList.addEventListener("pointerdown", startLongPress);
fundList.addEventListener("pointermove", clearLongPress);
fundList.addEventListener("pointerup", clearLongPress);
fundList.addEventListener("pointerleave", clearLongPress);
fundList.addEventListener("pointercancel", clearLongPress);

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
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return normalizeState(JSON.parse(raw));
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeState(input) {
  const income = Math.max(0, toMoney(input.income));
  const funds = Array.isArray(input.funds) && input.funds.length
    ? input.funds.map((fund, index) => {
        const category = normalizeCategory(fund.category || inferLegacyCategory(fund));
        const mode = fund.mode === "amount" ? "amount" : "percent";
        const percent = Math.max(0, toMoney(fund.percent));
        const amount = Math.max(0, toMoney(fund.amount));

        return {
          id: fund.id || createId(),
          name: String(fund.name || `用途 ${index + 1}`).slice(0, 12),
          category,
          mode: mode === "amount" && amount > 0 ? "amount" : "percent",
          percent,
          amount,
          color: fund.color || getCategory(category).color || colors[index % colors.length],
          spent: Math.max(0, toMoney(fund.spent))
        };
      })
    : structuredClone(defaultState.funds);

  return {
    income,
    funds,
    history: Array.isArray(input.history) ? input.history : []
  };
}

function inferLegacyCategory(fund) {
  if (fund.id === "rent" || fund.name === "房租") return "fixed";
  if (fund.id === "saving" || fund.name === "储蓄") return "saving";
  return "daily";
}

function normalizeCategory(category) {
  return categories.some((item) => item.id === category) ? category : "daily";
}

function getCategory(categoryId) {
  return categories.find((category) => category.id === categoryId) || categories[0];
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const viewFunds = state.funds.map(toViewFund);
  const dailyFunds = viewFunds.filter((fund) => fund.category === "daily");
  const fixedAllocated = sum(viewFunds.filter((fund) => fund.category === "fixed"), "allocated");
  const savingAllocated = sum(viewFunds.filter((fund) => fund.category === "saving"), "allocated");
  const dailyAllocated = sum(dailyFunds, "allocated");
  const dailyRemaining = sum(dailyFunds, "remaining");
  const dailySpent = sum(dailyFunds, "spent");
  const average = getMonthlyAverages(dailySpent, dailyRemaining);
  const summarySegments = getSummarySegments(fixedAllocated, savingAllocated, dailyAllocated);

  dailyAverageSpent.textContent = formatMoney(average.spent);
  dailyAverageRemaining.textContent = formatMoney(average.remaining);
  summaryFixed.style.width = `${summarySegments.fixed}%`;
  summarySaving.style.width = `${summarySegments.saving}%`;
  summaryDaily.style.width = `${summarySegments.daily}%`;

  if (!viewFunds.length) {
    fundList.innerHTML = "";
    return;
  }

  fundList.innerHTML = categories
    .map((category) => {
      const funds = viewFunds.filter((fund) => fund.category === category.id);
      return funds.length ? renderFundGroup(category, funds) : "";
    })
    .join("");
}

function renderFundGroup(category, funds) {
  return `
    <section class="fund-group category-${category.id}" aria-labelledby="group-${category.id}">
      <div class="group-heading">
        <h2 id="group-${category.id}">${category.label}</h2>
      </div>
      <div class="fund-group-list">
        ${funds.map(renderFundCard).join("")}
      </div>
    </section>
  `;
}

function renderFundCard(fund) {
  const remainingPercent = fund.allocated > 0 ? Math.max(0, Math.min(100, (fund.remaining / fund.allocated) * 100)) : 0;
  const category = getCategory(fund.category);
  const hasProgress = fund.category === "daily";
  const displayAmount = fund.category === "fixed" ? fund.allocated : fund.remaining;
  const progressText = `${formatPlainMoney(fund.remaining)}/${formatPlainMoney(fund.allocated)}`;
  const progressMarkup = hasProgress ? `
      <div class="fund-card-bottom">
        <div class="fund-progress-info">
          <span>${progressText}</span>
        </div>
        <div class="fund-track" aria-hidden="true">
          <span style="width: ${remainingPercent}%; background: ${category.color}"></span>
        </div>
      </div>
  ` : "";

  return `
    <button class="fund-card fund-card-${fund.category}" type="button" data-id="${fund.id}" style="--fund-color: ${category.color}">
      <div class="fund-head">
        <p class="fund-name"><span class="fund-dot"></span>${escapeHtml(fund.name)}</p>
      </div>
      <p class="fund-money">${formatMoney(displayAmount)}</p>
      ${progressMarkup}
    </button>
  `;
}

function handleFundClick(event) {
  const card = event.target.closest(".fund-card");
  if (!card) return;

  if (longPressTriggered) {
    longPressTriggered = false;
    return;
  }

  const fund = state.funds.find((item) => item.id === card.dataset.id);
  if (!fund) return;

  if (fund.category !== "daily") return;

  openExpense(fund.id);
}

function handleFundContextMenu(event) {
  const fund = getDailyFundFromEvent(event);
  if (!fund) return;
  event.preventDefault();
}

function startLongPress(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const fund = getDailyFundFromEvent(event);
  if (!fund) return;

  clearLongPress();
  longPressTriggered = false;
  longPressTimer = window.setTimeout(() => {
    longPressTriggered = true;
    openSpentAdjustment(fund.id);
  }, 620);
}

function clearLongPress() {
  clearTimeout(longPressTimer);
  longPressTimer = null;
}

function getDailyFundFromEvent(event) {
  const card = event.target.closest(".fund-card");
  if (!card) return null;
  const fund = state.funds.find((item) => item.id === card.dataset.id);
  return fund?.category === "daily" ? fund : null;
}

function openExpense(fundId) {
  const fund = state.funds.find((item) => item.id === fundId);
  if (!fund || fund.category !== "daily") return;

  const viewFund = toViewFund(fund);
  activeFundId = fundId;
  expenseTitle.textContent = fund.name;
  expenseHint.textContent = `当前剩余 ${formatMoney(viewFund.remaining)}，输入金额后会立即扣减。`;
  expenseAmount.value = "";
  expenseDialog.showModal();
  requestAnimationFrame(() => expenseAmount.focus());
}

function openSpentAdjustment(fundId) {
  const fund = state.funds.find((item) => item.id === fundId);
  if (!fund || fund.category !== "daily") return;

  const viewFund = toViewFund(fund);
  activeSpentFundId = fundId;
  spentTitle.textContent = fund.name;
  spentHint.textContent = `当前已用 ${formatMoney(viewFund.spent)}，总额 ${formatMoney(viewFund.allocated)}。`;
  spentAmount.value = formatInputNumber(viewFund.spent);
  spentDialog.showModal();
  requestAnimationFrame(() => spentAmount.select());
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
  if (!fund || fund.category !== "daily" || amount <= 0) {
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

function saveSpentAmount(event) {
  event.preventDefault();
  const submitter = event.submitter;
  if (submitter?.value === "cancel") {
    spentDialog.close();
    return;
  }

  const amount = toMoney(spentAmount.value);
  const fund = state.funds.find((item) => item.id === activeSpentFundId);
  if (!fund || fund.category !== "daily" || amount < 0) {
    showToast("请输入有效金额");
    return;
  }

  const viewFund = toViewFund(fund);
  if (amount > viewFund.allocated) {
    showToast("已用金额不能超过总额");
    return;
  }

  fund.spent = roundMoney(amount);
  saveState();
  spentDialog.close();
  render();
  showToast(`${fund.name} 已用更新为 ${formatMoney(amount)}`);
}

function openSettings() {
  incomeInput.value = state.income;
  budgetEditor.innerHTML = state.funds.map(renderSettingRow).join("");
  syncBudgetRowsForIncome();
  settingsDialog.showModal();
}

function resetToInitialState() {
  const confirmed = window.confirm("恢复初始状态会清空所有本地预算和记账数据。确定继续吗？");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  state = structuredClone(defaultState);
  settingsDialog.close();
  render();
  showToast("已恢复初始状态");
}

function renderSettingRow(fund) {
  const viewFund = toViewFund(fund);
  const mode = fund.mode === "amount" ? "amount" : "percent";
  const percentValue = mode === "percent" ? fund.percent : viewFund.incomePercent;
  const amountValue = mode === "amount" ? fund.amount : viewFund.allocated;

  return `
    <div class="budget-row" data-id="${fund.id}" data-spent="${fund.spent}" data-color="${fund.color}" data-mode="${mode}">
      <label class="budget-field budget-name-field">
        <span>用途</span>
        <input class="fund-name-input" maxlength="12" value="${escapeHtml(fund.name)}" required />
      </label>
      <label class="budget-field budget-category-field">
        <span>分类</span>
        <select class="fund-category-input">
          ${categories.map((category) => `<option value="${category.id}" ${category.id === fund.category ? "selected" : ""}>${category.label}</option>`).join("")}
        </select>
      </label>
      <label class="budget-field budget-percent-field">
        <span>比例 %</span>
        <input class="fund-percent-input" inputmode="decimal" min="0" step="any" type="number" value="${formatInputNumber(percentValue)}" />
      </label>
      <label class="budget-field budget-amount-field">
        <span>金额</span>
        <input class="fund-amount-input" inputmode="decimal" min="0" step="any" type="number" value="${formatInputNumber(amountValue)}" />
      </label>
      <button class="remove-button" type="button" aria-label="删除用途">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  `;
}

function handleBudgetEditorInput(event) {
  const row = event.target.closest(".budget-row");
  if (!row) return;

  if (event.target.classList.contains("fund-percent-input")) {
    row.dataset.mode = "percent";
    syncRowFromPercent(row);
  }

  if (event.target.classList.contains("fund-amount-input")) {
    row.dataset.mode = "amount";
    syncRowFromAmount(row);
  }

  if (event.target.classList.contains("fund-category-input")) {
    const category = getCategory(event.target.value);
    row.dataset.color = category.color;
  }

  updateSettingSummary();
}

function handleBudgetEditorClick(event) {
  const removeButton = event.target.closest(".remove-button");
  if (!removeButton) return;
  removeButton.closest(".budget-row").remove();
  updateSettingSummary();
}

function addSettingRow() {
  const index = budgetEditor.querySelectorAll(".budget-row").length;
  const category = categories[0];
  const fund = {
    id: createId(),
    name: `新用途 ${index + 1}`,
    category: category.id,
    mode: "percent",
    percent: 10,
    amount: 0,
    color: category.color,
    spent: 0
  };
  budgetEditor.insertAdjacentHTML("beforeend", renderSettingRow(fund));
  syncRowFromPercent(budgetEditor.lastElementChild);
  updateSettingSummary();
  budgetEditor.lastElementChild?.querySelector(".fund-name-input")?.select();
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
  const nextFunds = rows.map((row, index) => {
    const mode = row.dataset.mode === "amount" ? "amount" : "percent";
    const category = normalizeCategory(row.querySelector(".fund-category-input").value);
    const percent = Math.max(0, toMoney(row.querySelector(".fund-percent-input").value));
    const amount = Math.max(0, toMoney(row.querySelector(".fund-amount-input").value));

    return {
      id: row.dataset.id || createId(),
      name: row.querySelector(".fund-name-input").value.trim(),
      category,
      mode: mode === "amount" && amount > 0 ? "amount" : "percent",
      percent,
      amount,
      color: getCategory(category).color || row.dataset.color || colors[index % colors.length],
      spent: category === "daily" ? Math.max(0, toMoney(row.dataset.spent)) : 0
    };
  }).filter((fund) => fund.name && getFundAllocation(fund, income) > 0);

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

function syncBudgetRowsForIncome() {
  budgetEditor.querySelectorAll(".budget-row").forEach((row) => {
    if (row.dataset.mode === "amount") {
      syncRowFromAmount(row);
    } else {
      syncRowFromPercent(row);
    }
  });
  updateSettingSummary();
}

function syncRowFromPercent(row) {
  const income = toMoney(incomeInput.value);
  const percentInput = row.querySelector(".fund-percent-input");
  const amountInput = row.querySelector(".fund-amount-input");
  const percent = Math.max(0, toMoney(percentInput.value));
  amountInput.value = formatInputNumber((income * percent) / 100);
}

function syncRowFromAmount(row) {
  const income = toMoney(incomeInput.value);
  const percentInput = row.querySelector(".fund-percent-input");
  const amountInput = row.querySelector(".fund-amount-input");
  const amount = Math.max(0, toMoney(amountInput.value));
  percentInput.value = formatInputNumber(income > 0 ? (amount / income) * 100 : 0);
}

function updateSettingSummary() {
  const income = toMoney(incomeInput.value);
  const rows = [...budgetEditor.querySelectorAll(".budget-row")];
  const totalAmount = rows.reduce((total, row) => total + getRowAmount(row, income), 0);
  const percentTotal = income > 0 ? (totalAmount / income) * 100 : 0;
  percentSummary.textContent = `已分配 ${formatPercent(percentTotal)}`;
  amountSummary.textContent = `预算 ${formatMoney(totalAmount)}`;
}

function getMonthlyAverages(spent, remaining) {
  const now = new Date();
  const elapsedDays = Math.max(1, now.getDate());
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);

  return {
    spent: roundMoney(spent / elapsedDays),
    remaining: roundMoney(remaining / remainingDays)
  };
}

function getSummarySegments(fixedAllocated, savingAllocated, dailyAllocated) {
  const income = Math.max(0, state.income);
  if (income <= 0) return { fixed: 0, saving: 0, daily: 0 };

  let used = 0;
  const fixed = consumeSegment((fixedAllocated / income) * 100);
  const saving = consumeSegment((savingAllocated / income) * 100);
  const daily = consumeSegment((dailyAllocated / income) * 100);
  return { fixed, saving, daily };

  function consumeSegment(width) {
    const nextWidth = Math.max(0, Math.min(width, 100 - used));
    used += nextWidth;
    return nextWidth;
  }
}

function getRowAmount(row, income) {
  if (row.dataset.mode === "amount") {
    return Math.max(0, toMoney(row.querySelector(".fund-amount-input").value));
  }
  return Math.max(0, (income * toMoney(row.querySelector(".fund-percent-input").value)) / 100);
}

function toViewFund(fund) {
  const allocated = getFundAllocation(fund, state.income);
  const rawSpent = fund.category === "fixed" ? allocated : fund.category === "daily" ? fund.spent : 0;
  const spent = Math.min(allocated, Math.max(0, rawSpent));
  const remaining = Math.max(0, roundMoney(allocated - spent));
  const incomePercent = state.income > 0 ? (allocated / state.income) * 100 : 0;
  return { ...fund, allocated, spent, remaining, incomePercent };
}

function getFundAllocation(fund, income) {
  if (fund.mode === "amount") {
    return Math.max(0, toMoney(fund.amount));
  }
  return Math.max(0, roundMoney((income * toMoney(fund.percent)) / 100));
}

function toMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? roundMoney(number) : 0;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

function formatPlainMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
}

function formatPercent(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

function formatInputNumber(value) {
  const number = roundMoney(value);
  return Number.isInteger(number) ? String(number) : String(number);
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
