const STORAGE_KEY = "horizon-tasks";
const COLUMNS = ["today", "week", "month", "year", "someday"];

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const columnSelect = document.getElementById("task-column");

const expandedIds = new Set();
const editingIds = new Set();

const loadTasks = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return parsed.map((t) =>
            "content" in t
                ? t
                : {
                    id: t.id,
                    column: t.column,
                    done: t.done,
                    content: `# ${t.text ?? ""}` + (t.notes ? `\n\n${t.notes}` : ""),
                }
        );
    } catch {
        return [];
    }
};

const saveTasks = (tasks) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

let tasks = loadTasks();

const pad2 = (n) => String(n).padStart(2, "0");

const formatDateYMD = (date) =>
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;

const formatDateISO = (date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const getHorizonLine = (column, date) => {
    switch (column) {
        case "today":
            return `D${formatDateYMD(date)}`;
        case "week":
            return `W${pad2(getISOWeek(date))}`;
        case "month":
            return `M${pad2(date.getMonth() + 1)}`;
        case "year":
            return `Y${date.getFullYear()}`;
        default:
            return "S";
    }
};

const addTask = (text, column) => {
    const now = new Date();
    const meta = `created: ${formatDateISO(now)}\nhorizon: ${getHorizonLine(column, now)}`;

    const task = {
        id: crypto.randomUUID(),
        column,
        done: false,
        content: `# ${text}\n\n${meta}`,
    };
    tasks.push(task);
    saveTasks(tasks);
    render();
    return task.id;
};

const extractTitle = (content) => {
    const match = (content || "").match(/^#[ \t]+(.+)$/m);
    if (match) return match[1].trim();
    const firstLine = (content || "").split("\n").find((l) => l.trim().length > 0);
    return firstLine ? firstLine.trim() : "Sans titre";
};

const extractBody = (content) => {
    const match = (content || "").match(/^#[ \t]+.*\r?\n?/);
    if (!match) return content || "";
    return content.slice(match[0].length).replace(/^\r?\n/, "");
};

const escapeHtml = (str) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const renderMarkdown = (text) => {
    if (!text.trim()) return "";
    return escapeHtml(text)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\n/g, "<br>");
};

const createTaskElement = (task) => {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " done" : "");
    li.dataset.id = task.id;

    const row = document.createElement("div");
    row.className = "task-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", "Marquer comme terminée");

    const label = document.createElement("span");
    label.textContent = extractTitle(task.content);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn icon sm flat delete-btn";
    deleteBtn.setAttribute("aria-label", "Supprimer la tâche");
    deleteBtn.innerHTML = '<iconify-icon icon="mdi:close"></iconify-icon>';

    row.append(checkbox, label);

    const body = extractBody(task.content);

    row.append(deleteBtn);
    li.append(row);

    if (expandedIds.has(task.id)) {
        const details = document.createElement("div");
        details.className = "task-details";

        if (editingIds.has(task.id)) {
            const textarea = document.createElement("textarea");
            textarea.className = "task-notes";
            textarea.placeholder = "# Titre\n\nDétails (markdown)…";
            textarea.value = task.content || "";
            details.append(textarea);
        } else {
            const hasBody = body.trim().length > 0;
            const preview = document.createElement("div");
            preview.className = "task-preview" + (hasBody ? "" : " empty");
            if (hasBody) {
                preview.innerHTML = renderMarkdown(body);
            } else {
                preview.textContent = "Ajouter une note…";
            }
            details.append(preview);
        }

        li.append(details);
    }

    return li;
};

const render = () => {
    for (const column of COLUMNS) {
        const list = document.querySelector(`[data-list="${column}"]`);
        const count = document.querySelector(`[data-count="${column}"]`);
        const columnTasks = tasks.filter((t) => t.column === column);

        list.replaceChildren(...columnTasks.map(createTaskElement));
        if (count) count.textContent = columnTasks.length;
    }
};

const getISOWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const updateDateMeta = () => {
    const now = new Date();

    document.querySelector('[data-meta="today"]').textContent =
        now.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) +
        " · " +
        now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    document.querySelector('[data-meta="week"]').textContent = `S${getISOWeek(now)}`;

    const month = now.toLocaleDateString("fr-FR", { month: "long" });
    document.querySelector('[data-meta="month"]').textContent =
        month.charAt(0).toUpperCase() + month.slice(1);

    document.querySelector('[data-meta="year"]').textContent = now.getFullYear();
};

updateDateMeta();
setInterval(updateDateMeta, 30000);

/* ── Plan IA ─────────────────────────────────────────────────────────── */
const AI_KEY_STORAGE = "horizon-ai-key";
const AI_MODEL = "claude-haiku-4-5-20251001";

const FR_MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const FR_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const getAiKey = () => localStorage.getItem(AI_KEY_STORAGE);

const promptAiKey = () => {
    const key = window.prompt("Clé API Anthropic (stockée en local dans ce navigateur) :", getAiKey() || "");
    if (key === null) return;
    if (key.trim()) localStorage.setItem(AI_KEY_STORAGE, key.trim());
    else localStorage.removeItem(AI_KEY_STORAGE);
};

const getRemainingPeriods = (column, date) => {
    switch (column) {
        case "year": {
            const months = [];
            for (let m = date.getMonth(); m <= 11; m++) months.push(FR_MONTHS[m]);
            return months;
        }
        case "month": {
            const weeks = [];
            const monthIdx = date.getMonth();
            const cursor = new Date(date);
            while (cursor.getMonth() === monthIdx) {
                weeks.push(`Semaine du ${pad2(cursor.getDate())}/${pad2(monthIdx + 1)}`);
                cursor.setDate(cursor.getDate() + 7);
            }
            return weeks;
        }
        case "week": {
            const days = [];
            const dow = (date.getDay() + 6) % 7;
            for (let i = dow; i <= 6; i++) days.push(FR_DAYS[i]);
            return days;
        }
        default:
            return null;
    }
};

