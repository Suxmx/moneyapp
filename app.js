const STORAGE_KEY = "moneyapp.budget.v2";
const LEGACY_STORAGE_KEY = "moneyapp.budget.v1";
const CLOUD_META_KEY = "moneyapp.cloud.meta";
const AUTO_SURPLUS_ID = "auto-surplus";
const presets = [20, 50, 100, 200];
const expenseCategories = [
  { id: "food", label: "吃饭", icon: "食" },
  { id: "traffic", label: "交通", icon: "行" },
  { id: "fun", label: "娱乐", icon: "乐" },
  { id: "shopping", label: "购物", icon: "购" },
  { id: "home", label: "日用", icon: "家" }
];
const detailPeriods = [
  { id: "day", label: "日" },
  { id: "week", label: "周" },
  { id: "month", label: "月" }
];

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
  history: [],
  settings: {
    detailPeriod: "day",
    groupDetailsByFund: false
  }
};

let state = loadState();
let cloudMeta = loadCloudMeta();
let activeFundId = null;
let activeSpentFundId = null;
let activeSpentMode = "spent";
let activeHistoryId = null;
let activeExpenseCategory = "";
let activeHistoryCategory = "";
let activeView = "budget";
let longPressTimer = null;
let historyLongPressTimer = null;
let longPressTriggered = false;
let historyLongPressTriggered = false;
let toastTimer = null;
let cloudModulePromise = null;
let cloudBusy = false;
let currentCloudUser = null;
const expandedDetailGroups = new Set();

const summaryPanel = document.querySelector("#summaryPanel");
const fundList = document.querySelector("#fundList");
const detailsView = document.querySelector("#detailsView");
const cloudView = document.querySelector("#cloudView");
const settingsView = document.querySelector("#settingsView");
const todaySpentAmount = document.querySelector("#todaySpentAmount");
const monthlySpentAmount = document.querySelector("#monthlySpentAmount");
const dailyAverageRemaining = document.querySelector("#dailyAverageRemaining");
const remainingDaysLabel = document.querySelector("#remainingDaysLabel");
const summaryFixed = document.querySelector("#summaryFixed");
const summarySaving = document.querySelector("#summarySaving");
const summaryDaily = document.querySelector("#summaryDaily");
const bottomTabs = document.querySelector("#bottomTabs");
const expenseDialog = document.querySelector("#expenseDialog");
const expenseForm = document.querySelector("#expenseForm");
const expenseTitle = document.querySelector("#expenseTitle");
const expenseAmount = document.querySelector("#expenseAmount");
const presetGrid = document.querySelector("#presetGrid");
const expenseCategoryGrid = document.querySelector("#expenseCategoryGrid");
const historyDialog = document.querySelector("#historyDialog");
const historyForm = document.querySelector("#historyForm");
const historyTitle = document.querySelector("#historyTitle");
const historyAmount = document.querySelector("#historyAmount");
const historyCategoryGrid = document.querySelector("#historyCategoryGrid");
const spentDialog = document.querySelector("#spentDialog");
const spentForm = document.querySelector("#spentForm");
const spentModeLabel = document.querySelector("#spentModeLabel");
const spentTitle = document.querySelector("#spentTitle");
const spentHint = document.querySelector("#spentHint");
const spentAmountLabel = document.querySelector("#spentAmountLabel");
const spentAmount = document.querySelector("#spentAmount");
const settingsForm = document.querySelector("#settingsForm");
const incomeInput = document.querySelector("#incomeInput");
const budgetEditor = document.querySelector("#budgetEditor");
const percentSummary = document.querySelector("#percentSummary");
const amountSummary = document.querySelector("#amountSummary");
const detailsGroupToggle = document.querySelector("#detailsGroupToggle");
const cloudForm = document.querySelector("#cloudForm");
const cloudEmail = document.querySelector("#cloudEmail");
const cloudPassword = document.querySelector("#cloudPassword");
const cloudAuth = document.querySelector("#cloudAuth");
const cloudPush = document.querySelector("#cloudPush");
const cloudPull = document.querySelector("#cloudPull");
const cloudSignOut = document.querySelector("#cloudSignOut");
const cloudStatus = document.querySelector("#cloudStatus");
const cloudAuthPanel = document.querySelector("#cloudAuthPanel");
const cloudSyncPanel = document.querySelector("#cloudSyncPanel");
const toast = document.querySelector("#toast");

document.querySelector("#addFund").addEventListener("click", addSettingRow);
document.querySelector("#resetState").addEventListener("click", resetToInitialState);
summaryPanel.addEventListener("click", toggleSummaryPanel);
summaryPanel.addEventListener("keydown", handleSummaryKeydown);
expenseForm.addEventListener("submit", saveExpense);
historyForm.addEventListener("submit", saveHistoryEdit);
spentForm.addEventListener("submit", saveSpentAmount);
spentDialog.addEventListener("close", () => {
  longPressTriggered = false;
});
settingsForm.addEventListener("submit", saveSettings);
cloudForm.addEventListener("submit", handleCloudAuth);
cloudPush.addEventListener("click", handleCloudPush);
cloudPull.addEventListener("click", handleCloudPull);
cloudSignOut.addEventListener("click", handleCloudSignOut);
detailsGroupToggle.addEventListener("change", handleDetailsGroupToggleChange);
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
detailsView.addEventListener("click", handleDetailsClick);
detailsView.addEventListener("contextmenu", handleHistoryContextMenu);
detailsView.addEventListener("pointerdown", startHistoryLongPress);
detailsView.addEventListener("pointermove", clearHistoryLongPress);
detailsView.addEventListener("pointerup", clearHistoryLongPress);
detailsView.addEventListener("pointerleave", clearHistoryLongPress);
detailsView.addEventListener("pointercancel", clearHistoryLongPress);
bottomTabs.addEventListener("click", handleTabClick);
document.addEventListener("gesturestart", preventGestureZoom, { passive: false });
document.addEventListener("gesturechange", preventGestureZoom, { passive: false });
document.addEventListener("gestureend", preventGestureZoom, { passive: false });
document.addEventListener("touchmove", preventMultiTouchZoom, { passive: false });

