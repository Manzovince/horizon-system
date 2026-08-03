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

const addTask = (text, column) => {
    tasks.push({
        id: crypto.randomUUID(),
        column,
        done: false,
        content: `# ${text}`,
    });
    saveTasks(tasks);
    render();
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

    if (body.trim()) {
        const noteIcon = document.createElement("iconify-icon");
        noteIcon.className = "task-note-indicator";
        noteIcon.setAttribute("icon", "mdi:text-box-outline");
        row.append(noteIcon);
    }

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

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addTask(text, columnSelect.value);

    input.value = "";
    input.focus();
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
    const addWrapper = e.target.closest(".column-add");
    if (addWrapper) {
        openColumnAdd(addWrapper);
        return;
    }

    const emptyList = e.target.closest(".task-list");
    if (emptyList && emptyList.children.length === 0) {
        openColumnAdd(emptyList.closest(".column").querySelector(".column-add"));
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
