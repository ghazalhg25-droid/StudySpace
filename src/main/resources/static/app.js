
document.addEventListener("DOMContentLoaded", () => {
    // DATA
    let tasks = JSON.parse(localStorage.getItem("studyspaceTasks")) || [];
    let subjects = JSON.parse(localStorage.getItem("studyspaceSubjects")) || [];

    let timerInterval = null;
    let timeLeft = 25 * 60;
    let isRunning = false;

    const saveData = () => {
        localStorage.setItem("studyspaceTasks", JSON.stringify(tasks));
        localStorage.setItem("studyspaceSubjects", JSON.stringify(subjects));
    };

    const getElement = (id) => document.getElementById(id);

    // NAVIGATION
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".page-section");

    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove("active-section");
        });

        navItems.forEach(item => {
            item.classList.remove("active");
        });

        const target = getElement(sectionId);
        if (target) target.classList.add("active-section");

        const activeNav = document.querySelector(
            `.nav-item[data-section="${sectionId}"]`
        );

        if (activeNav) activeNav.classList.add("active");
    }

    navItems.forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            const sectionId = item.dataset.section;
            if (sectionId) {
                showSection(sectionId);
                history.replaceState(null, "", `#${sectionId}`);
            }
        });
    });

    document.querySelectorAll("[data-go]").forEach(button => {
        button.addEventListener("click", () => {
            showSection(button.dataset.go);
        });
    });

    const initialSection = location.hash.replace("#", "");
    if (initialSection && getElement(initialSection)) {
        showSection(initialSection);
    }

    // GREETING AND DATE
    const greeting = getElement("greeting");
    const todayDate = getElement("todayDate");

    if (greeting) {
        const hour = new Date().getHours();
        greeting.textContent =
            hour < 12 ? "Good Morning!" :
            hour < 18 ? "Good Afternoon!" : "Good Evening!";
    }

    if (todayDate) {
        todayDate.textContent = new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    // HTML SAFETY
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    // STATISTICS AND PROGRESS
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const pending = total - completed;
        const percentage = total ? Math.round((completed / total) * 100) : 0;

        if (getElement("totalTasks"))
            getElement("totalTasks").textContent = total;

        if (getElement("completedTasks"))
            getElement("completedTasks").textContent = completed;

        if (getElement("pendingTasks"))
            getElement("pendingTasks").textContent = pending;

        if (getElement("progressPercent"))
            getElement("progressPercent").textContent = percentage + "%";

        if (getElement("progressBar"))
            getElement("progressBar").style.width = percentage + "%";
    }

    // SUBJECTS
    function renderSubjectOptions() {
        ["taskSubject", "filterSubject"].forEach(id => {
            const select = getElement(id);
            if (!select) return;

            const selectedValue = select.value;
            const firstOption = id === "taskSubject"
                ? '<option value="">Select subject</option>'
                : '<option value="">All subjects</option>';

            select.innerHTML = firstOption;

            subjects.forEach(subject => {
                select.innerHTML += `
                    <option value="${escapeHTML(subject)}">
                        ${escapeHTML(subject)}
                    </option>
                `;
            });

            if (subjects.includes(selectedValue)) {
                select.value = selectedValue;
            }
        });
    }

    function renderSubjects() {
        const container = getElement("subjectsList");
        if (!container) return;

        if (subjects.length === 0) {
            container.innerHTML = `
                <p class="empty-message">
                    No subjects yet. Add your first subject! 💜
                </p>
            `;
            return;
        }

        container.innerHTML = subjects.map((subject, index) => `
            <div class="subject-card">
                <h3>${escapeHTML(subject)}</h3>
                <p>
                    ${tasks.filter(task => task.subject === subject).length}
                    tasks
                </p>
                <button class="delete-btn" data-delete-subject="${index}">
                    Delete
                </button>
            </div>
        `).join("");
    }

    const subjectForm = getElement("subjectForm");

    if (subjectForm) {
        subjectForm.addEventListener("submit", event => {
            event.preventDefault();

            const input = getElement("subjectName");
            const name = input.value.trim();

            if (!name) return;

            if (subjects.some(subject =>
                subject.toLowerCase() === name.toLowerCase()
            )) {
                alert("This subject already exists!");
                return;
            }

            subjects.push(name);
            input.value = "";

            saveData();
            refresh();
        });
    }

    const subjectsList = getElement("subjectsList");

    if (subjectsList) {
        subjectsList.addEventListener("click", event => {
            const button = event.target.closest("[data-delete-subject]");
            if (!button) return;

            const index = Number(button.dataset.deleteSubject);
            const subject = subjects[index];

            if (!confirm(`Delete ${subject}?`)) return;

            subjects.splice(index, 1);

            tasks.forEach(task => {
                if (task.subject === subject) task.subject = "";
            });

            saveData();
            refresh();
        });
    }

    // TASK ELEMENT
    function createTaskElement(task, index) {
        const priority = task.priority || "Normal";

        return `
            <div class="task-item">
                <input
                    type="checkbox"
                    class="task-check"
                    data-complete="${index}"
                    ${task.completed ? "checked" : ""}
                >

                <div class="task-info">
                    <h3 style="${task.completed ? "text-decoration:line-through;opacity:.6;" : ""}">
                        ${escapeHTML(task.name)}
                    </h3>

                    <p>${escapeHTML(task.subject || "No subject")}</p>

                    ${task.dueDate
                        ? `<small>Due: ${escapeHTML(task.dueDate)}</small>`
                        : ""}
                </div>

                <span class="priority ${priority.toLowerCase()}">
                    ${escapeHTML(priority)}
                </span>

                <span class="status">
                    ${task.completed ? "Completed" : "Pending"}
                </span>

                <div class="task-actions">
                    <button class="edit-btn" data-edit="${index}">
                        Edit
                    </button>
                    <button class="delete-btn" data-delete="${index}">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    // RENDER TASKS
    function renderTaskList(container, taskIndexes) {
        if (!container) return;

        if (taskIndexes.length === 0) {
            container.innerHTML = `
                <p class="empty-message">
                    No tasks to show. Add a task to get started! 💜
                </p>
            `;
            return;
        }

        container.innerHTML = taskIndexes.map(index =>
            createTaskElement(tasks[index], index)
        ).join("");
    }

    function renderAllTasks() {
        const search = (getElement("searchTasks")?.value || "").toLowerCase();
        const status = getElement("filterTasks")?.value || "all";
        const subject = getElement("filterSubject")?.value || "";

        const indexes = tasks
            .map((task, index) => index)
            .filter(index => {
                const task = tasks[index];

                const matchesSearch =
                    (task.name || "").toLowerCase().includes(search);

                const matchesStatus =
                    status === "all" ||
                    (status === "pending" && !task.completed) ||
                    (status === "completed" && task.completed);

                const matchesSubject =
                    !subject || task.subject === subject;

                return matchesSearch && matchesStatus && matchesSubject;
            });

        renderTaskList(getElement("allTasks"), indexes);
    }

    // ADD TASK
    const taskForm = getElement("taskForm");

    if (taskForm) {
        taskForm.addEventListener("submit", event => {
            event.preventDefault();

            const name = getElement("taskName").value.trim();
            const subject = getElement("taskSubject").value;
            const dueDate = getElement("taskDate").value;
            const priority = getElement("taskPriority").value;

            if (!name) {
                alert("Please enter a task name.");
                return;
            }

            tasks.push({
                name,
                subject,
                dueDate,
                priority,
                completed: false
            });

            taskForm.reset();
            saveData();
            refresh();
        });
    }

    // TASK ACTIONS
    document.addEventListener("click", event => {
        const deleteButton = event.target.closest("[data-delete]");
        const editButton = event.target.closest("[data-edit]");

        if (deleteButton) {
            const index = Number(deleteButton.dataset.delete);

            if (confirm("Are you sure you want to delete this task?")) {
                tasks.splice(index, 1);
                saveData();
                refresh();
            }
        }

        if (editButton) {
            const index = Number(editButton.dataset.edit);
            const task = tasks[index];

            const newName = prompt("Edit task name:", task.name);
            if (newName === null || !newName.trim()) return;

            task.name = newName.trim();

            const newSubject = prompt(
                "Edit subject:",
                task.subject || ""
            );

            if (newSubject !== null) task.subject = newSubject.trim();

            const newDate = prompt(
                "Edit due date (YYYY-MM-DD):",
                task.dueDate || ""
            );

            if (newDate !== null) task.dueDate = newDate.trim();

            saveData();
            refresh();
        }
    });

    document.addEventListener("change", event => {
        const checkbox = event.target.closest("[data-complete]");
        if (!checkbox) return;

        const index = Number(checkbox.dataset.complete);
        tasks[index].completed = checkbox.checked;

        saveData();
        refresh();
    });

    // SEARCH AND FILTERS
    ["searchTasks", "filterTasks", "filterSubject"].forEach(id => {
        const element = getElement(id);
        if (element) {
            element.addEventListener("input", renderAllTasks);
            element.addEventListener("change", renderAllTasks);
        }
    });

    // CALENDAR
    function renderCalendar() {
        const container = getElement("calendarTasks");
        if (!container) return;

        const upcoming = tasks
            .map((task, index) => ({ ...task, originalIndex: index }))
            .filter(task => !task.completed && task.dueDate)
            .sort((a, b) =>
                new Date(a.dueDate) - new Date(b.dueDate)
            );

        if (upcoming.length === 0) {
            container.innerHTML = `
                <p class="empty-message">
                    No upcoming deadlines. Enjoy your free time! 💜
                </p>
            `;
            return;
        }

        container.innerHTML = upcoming.map(task => `
            <div class="calendar-item">
                <div class="calendar-date">
                    ${escapeHTML(task.dueDate)}
                </div>
                <div>
                    <strong>${escapeHTML(task.name)}</strong>
                    <p>${escapeHTML(task.subject || "No subject")}</p>
                </div>
            </div>
        `).join("");
    }

    // DASHBOARD TASKS
    function renderDashboard() {
        const indexes = tasks
            .map((task, index) => index)
            .filter(index => !tasks[index].completed)
            .slice(0, 5);

        renderTaskList(getElement("dashboardTasks"), indexes);
    }

    // REFRESH ALL
    function refresh() {
        renderSubjectOptions();
        renderSubjects();
        updateStats();
        renderAllTasks();
        renderCalendar();
        renderDashboard();
    }

    // TIMER
    const timerDisplay = getElement("timerDisplay");

    function updateTimerDisplay() {
        if (!timerDisplay) return;

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        timerDisplay.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        isRunning = false;
    }

    function startTimer() {
        if (isRunning) return;

        isRunning = true;

        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                stopTimer();

                if (getElement("timerMessage")) {
                    getElement("timerMessage").textContent =
                        "Time is up! Great job! 🎉";
                }

                alert("Time is up! 🎉");
            }
        }, 1000);
    }

    function resetTimer() {
        stopTimer();
        timeLeft = 25 * 60;
        updateTimerDisplay();

        if (getElement("timerMessage")) {
            getElement("timerMessage").textContent = "";
        }
    }

    getElement("startTimer")?.addEventListener("click", startTimer);

    getElement("pauseTimer")?.addEventListener("click", stopTimer);

    getElement("resetTimer")?.addEventListener("click", resetTimer);

    document.querySelectorAll("[data-minutes]").forEach(button => {
        button.addEventListener("click", () => {
            stopTimer();
            timeLeft = Number(button.dataset.minutes) * 60;
            updateTimerDisplay();

            if (getElement("timerMessage")) {
                getElement("timerMessage").textContent = "";
            }
        });
    });

    updateTimerDisplay();
    refresh();
});