presetGrid.innerHTML = presets
  .map((amount) => `<button type="button" data-amount="${amount}">¥${amount}</button>`)
  .join("");
presetGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-amount]");
  if (!button) return;
  expenseAmount.value = button.dataset.amount;
  expenseAmount.focus();
});

expenseCategoryGrid.innerHTML = expenseCategories
  .map((category) => `<button type="button" data-expense-category="${category.id}" aria-label="${category.label}" aria-pressed="false">${category.icon}</button>`)
  .join("");
expenseCategoryGrid.addEventListener("click", handleExpenseCategoryClick);
historyCategoryGrid.innerHTML = expenseCategoryGrid.innerHTML;
historyCategoryGrid.addEventListener("click", handleHistoryCategoryClick);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      showToast("离线缓存暂时不可用");
    });
  });
}

renderCloudStatus();
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

function loadCloudMeta() {
  const defaultMeta = {
    clientUpdatedAt: null,
    lastSyncedAt: null,
    userId: null
  };

  try {
    const raw = localStorage.getItem(CLOUD_META_KEY);
    if (!raw) return defaultMeta;
    const meta = JSON.parse(raw);
    return { ...defaultMeta, ...meta };
  } catch {
    return defaultMeta;
  }
}

function normalizeState(input = {}) {
  const income = Math.max(0, toMoney(input.income));
  const funds = Array.isArray(input.funds) && input.funds.length
    ? input.funds.map((fund, index) => {
        const category = normalizeCategory(fund.category || inferLegacyCategory(fund));
        const mode = fund.mode === "amount" ? "amount" : "percent";
        const percent = Math.max(0, toMoney(fund.percent));
        const amount = Math.max(0, toMoney(fund.amount));
        const dailyLimit = Math.max(0, toMoney(fund.dailyLimit));
        const dailyLimitEnabled = category === "daily" && Boolean(fund.dailyLimitEnabled) && dailyLimit > 0;

        return {
          id: fund.id || createId(),
          name: String(fund.name || `用途 ${index + 1}`).slice(0, 12),
          category,
          mode: mode === "amount" && amount > 0 ? "amount" : "percent",
          percent,
          amount,
          color: fund.color || getCategory(category).color || colors[index % colors.length],
          spent: Math.max(0, toMoney(fund.spent)),
          dailyLimitEnabled,
          dailyLimit
        };
      })
    : structuredClone(defaultState.funds);

  return {
    income,
    funds,
    history: Array.isArray(input.history) ? input.history.map(normalizeHistoryItem).filter(Boolean) : [],
    settings: normalizeSettings(input.settings)
  };
}

function normalizeSettings(settings = {}) {
  return {
    detailPeriod: normalizeDetailPeriod(settings.detailPeriod),
    groupDetailsByFund: Boolean(settings.groupDetailsByFund)
  };
}