const buildAiPrompt = (title, column, date) => {
    const periods = getRemainingPeriods(column, date);
    if (periods && periods.length) {
        return `Tâche : "${title}". Génère une liste markdown de checkboxes, une ligne par élément suivant, ` +
            `format "- [ ] Nom - thématique courte (2-5 mots)" :\n${periods.join("\n")}\n` +
            `Réponds uniquement avec la liste, sans texte avant/après.`;
    }
    return `Tâche : "${title}". Génère une courte liste markdown de checkboxes (3 à 6 étapes) pour accomplir ` +
        `cette tâche, format "- [ ] étape". Réponds uniquement avec la liste, sans texte avant/après.`;
};

const generateAiPlan = async (title, column, date) => {
    const apiKey = getAiKey();
    if (!apiKey) throw new Error("Aucune clé API IA renseignée.");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
            model: AI_MODEL,
            max_tokens: 512,
            messages: [{ role: "user", content: buildAiPrompt(title, column, date) }],
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Requête IA échouée (${res.status}) : ${errText}`);
    }

    const data = await res.json();
    return (data.content?.[0]?.text ?? "").trim();
};

const appendAiPlan = async (id, column) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    aiToggle.classList.add("loading");
    try {
        const plan = await generateAiPlan(extractTitle(task.content), column, new Date());
        if (plan) {
            task.content = `${task.content}\n\n${plan}`;
            saveTasks(tasks);
            expandedIds.add(id);
            render();
        }
    } catch (err) {
        window.alert(err.message);
    } finally {
        aiToggle.classList.remove("loading");
    }
};

const aiToggle = document.getElementById("ai-toggle");
let aiEnabled = false;

aiToggle.addEventListener("click", () => {
    aiEnabled = !aiEnabled;
    aiToggle.setAttribute("aria-pressed", String(aiEnabled));
    aiToggle.querySelector("iconify-icon").setAttribute(
        "icon",
        aiEnabled ? "mdi:robot-outline" : "mdi:robot-off-outline"
    );
});

document.getElementById("ai-key-btn").addEventListener("click", promptAiKey);

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const column = columnSelect.value;
    const id = addTask(text, column);

    input.value = "";
    input.focus();

    if (aiEnabled) {
        if (!getAiKey()) promptAiKey();
        if (getAiKey()) await appendAiPlan(id, column);
    }
});

const openColumnAdd = (wrapper) => {
    const addBtn = wrapper.querySelector(".column-add-btn");
    const addForm = wrapper.querySelector(".column-add-form");
    if (addBtn.hidden) return;
    addBtn.hidden = true;
    addForm.hidden = false;
    addForm.querySelector(".column-add-input").focus();
};

document.querySelector(".board").addEventListener("click", (e) => {
    const addBtn = e.target.closest(".column-add-btn");
    if (addBtn) {
        openColumnAdd(addBtn.closest(".column-add"));
        return;
    }

    const item = e.target.closest(".task");
    if (!item) return;
    const id = item.dataset.id;

    if (e.target.matches('input[type="checkbox"]')) {
        const task = tasks.find((t) => t.id === id);
        if (task) {
            task.done = e.target.checked;
            saveTasks(tasks);
            render();
        }
        return;
    }

    if (e.target.closest(".delete-btn")) {
        tasks = tasks.filter((t) => t.id !== id);
        expandedIds.delete(id);
        editingIds.delete(id);
        saveTasks(tasks);
        render();
        return;
    }

    if (e.target.closest(".task-preview")) {
        editingIds.add(id);
        render();
        const textarea = document.querySelector(`.task[data-id="${id}"] .task-notes`);
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
        return;
    }

    if (e.target.closest(".task-row")) {
        if (expandedIds.has(id)) {
            expandedIds.delete(id);
            editingIds.delete(id);
        } else {
            expandedIds.add(id);
        }
        render();
    }
});

document.querySelector(".board").addEventListener("submit", (e) => {
    const addForm = e.target.closest(".column-add-form");
    if (!addForm) return;
    e.preventDefault();

    const addInput = addForm.querySelector(".column-add-input");
    const text = addInput.value.trim();
    if (text) {
        addTask(text, addForm.closest(".column").dataset.column);
    }
    addInput.value = "";
    addInput.focus();
});

document.querySelector(".board").addEventListener("input", (e) => {
    if (!e.target.matches(".task-notes")) return;

    const item = e.target.closest(".task");
    const task = tasks.find((t) => t.id === item.dataset.id);
    if (!task) return;

    task.content = e.target.value;
    saveTasks(tasks);

    const label = item.querySelector(".task-row span");
    if (label) label.textContent = extractTitle(task.content);
});

document.querySelector(".board").addEventListener("focusout", (e) => {
    const addForm = e.target.closest(".column-add-form");
    if (addForm) {
        requestAnimationFrame(() => {
            if (addForm.contains(document.activeElement)) return;
            addForm.hidden = true;
            addForm.querySelector(".column-add-input").value = "";
            addForm.closest(".column-add").querySelector(".column-add-btn").hidden = false;
        });
        return;
    }

    if (!e.target.matches(".task-notes")) return;

    const item = e.target.closest(".task");
    if (!item) return;

    editingIds.delete(item.dataset.id);
    render();
});

render();