function normalizeHistoryItem(item = {}) {
  const kind = item.kind === "adjustment" ? "adjustment" : "expense";
  const amount = kind === "adjustment" ? toMoney(item.amount) : Math.max(0, toMoney(item.amount));
  if (kind === "expense" && amount <= 0) return null;
  if (kind === "adjustment" && amount === 0) return null;
  const createdAt = isValidDate(item.createdAt) ? item.createdAt : new Date().toISOString();
  const category = getExpenseCategory(item.category)?.id || "";

  return {
    id: item.id || createId(),
    fundId: String(item.fundId || ""),
    fundName: String(item.fundName || "支出").slice(0, 12),
    amount,
    category,
    kind,
    createdAt
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

function getExpenseCategory(categoryId) {
  return expenseCategories.find((category) => category.id === categoryId) || null;
}

function saveState(options = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (options.markChanged !== false) {
    markLocalChanged();
  }
}

function getStateSnapshot() {
  return structuredClone(state);
}

function replaceStateFromCloud(payload, record = {}) {
  state = normalizeState(payload || defaultState);
  const syncedAt = new Date().toISOString();
  cloudMeta = {
    ...cloudMeta,
    clientUpdatedAt: record.client_updated_at || record.updated_at || syncedAt,
    lastSyncedAt: syncedAt
  };
  saveState({ markChanged: false });
  saveCloudMeta();
  render();
  populateSettingsView();
}

function markLocalChanged() {
  cloudMeta = {
    ...cloudMeta,
    clientUpdatedAt: new Date().toISOString()
  };
  saveCloudMeta();
  renderCloudStatus();
}

function saveCloudMeta() {
  localStorage.setItem(CLOUD_META_KEY, JSON.stringify(cloudMeta));
}

function getClientUpdatedAt() {
  if (!cloudMeta.clientUpdatedAt) {
    markLocalChanged();
  }
  return cloudMeta.clientUpdatedAt;
}

function render() {
  const viewFunds = state.funds.map(toViewFund);
  const dailyFunds = viewFunds.filter((fund) => fund.category === "daily");
  const fixedAllocated = sum(viewFunds.filter((fund) => fund.category === "fixed"), "allocated");
  const savingAllocated = sum(viewFunds.filter((fund) => fund.category === "saving"), "allocated");
  const dailyAllocated = sum(dailyFunds, "allocated");
  const dailyRemaining = sum(dailyFunds, "remaining");
  const dailySpent = sum(dailyFunds, "spent");
  const average = getMonthlyAverages(dailyRemaining);
  const summarySegments = getSummarySegments(fixedAllocated, savingAllocated, dailyAllocated);

  todaySpentAmount.textContent = formatMoney(getTodaySpent());
  monthlySpentAmount.textContent = formatMoney(dailySpent);
  dailyAverageRemaining.textContent = formatMoney(average.remaining);
  remainingDaysLabel.textContent = `剩余${average.remainingDays} d`;
  summaryFixed.style.width = `${summarySegments.fixed}%`;
  summarySaving.style.width = `${summarySegments.saving}%`;
  summaryDaily.style.width = `${summarySegments.daily}%`;

  renderBudgetView(viewFunds);
  renderDetailsView();
  updateViewVisibility();
}

function renderBudgetView(viewFunds) {
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

function renderDetailsView() {
  const period = state.settings.detailPeriod;
  const sections = getHistoryPeriodSections(period);
  const bodyMarkup = sections.map((section) => renderHistoryPeriodSection(section, period)).join("");

  detailsView.innerHTML = `
    <div class="details-toolbar" aria-label="明细周期">
      <div class="period-tabs" role="group" aria-label="明细周期">
        ${detailPeriods.map((item) => `
          <button class="${item.id === period ? "active" : ""}" type="button" data-detail-period="${item.id}" aria-pressed="${item.id === period}">
            ${item.label}
          </button>
        `).join("")}
      </div>
    </div>
    <div class="details-body">
      ${bodyMarkup || '<div class="empty-state compact">暂无明细</div>'}
    </div>
  `;
}

function renderHistoryPeriodSection(section, period) {
  const itemsMarkup = state.settings.groupDetailsByFund
    ? renderGroupedHistoryItems(section.items, section.key, period)
    : renderHistoryList(section.items, period);

  return `
    <section class="history-period-section" data-period-key="${escapeHtml(section.key)}">
      <div class="history-period-heading">
        <h2>${escapeHtml(section.title)}</h2>
        <span>${formatMoney(Math.abs(section.total))}</span>
      </div>
      <div class="history-period-body">
        ${itemsMarkup}
      </div>
    </section>
  `;
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
  const displayAmount = fund.category === "fixed"
    ? fund.allocated
    : fund.dailyLimitEnabled
      ? fund.dailyLimitRemaining
      : fund.remaining;
  const progressText = `${formatPlainMoney(fund.remaining)}/${formatPlainMoney(fund.allocated)}`;
  const dailyLimitMarkup = fund.dailyLimitEnabled ? `
      <div class="fund-day-track" aria-hidden="true">
        <span style="width: ${fund.dailyLimitRemainingPercent}%; background: ${category.color}"></span>
      </div>
  ` : "";
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
      ${dailyLimitMarkup}
      ${progressMarkup}
    </button>
  `;
}

function renderHistoryItem(item, period = "full") {
  const category = getExpenseCategory(item.category);
  const categoryMarkup = category ? `<span class="history-icon" aria-label="${category.label}">${category.icon}</span>` : "";

  return `
    <article class="history-item history-item-${item.kind}" data-id="${item.id}">
      <div class="history-main">
        ${categoryMarkup}
        <div>
          <strong>${escapeHtml(item.fundName)}</strong>
          <time datetime="${escapeHtml(item.createdAt)}">${formatHistoryTime(item.createdAt, period)}</time>
        </div>
      </div>
      <span class="history-amount">${formatHistoryAmount(item.amount)}</span>
    </article>
  `;
}

function renderHistoryList(items, period = "full") {
  return items.map((item) => renderHistoryItem(item, period)).join("");
}

function renderGroupedHistoryItems(items, sectionKey = "", period = "full") {
  return groupHistoryItems(items, sectionKey).map((group) => renderHistoryGroup(group, period)).join("");
}

function renderHistoryGroup(group, period = "full") {
  const expanded = expandedDetailGroups.has(group.key);
  const childMarkup = expanded ? `<div class="history-sublist">${group.items.map((item) => renderHistoryItem(item, period)).join("")}</div>` : "";

  return `
    <section class="history-group" data-group-key="${escapeHtml(group.key)}">
      <article class="history-group-card ${expanded ? "expanded" : ""}" role="button" tabindex="0" aria-expanded="${expanded}">
        <div class="history-main">
          <span class="history-group-dot" style="--fund-color: ${group.color}"></span>
          <div>
            <strong>${escapeHtml(group.name)}</strong>
          </div>
        </div>
        <span class="history-amount">${formatHistoryAmount(group.total)}</span>
      </article>
      ${childMarkup}
    </section>
  `;
}

function handleTabClick(event) {
  const button = event.target.closest(".tab-button[data-view]");
  if (!button) return;
  activeView = button.dataset.view;
  if (activeView === "settings") {
    populateSettingsView();
  }
  if (activeView === "cloud") {
    refreshCloudSession({ silent: true });
  }
  updateViewVisibility();
}

function updateViewVisibility() {
  fundList.hidden = activeView !== "budget";
  detailsView.hidden = activeView !== "details";
  cloudView.hidden = activeView !== "cloud";
  settingsView.hidden = activeView !== "settings";
  summaryPanel.hidden = activeView !== "budget";
  document.querySelectorAll(".tab-button[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === activeView);
  });
}

function toggleSummaryPanel() {
  const expanded = !summaryPanel.classList.contains("expanded");
  summaryPanel.classList.toggle("expanded", expanded);
  summaryPanel.setAttribute("aria-expanded", String(expanded));
}

function handleSummaryKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  toggleSummaryPanel();
}

function handleDetailsClick(event) {
  if (historyLongPressTriggered) {
    historyLongPressTriggered = false;
    return;
  }

  const periodButton = event.target.closest("button[data-detail-period]");
  if (periodButton) {
    const nextPeriod = normalizeDetailPeriod(periodButton.dataset.detailPeriod);
    if (nextPeriod !== state.settings.detailPeriod) {
      state.settings = { ...state.settings, detailPeriod: nextPeriod };
      expandedDetailGroups.clear();
      saveState();
      render();
    }
    return;
  }

  if (event.target.closest(".history-item")) return;

  const group = event.target.closest(".history-group");
  if (!group) return;
  const key = group.dataset.groupKey;
  if (!key) return;
  if (expandedDetailGroups.has(key)) {
    expandedDetailGroups.delete(key);
  } else {
    expandedDetailGroups.add(key);
  }
  renderDetailsView();
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
    if (fund.dailyLimitEnabled) {
      openDailyLimitAdjustment(fund.id);
    } else {
      openSpentAdjustment(fund.id);
    }
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

function handleHistoryContextMenu(event) {
  const item = getHistoryItemFromEvent(event);
  if (!item) return;
  event.preventDefault();
}

function startHistoryLongPress(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const item = getHistoryItemFromEvent(event);
  if (!item) return;

  clearHistoryLongPress();
  historyLongPressTriggered = false;
  historyLongPressTimer = window.setTimeout(() => {
    historyLongPressTriggered = true;
    openHistoryEdit(item.id);
  }, 620);
}

function clearHistoryLongPress() {
  clearTimeout(historyLongPressTimer);
  historyLongPressTimer = null;
}

function getHistoryItemFromEvent(event) {
  const card = event.target.closest(".history-item");
  if (!card) return null;
  return state.history.find((item) => item.id === card.dataset.id) || null;
}

function openExpense(fundId) {
  const fund = state.funds.find((item) => item.id === fundId);
  if (!fund || fund.category !== "daily") return;

  activeFundId = fundId;
  activeExpenseCategory = "";
  expenseTitle.textContent = fund.name;
  expenseAmount.value = "";
  renderExpenseCategorySelection();
  expenseDialog.showModal();
  requestAnimationFrame(() => expenseAmount.focus());
}

function handleExpenseCategoryClick(event) {
  const button = event.target.closest("button[data-expense-category]");
  if (!button) return;
  const nextCategory = button.dataset.expenseCategory;
  activeExpenseCategory = activeExpenseCategory === nextCategory ? "" : nextCategory;
  renderExpenseCategorySelection();
}

function renderExpenseCategorySelection() {
  expenseCategoryGrid.querySelectorAll("button[data-expense-category]").forEach((button) => {
    const selected = button.dataset.expenseCategory === activeExpenseCategory;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function openHistoryEdit(historyId) {
  const item = state.history.find((historyItem) => historyItem.id === historyId);
  if (!item) return;

  activeHistoryId = historyId;
  activeHistoryCategory = item.category || "";
  historyTitle.textContent = item.fundName;
  historyAmount.value = formatInputNumber(item.amount);
  renderHistoryCategorySelection();
  historyDialog.showModal();
  requestAnimationFrame(() => historyAmount.select());
}

function handleHistoryCategoryClick(event) {
  const button = event.target.closest("button[data-expense-category]");
  if (!button) return;
  const nextCategory = button.dataset.expenseCategory;
  activeHistoryCategory = activeHistoryCategory === nextCategory ? "" : nextCategory;
  renderHistoryCategorySelection();
}

function renderHistoryCategorySelection() {
  historyCategoryGrid.querySelectorAll("button[data-expense-category]").forEach((button) => {
    const selected = button.dataset.expenseCategory === activeHistoryCategory;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function openSpentAdjustment(fundId) {
  const fund = state.funds.find((item) => item.id === fundId);
  if (!fund || fund.category !== "daily") return;

  const viewFund = toViewFund(fund);
  activeSpentMode = "spent";
  activeSpentFundId = fundId;
  spentModeLabel.textContent = "调整已用";
  spentTitle.textContent = fund.name;
  spentHint.textContent = `当前已用 ${formatMoney(viewFund.spent)}，总额 ${formatMoney(viewFund.allocated)}。`;
  spentAmountLabel.textContent = "已用金额";
  spentAmount.value = formatInputNumber(viewFund.spent);
  spentDialog.showModal();
  requestAnimationFrame(() => spentAmount.select());
}

function openDailyLimitAdjustment(fundId) {
  const fund = state.funds.find((item) => item.id === fundId);
  if (!fund || fund.category !== "daily") return;

  activeSpentMode = "limit";
  activeSpentFundId = fundId;
  spentModeLabel.textContent = "调整限额";
  spentTitle.textContent = fund.name;
  spentHint.textContent = `今日已用 ${formatMoney(getTodaySpentByFund(fund.id))}。`;
  spentAmountLabel.textContent = "每日限额";
  spentAmount.value = formatInputNumber(fund.dailyLimit || 0);
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
  if (viewFund.dailyLimitEnabled && amount > viewFund.dailyLimitRemaining) {
    showToast("金额超过今日限额");
    return;
  }

  fund.spent = roundMoney(fund.spent + amount);
  state.history.unshift({
    id: createId(),
    fundId: fund.id,
    fundName: fund.name,
    amount,
    category: activeExpenseCategory,
    kind: "expense",
    createdAt: new Date().toISOString()
  });
  state.history = state.history.slice(0, 80);
  saveState();
  expenseDialog.close();
  render();
  showToast(`${fund.name} 已记 ${formatMoney(amount)}`);
}

function saveHistoryEdit(event) {
  event.preventDefault();
  const submitter = event.submitter;
  if (submitter?.value === "cancel") {
    historyDialog.close();
    return;
  }
  if (submitter?.value === "delete") {
    deleteHistoryItem(activeHistoryId);
    return;
  }

  const item = state.history.find((historyItem) => historyItem.id === activeHistoryId);
  const fund = item ? state.funds.find((fundItem) => fundItem.id === item.fundId) : null;
  if (!item || !fund || fund.category !== "daily") {
    showToast("明细不可修改");
    return;
  }

  const nextAmount = item.kind === "adjustment"
    ? toMoney(historyAmount.value)
    : Math.max(0, toMoney(historyAmount.value));
  if ((item.kind === "expense" && nextAmount <= 0) || (item.kind === "adjustment" && nextAmount === 0)) {
    showToast("请输入有效金额");
    return;
  }

  const allocated = getFundAllocation(fund, state.income);
  const nextSpent = roundMoney(toMoney(fund.spent) - item.amount + nextAmount);
  if (nextSpent < 0) {
    showToast("已用金额不能小于 0");
    return;
  }
  if (nextSpent > allocated) {
    showToast("金额超过该用途总额");
    return;
  }

  fund.spent = nextSpent;
  item.amount = nextAmount;
  item.category = activeHistoryCategory;
  item.fundName = fund.name;
  saveState();
  historyDialog.close();
  render();
  showToast("明细已更新");
}

function deleteHistoryItem(historyId) {
  const index = state.history.findIndex((historyItem) => historyItem.id === historyId);
  if (index < 0) {
    showToast("明细不存在");
    return;
  }
  const item = state.history[index];
  const confirmed = window.confirm("删除这条明细吗？");
  if (!confirmed) return;

  const fund = state.funds.find((fundItem) => fundItem.id === item.fundId);
  if (fund?.category === "daily") {
    fund.spent = Math.max(0, roundMoney(toMoney(fund.spent) - item.amount));
  }
  state.history.splice(index, 1);
  activeHistoryId = null;
  saveState();
  historyDialog.close();
  render();
  showToast("明细已删除");
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
  if (activeSpentMode === "limit") {
    if (!fund || fund.category !== "daily" || amount <= 0) {
      showToast("请输入有效限额");
      return;
    }

    fund.dailyLimitEnabled = true;
    fund.dailyLimit = amount;
    saveState();
    spentDialog.close();
    render();
    showToast(`${fund.name} 日限已更新`);
    return;
  }

  if (!fund || fund.category !== "daily" || amount < 0) {
    showToast("请输入有效金额");
    return;
  }

  const viewFund = toViewFund(fund);
  if (amount > viewFund.allocated) {
    showToast("已用金额不能超过总额");
    return;
  }

  const delta = roundMoney(amount - viewFund.spent);
  fund.spent = roundMoney(amount);
  if (delta !== 0) {
    state.history.unshift({
      id: createId(),
      fundId: fund.id,
      fundName: fund.name,
      amount: delta,
      category: "",
      kind: "adjustment",
      createdAt: new Date().toISOString()
    });
    state.history = state.history.slice(0, 80);
  }
  saveState();
  spentDialog.close();
  render();
  showToast(`${fund.name} 已用更新为 ${formatMoney(amount)}`);
}

function populateSettingsView() {
  incomeInput.value = state.income;
  detailsGroupToggle.checked = state.settings.groupDetailsByFund;
  budgetEditor.innerHTML = state.funds.filter((fund) => fund.id !== AUTO_SURPLUS_ID).map(renderSettingRow).join("");
  budgetEditor.querySelectorAll(".budget-row").forEach(updateBudgetRowLimitState);
  syncBudgetRowsForIncome();
}

function handleDetailsGroupToggleChange() {
  state.settings = {
    ...state.settings,
    groupDetailsByFund: detailsGroupToggle.checked
  };
  expandedDetailGroups.clear();
  saveState();
  render();
}

function resetToInitialState() {
  const confirmed = window.confirm("恢复初始状态会清空所有本地预算和记账数据。确定继续吗？");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  state = structuredClone(defaultState);
  markLocalChanged();
  populateSettingsView();
  render();
  showToast("已恢复初始状态");
}

function renderSettingRow(fund) {
  const viewFund = toViewFund(fund);
  const mode = fund.mode === "amount" ? "amount" : "percent";
  const percentValue = mode === "percent" ? fund.percent : viewFund.incomePercent;
  const amountValue = mode === "amount" ? fund.amount : viewFund.allocated;
  const isDaily = fund.category === "daily";
  const dailyLimitEnabled = isDaily && fund.dailyLimitEnabled && fund.dailyLimit > 0;

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
      <label class="daily-limit-toggle">
        <input class="fund-daily-limit-toggle" type="checkbox" ${dailyLimitEnabled ? "checked" : ""} ${isDaily ? "" : "disabled"} />
        <span>日限</span>
      </label>
      <label class="budget-field budget-limit-field">
        <span>日限额</span>
        <input class="fund-daily-limit-input" inputmode="decimal" min="0" step="any" type="number" value="${fund.dailyLimit > 0 ? formatInputNumber(fund.dailyLimit) : ""}" ${dailyLimitEnabled ? "" : "disabled"} />
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
    updateBudgetRowLimitState(row);
  }

  if (event.target.classList.contains("fund-daily-limit-toggle")) {
    updateBudgetRowLimitState(row);
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
    spent: 0,
    dailyLimitEnabled: false,
    dailyLimit: 0
  };
  budgetEditor.insertAdjacentHTML("beforeend", renderSettingRow(fund));
  updateBudgetRowLimitState(budgetEditor.lastElementChild);
  syncRowFromPercent(budgetEditor.lastElementChild);
  updateSettingSummary();
  budgetEditor.lastElementChild?.querySelector(".fund-name-input")?.select();
}

function saveSettings(event) {
  event.preventDefault();

  const income = toMoney(incomeInput.value);
  const rows = [...budgetEditor.querySelectorAll(".budget-row")];
  let hasInvalidDailyLimit = false;
  const nextFunds = rows.map((row, index) => {
    const mode = row.dataset.mode === "amount" ? "amount" : "percent";
    const category = normalizeCategory(row.querySelector(".fund-category-input").value);
    const percent = Math.max(0, toMoney(row.querySelector(".fund-percent-input").value));
    const amount = Math.max(0, toMoney(row.querySelector(".fund-amount-input").value));
    const dailyLimitChecked = row.querySelector(".fund-daily-limit-toggle").checked;
    const dailyLimit = Math.max(0, toMoney(row.querySelector(".fund-daily-limit-input").value));
    const dailyLimitEnabled = category === "daily" && dailyLimitChecked;
    if (dailyLimitEnabled && dailyLimit <= 0) {
      hasInvalidDailyLimit = true;
    }

    return {
      id: row.dataset.id || createId(),
      name: row.querySelector(".fund-name-input").value.trim(),
      category,
      mode: mode === "amount" && amount > 0 ? "amount" : "percent",
      percent,
      amount,
      color: getCategory(category).color || row.dataset.color || colors[index % colors.length],
      spent: category === "daily" ? Math.max(0, toMoney(row.dataset.spent)) : 0,
      dailyLimitEnabled: dailyLimitEnabled && dailyLimit > 0,
      dailyLimit: dailyLimitEnabled ? dailyLimit : 0
    };
  }).filter((fund) => fund.id !== AUTO_SURPLUS_ID && fund.name && getFundAllocation(fund, income) > 0);

  if (hasInvalidDailyLimit) {
    showToast("请输入日限额");
    return;
  }

  if (income <= 0) {
    showToast("收入需要大于 0");
    return;
  }

  const allocatedAmount = nextFunds.reduce((total, fund) => total + getFundAllocation(fund, income), 0);
  if (allocatedAmount > income + 0.01) {
    showToast("分配不能超过 100%");
    return;
  }

  const remainder = roundMoney(income - allocatedAmount);
  if (remainder > 0) {
    nextFunds.push(createSurplusFund(remainder));
  }

  state = {
    ...state,
    income,
    funds: nextFunds,
    settings: {
      ...state.settings,
      groupDetailsByFund: detailsGroupToggle.checked
    }
  };
  saveState();
  render();
  populateSettingsView();
  showToast("预算已更新");
}

async function handleCloudAuth(event) {
  event.preventDefault();
  const email = cloudEmail.value.trim();
  const password = cloudPassword.value;
  if (!email || !password) {
    showToast("请输入邮箱和密码");
    return;
  }

  await runCloudAction(async (cloud) => {
    const result = await cloud.signUpOrIn(email, password);
    if (result.needsConfirmation) {
      renderCloudStatus(null, "待确认");
      showToast("请先确认邮箱");
      return;
    }

    const user = await cloud.getSessionUser();
    cloudMeta = { ...cloudMeta, userId: user?.id || result.user?.id || null };
    saveCloudMeta();
    renderCloudStatus(user);
    cloudPassword.value = "";
    showToast("已登录");
  });
}

async function handleCloudPush() {
  await runCloudAction(async (cloud) => {
    const user = await ensureCloudUser(cloud);
    const clientUpdatedAt = getClientUpdatedAt();
    await cloud.pushState(getStateSnapshot(), clientUpdatedAt);
    cloudMeta = {
      ...cloudMeta,
      userId: user.id,
      lastSyncedAt: new Date().toISOString()
    };
    saveCloudMeta();
    renderCloudStatus(user);
    showToast("已同步到云端");
  });
}

async function handleCloudPull() {
  const confirmed = window.confirm("从云端恢复会覆盖本地数据。确定继续吗？");
  if (!confirmed) return;

  await runCloudAction(async (cloud) => {
    const user = await ensureCloudUser(cloud);
    const record = await cloud.pullState();
    if (!record?.payload) {
      cloudMeta = { ...cloudMeta, userId: user.id };
      saveCloudMeta();
      renderCloudStatus(user);
      showToast("云端暂无数据");
      return;
    }

    cloudMeta = { ...cloudMeta, userId: user.id };
    replaceStateFromCloud(record.payload, record);
    renderCloudStatus(user);
    showToast("已从云端恢复");
  });
}

async function handleCloudSignOut() {
  await runCloudAction(async (cloud) => {
    await cloud.signOut();
    cloudMeta = { ...cloudMeta, userId: null };
    saveCloudMeta();
    renderCloudStatus(null);
    showToast("已退出登录");
  });
}

async function refreshCloudSession(options = {}) {
  try {
    const cloud = await getCloudModule();
    if (!cloud.isCloudConfigured()) {
      renderCloudStatus(null, "未配置");
      return null;
    }

    const user = await cloud.getSessionUser();
    cloudMeta = { ...cloudMeta, userId: user?.id || null };
    saveCloudMeta();
    renderCloudStatus(user);
    return user;
  } catch (error) {
    renderCloudStatus(null, "不可用");
    if (!options.silent) {
      showToast(toFriendlyError(error));
    }
    return null;
  }
}

async function runCloudAction(action) {
  setCloudBusy(true);
  try {
    const cloud = await getCloudModule();
    if (!cloud.isCloudConfigured()) {
      throw new Error("请先配置 Supabase");
    }
    await action(cloud);
  } catch (error) {
    showToast(toFriendlyError(error));
  } finally {
    setCloudBusy(false);
  }
}

async function ensureCloudUser(cloud) {
  const user = await cloud.getSessionUser();
  if (!user) throw new Error("请先登录");
  return user;
}

function getCloudModule() {
  if (!cloudModulePromise) {
    cloudModulePromise = import("./supabase-sync.js").catch((error) => {
      cloudModulePromise = null;
      throw error;
    });
  }
  return cloudModulePromise;
}

function setCloudBusy(isBusy) {
  cloudBusy = isBusy;
  [cloudAuth, cloudPush, cloudPull, cloudSignOut].forEach((button) => {
    button.disabled = cloudBusy;
  });
}

function renderCloudStatus(user, override = "") {
  if (override) {
    currentCloudUser = null;
    cloudStatus.textContent = override;
    setCloudSignedIn(false);
    return;
  }

  if (user !== undefined) {
    currentCloudUser = user || null;
  }

  if (currentCloudUser?.email) {
    cloudStatus.textContent = cloudMeta.lastSyncedAt ? `已同步 ${formatCloudTime(cloudMeta.lastSyncedAt)}` : "已登录";
    setCloudSignedIn(true);
    return;
  }

  cloudStatus.textContent = "未登录";
  setCloudSignedIn(false);
}

function setCloudSignedIn(isSignedIn) {
  cloudAuthPanel.hidden = isSignedIn;
  cloudSyncPanel.hidden = !isSignedIn;
}

function toFriendlyError(error) {
  const message = error?.message || "云端同步失败";
  if (message.includes("Failed to fetch") || message.includes("Importing")) return "同步模块暂不可用";
  return message;
}

function createSurplusFund(amount) {
  const category = getCategory("saving");
  return {
    id: AUTO_SURPLUS_ID,
    name: "结余",
    category: "saving",
    mode: "amount",
    percent: 0,
    amount,
    color: category.color,
    spent: 0,
    dailyLimitEnabled: false,
    dailyLimit: 0
  };
}

function syncBudgetRowsForIncome() {
  budgetEditor.querySelectorAll(".budget-row").forEach((row) => {
    updateBudgetRowLimitState(row);
    if (row.dataset.mode === "amount") {
      syncRowFromAmount(row);
    } else {
      syncRowFromPercent(row);
    }
  });
  updateSettingSummary();
}

function updateBudgetRowLimitState(row) {
  if (!row) return;
  const categoryInput = row.querySelector(".fund-category-input");
  const toggle = row.querySelector(".fund-daily-limit-toggle");
  const amountInput = row.querySelector(".fund-daily-limit-input");
  if (!categoryInput || !toggle || !amountInput) return;

  const isDaily = categoryInput.value === "daily";
  toggle.disabled = !isDaily;
  if (!isDaily) {
    toggle.checked = false;
  }
  amountInput.disabled = !isDaily || !toggle.checked;
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

function getMonthlyAverages(remaining) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);

  return {
    remaining: roundMoney(remaining / remainingDays),
    remainingDays
  };
}

function getTodaySpent() {
  const today = new Date();
  const spent = state.history.reduce((total, item) => {
    const date = new Date(item.createdAt);
    return isSameLocalDate(date, today) ? total + toMoney(item.amount) : total;
  }, 0);
  return Math.max(0, roundMoney(spent));
}

function getTodaySpentByFund(fundId) {
  const today = new Date();
  const spent = state.history.reduce((total, item) => {
    const date = new Date(item.createdAt);
    return item.fundId === fundId && isSameLocalDate(date, today) ? total + toMoney(item.amount) : total;
  }, 0);
  return Math.max(0, roundMoney(spent));
}

function getHistoryPeriodSections(period) {
  const normalized = normalizeDetailPeriod(period);
  const sectionMap = new Map();
  const items = [...state.history].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  items.forEach((item) => {
    const meta = getHistoryPeriodMeta(item.createdAt, normalized);
    if (!meta) return;
    const section = sectionMap.get(meta.key) || {
      ...meta,
      total: 0,
      items: []
    };
    section.total = roundMoney(section.total + item.amount);
    section.items.push(item);
    sectionMap.set(meta.key, section);
  });

  return [...sectionMap.values()];
}

function getHistoryPeriodMeta(value, period) {
  const date = new Date(value);
  if (!isValidDate(date)) return null;

  if (period === "week") {
    const start = startOfLocalWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      key: `week-${toDateKey(start)}`,
      title: `第${getWeekNumber(start)}周 · ${formatShortDate(start)}-${formatShortDate(end)}`
    };
  }

  if (period === "month") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const now = new Date();
    const title = date.getFullYear() === now.getFullYear()
      ? `${date.getMonth() + 1}月`
      : `${date.getFullYear()}年${date.getMonth() + 1}月`;
    return {
      key: `month-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      title
    };
  }

  return {
    key: `day-${toDateKey(date)}`,
    title: formatDayHeading(date)
  };
}

function groupHistoryItems(items, sectionKey = "") {
  const groupMap = new Map();
  items.forEach((item) => {
    const fund = state.funds.find((fundItem) => fundItem.id === item.fundId);
    const fundKey = item.fundId || item.fundName || "unknown";
    const key = `${sectionKey}|${fundKey}`;
    const existing = groupMap.get(key) || {
      key,
      name: fund?.name || item.fundName || "支出",
      color: fund?.color || getCategory(fund?.category || "daily").color,
      total: 0,
      items: []
    };
    existing.total = roundMoney(existing.total + item.amount);
    existing.items.push(item);
    groupMap.set(key, existing);
  });
  return [...groupMap.values()];
}

function normalizeDetailPeriod(period) {
  return detailPeriods.some((item) => item.id === period) ? period : "day";
}

function startOfLocalWeek(value) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function toDateKey(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekNumber(value) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - firstDay) / 86400000);
  return Math.ceil((days + firstDay.getDay() + 1) / 7);
}

function formatDayHeading(value) {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (isSameLocalDate(value, now)) return "今天";
  if (isSameLocalDate(value, yesterday)) return "昨天";
  return value.getFullYear() === now.getFullYear()
    ? `${value.getMonth() + 1}月${value.getDate()}日`
    : `${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日`;
}

function formatShortDate(value) {
  return `${value.getMonth() + 1}/${value.getDate()}`;
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
  const dailyLimitEnabled = fund.category === "daily" && fund.dailyLimitEnabled && fund.dailyLimit > 0;
  const todaySpent = dailyLimitEnabled ? getTodaySpentByFund(fund.id) : 0;
  const dailyLimitRemainingRaw = dailyLimitEnabled ? Math.max(0, roundMoney(fund.dailyLimit - todaySpent)) : 0;
  const dailyLimitRemaining = dailyLimitEnabled ? Math.min(remaining, dailyLimitRemainingRaw) : 0;
  const dailyLimitRemainingPercent = dailyLimitEnabled
    ? Math.max(0, Math.min(100, (dailyLimitRemaining / fund.dailyLimit) * 100))
    : 0;
  return {
    ...fund,
    allocated,
    spent,
    remaining,
    incomePercent,
    dailyLimitEnabled,
    todaySpent,
    dailyLimitRemaining,
    dailyLimitRemainingPercent
  };
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

function formatHistoryAmount(value) {
  return value < 0 ? `+${formatMoney(Math.abs(value))}` : `-${formatMoney(value)}`;
}

function formatHistoryTime(value, period = "full") {
  const date = new Date(value);
  if (!isValidDate(value)) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  if (period === "day") return `${hours}:${minutes}`;
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatCloudTime(value) {
  const date = new Date(value);
  if (!isValidDate(value)) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatInputNumber(value) {
  const number = roundMoney(value);
  return Number.isInteger(number) ? String(number) : String(number);
}

function isValidDate(value) {
  return !Number.isNaN(new Date(value).getTime());
}

function isSameLocalDate(left, right) {
  return isValidDate(left) &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
}

function preventGestureZoom(event) {
  event.preventDefault();
}

function preventMultiTouchZoom(event) {
  if (event.touches?.length > 1) {
    event.preventDefault();
  }
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
