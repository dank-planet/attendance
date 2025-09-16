document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. FIREBASE SETUP
    // =========================================================================

    // PASTE YOUR UNIQUE firebaseConfig OBJECT FROM THE FIREBASE WEBSITE HERE
    const firebaseConfig = {
        apiKey: "PASTE_YOUR_API_KEY_HERE",
        authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
        databaseURL: "PASTE_YOUR_DATABASE_URL_HERE",
        projectId: "PASTE_YOUR_PROJECT_ID_HERE",
        storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
        messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
        appId: "PASTE_YOUR_APP_ID_HERE"
    };

    // Initialize Firebase and get a reference to the database
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    // =========================================================================
    // 2. CONSTANTS & STATE VARIABLES
    // =========================================================================

    const STUDENT_COLORS = {
        '--dark-raisin': '#360f02',
        '--gold': '#F6AA1C',
        '--burgundy': '#621708',
        '--orange-gold': '#ee8c29', // Cleaned up key
        '--burnt-orange': '#BC3908'
    };
    const COLOR_NAMES = Object.keys(STUDENT_COLORS);

    let students = [];
    let currentStudentIndex = null;
    let currentDate = new Date();
    let clickedDateStr = '';

    // =========================================================================
    // 3. DOM ELEMENT SELECTORS
    // =========================================================================

    const deleteStudentBtn = document.getElementById('delete-student-btn');
    const showAddViewBtn = document.getElementById('show-add-view-btn');
    const showListViewBtn = document.getElementById('show-list-view-btn');
    const addStudentBtn = document.getElementById('add-student-btn');
    const backToStudentsBtn = document.getElementById('back-to-students-btn');
    const backToMonthsBtn = document.getElementById('back-to-months-btn');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const saveAttendanceBtn = document.getElementById('save-attendance-btn');
    const cancelAttendanceBtn = document.getElementById('cancel-attendance-btn');
    const addEntryView = document.getElementById('add-entry-view');
    const viewEntriesView = document.getElementById('view-entries-view');
    const studentsPage = document.getElementById('students-page');
    const detailsPage = document.getElementById('details-page');
    const studentWheelContainer = document.getElementById('student-wheel-container');
    const studentWheel = document.getElementById('student-wheel');
    const selectedStudentHeader = document.getElementById('selected-student-header');
    const monthsContainer = document.getElementById('months-container');
    const calendarContainer = document.getElementById('calendar-container');
    const monthYearLabel = document.getElementById('month-year-label');
    const calendarDatesGrid = document.getElementById('calendar-dates-grid');
    const attendanceModal = document.getElementById('attendance-modal');
    const modalDateLabel = document.getElementById('modal-date-label');
    const dailyEntriesList = document.getElementById('daily-entries-list');
    const hoursInput = document.getElementById('hours-input');
    const timeRangeInput = document.getElementById('time-range-input');
    const addStudentModal = document.getElementById('add-student-modal');
    const newStudentNameInput = document.getElementById('new-student-name-input');
    const saveNewStudentBtn = document.getElementById('save-new-student-btn');
    const cancelNewStudentBtn = document.getElementById('cancel-new-student-btn');

    // =========================================================================
    // 4. DATA & SYNCING FUNCTIONS
    // =========================================================================

    /**
     * Saves the current 'students' array to the Firebase Realtime Database.
     */
    function saveData() {
        database.ref('students').set(students);
    }

    /**
     * Loads student data from Firebase and listens for any changes in real-time.
     */
    function loadData() {
        database.ref('students').on('value', (snapshot) => {
            const data = snapshot.val();
            students = data ? data : [{ name: "First Student", attendance: {} }];
            if (!studentsPage.classList.contains('hidden')) {
                renderStudentTabs();
            }
        });
    }

    // =========================================================================
    // 5. HELPER & UTILITY FUNCTIONS
    // =========================================================================

    /**
     * Returns the ordinal suffix for a day number (e.g., st, nd, rd, th).
     * @param {number} day The day of the month.
     * @returns {string} The suffix.
     */
    function getOrdinalSuffix(day) {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    }

    /**
     * Checks if a hex color is dark to decide on light/dark text.
     * @param {string} hexColor The color in hex format (e.g., '#FFC75F').
     * @returns {boolean} True if the color is dark.
     */
    function isColorDark(hexColor) {
        if (!hexColor || hexColor.length < 4) return false;
        const rgb = parseInt(hexColor.substring(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
    }

    /**
     * Toggles visibility between the main students page and the details page.
     * @param {HTMLElement} pageToShow The page element to make visible.
     */
    function showPage(pageToShow) {
        [studentsPage, detailsPage].forEach(page => page.classList.toggle('hidden', page !== pageToShow));
    }

    /**
     * Updates the 3D perspective animation of the student wheel on scroll.
     */
    function updateWheelAnimation() {
        const containerCenter = studentWheelContainer.offsetWidth / 2;
        const scrollLeft = studentWheelContainer.scrollLeft;
        document.querySelectorAll('.student-tab').forEach(tab => {
            const tabCenter = tab.offsetLeft - scrollLeft + tab.offsetWidth / 2;
            const distanceFromCenter = tabCenter - containerCenter;
            const rotateY = distanceFromCenter / containerCenter * -45;
            const translateZ = -Math.abs(distanceFromCenter / containerCenter) * 200;
            const scale = 1 - Math.abs(distanceFromCenter / containerCenter) * 0.2;
            const opacity = 1 - Math.abs(distanceFromCenter / containerCenter) * 0.5;
            tab.style.transform = `scale(${scale}) rotateY(${rotateY}deg) translateZ(${translateZ}px)`;
            tab.style.opacity = Math.max(0.3, opacity);
        });
    }

    // =========================================================================
    // 6. CORE APPLICATION LOGIC & RENDERING
    // =========================================================================

    /**
     * Renders the student tabs in the main wheel view.
     */
    function renderStudentTabs() {
        studentWheel.innerHTML = '';
        if (!students) return;
        students.forEach((student, index) => {
            if (!student) return;
            const tab = document.createElement('div');
            tab.className = 'student-tab';
            tab.textContent = student.name;
            const colorName = COLOR_NAMES[index % COLOR_NAMES.length];
            const colorHex = STUDENT_COLORS[colorName];
            tab.style.backgroundColor = `var(${colorName})`;
            if (isColorDark(colorHex)) {
                tab.style.color = '#f0f0f0';
            } else {
                tab.style.color = '#2c2c2c';
            }
            tab.dataset.index = index;
            tab.addEventListener('click', handleStudentTabClick);
            studentWheel.appendChild(tab);
        });
        setTimeout(updateWheelAnimation, 0);
    }

    /**
     * Handles the click on a student tab, animating it and showing the details page.
     * @param {Event} event The click event from the student tab.
     */
    function handleStudentTabClick(event) {
        currentStudentIndex = parseInt(event.currentTarget.dataset.index);
        currentDate = new Date();
        const clickedTab = event.currentTarget;
        const startRect = clickedTab.getBoundingClientRect();
        const movingTab = clickedTab.cloneNode(true);
        movingTab.style.color = clickedTab.style.color;
        selectedStudentHeader.innerHTML = '';
        selectedStudentHeader.appendChild(movingTab);
        const endRect = movingTab.getBoundingClientRect();
        const dx = startRect.left - endRect.left;
        const dy = startRect.top - endRect.top;
        movingTab.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
            movingTab.style.transition = 'transform 0.5s ease-in-out';
            movingTab.style.transform = 'translate(0, 0)';
        });
        populateMonths();
        showPage(detailsPage);
        calendarContainer.style.display = 'none';
        monthsContainer.style.display = 'grid';
    }

    /**
     * Populates the months view with buttons and attendance totals.
     */
    function populateMonths() {
        monthsContainer.innerHTML = '';
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const year = currentDate.getFullYear();
        const studentData = students[currentStudentIndex]?.attendance;
        monthNames.forEach((month, index) => {
            const btn = document.createElement('button');
            btn.className = 'month-btn';
            btn.textContent = month;
            btn.addEventListener('click', () => {
                currentDate = new Date(year, index, 1);
                showCalendar();
            });
            let totalMonthHours = 0;
            if (studentData) {
                const daysInMonth = new Date(year, index + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(index + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    if (studentData[dateStr] && studentData[dateStr].length > 0) {
                        totalMonthHours += studentData[dateStr].reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
                    }
                }
            }
            if (totalMonthHours > 0) {
                const totalBadge = document.createElement('span');
                totalBadge.className = 'month-total-hours';
                if (totalMonthHours < 10) {
                    totalBadge.classList.add('single-digit');
                } else {
                    totalBadge.classList.add('double-digit');
                }
                totalBadge.textContent = totalMonthHours;
                btn.appendChild(totalBadge);
            }
            monthsContainer.appendChild(btn);
        });
    }

    /**
     * Hides the months view and shows the calendar view.
     */
    function showCalendar() {
        monthsContainer.style.display = 'none';
        calendarContainer.style.display = 'flex';
        renderCalendar();
    }

    /**
     * Renders the calendar grid for the currently selected month and year.
     */
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYearLabel.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
        calendarDatesGrid.innerHTML = '';
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDayOfMonth; i++) { calendarDatesGrid.appendChild(document.createElement('div')); }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateSquare = document.createElement('div');
            dateSquare.className = 'date-square';
            dateSquare.textContent = day;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dateSquare.dataset.date = dateStr;
            const studentData = students[currentStudentIndex]?.attendance;
            if (studentData && studentData[dateStr]) {
                const totalHours = studentData[dateStr].reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
                if (totalHours > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'total-hours-badge';
                    badge.textContent = totalHours;
                    dateSquare.appendChild(badge);
                }
            }
            dateSquare.addEventListener('click', () => openAttendanceModal(dateStr));
            calendarDatesGrid.appendChild(dateSquare);
        }
    }

    /**
     * Opens the attendance modal for a specific date.
     * @param {string} dateStr The date string in 'YYYY-MM-DD' format.
     */
    function openAttendanceModal(dateStr) {
        clickedDateStr = dateStr;
        const date = new Date(dateStr + 'T12:00:00Z');
        modalDateLabel.innerHTML = `${date.getDate()}<sup>${getOrdinalSuffix(date.getDate())}</sup> ${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        dailyEntriesList.innerHTML = '';
        const entries = students[currentStudentIndex]?.attendance?.[dateStr];
        if (entries && entries.length > 0) {
            entries.forEach((entry, index) => {
                const entryContainer = document.createElement('div');
                const entryEl = document.createElement('span');
                entryEl.innerHTML = `<strong>${entry.hours} hours</strong> (${entry.timeRange || 'No time given'})`;
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-entry-btn';
                deleteBtn.textContent = 'X';
                deleteBtn.dataset.index = index;
                deleteBtn.addEventListener('click', () => deleteEntry(dateStr, index));
                entryContainer.appendChild(entryEl);
                entryContainer.appendChild(deleteBtn);
                dailyEntriesList.appendChild(entryContainer);
            });
            showListViewBtn.click();
        } else {
            dailyEntriesList.innerHTML = '<p>No entries for this date.</p>';
            showAddViewBtn.click();
        }
        hoursInput.value = '';
        timeRangeInput.value = '';
        attendanceModal.style.display = 'flex';
    }

    /**
     * Deletes a specific attendance entry for a student on a given date.
     * @param {string} dateStr The date of the entry.
     * @param {number} entryIndex The index of the entry to delete.
     */
    function deleteEntry(dateStr, entryIndex) {
        const entries = students[currentStudentIndex].attendance[dateStr];
        entries.splice(entryIndex, 1);
        if (entries.length === 0) {
            delete students[currentStudentIndex].attendance[dateStr];
        }
        saveData();
    }

    /**
     * Closes the attendance modal.
     */
    function closeAttendanceModal() {
        attendanceModal.style.display = 'none';
    }

    /**
     * Closes the "add student" modal.
     */
    function closeAddStudentModal() {
        addStudentModal.style.display = 'none';
    }

    /**
     * Handles the 'Enter' key press on modal inputs to save the entry.
     * @param {KeyboardEvent} event
     */
    function handleEnterKey(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveAttendanceBtn.click();
        }
    }

    // =========================================================================
    // 7. EVENT LISTENERS
    // =========================================================================
    addStudentBtn.addEventListener('click', () => {
        newStudentNameInput.value = '';
        addStudentModal.style.display = 'flex';
        newStudentNameInput.focus();
    });
    deleteStudentBtn.addEventListener('click', () => { if (currentStudentIndex === null || !students[currentStudentIndex]) return; const studentName = students[currentStudentIndex].name; if (confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) { students.splice(currentStudentIndex, 1); saveData(); showPage(studentsPage); } });
    studentWheelContainer.addEventListener('scroll', updateWheelAnimation);
    backToStudentsBtn.addEventListener('click', () => showPage(studentsPage));
    selectedStudentHeader.addEventListener('click', () => showPage(studentsPage));
    backToMonthsBtn.addEventListener('click', () => { monthsContainer.style.display = 'grid'; calendarContainer.style.display = 'none'; });
    prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    showAddViewBtn.addEventListener('click', () => { addEntryView.classList.remove('hidden'); viewEntriesView.classList.add('hidden'); showAddViewBtn.classList.add('active'); showListViewBtn.classList.remove('active'); saveAttendanceBtn.style.display = 'inline-block'; });
    showListViewBtn.addEventListener('click', () => { addEntryView.classList.add('hidden'); viewEntriesView.classList.remove('hidden'); showAddViewBtn.classList.remove('active'); showListViewBtn.classList.add('active'); saveAttendanceBtn.style.display = 'none'; });
    cancelAttendanceBtn.addEventListener('click', closeAttendanceModal);
    attendanceModal.addEventListener('click', (event) => { if (event.target === attendanceModal) { closeAttendanceModal(); } });
    saveAttendanceBtn.addEventListener('click', () => { const hours = hoursInput.value; const timeRange = timeRangeInput.value; if (!hours || isNaN(hours)) { alert("Please enter a valid number for hours."); return; } if (!students[currentStudentIndex].attendance) { students[currentStudentIndex].attendance = {}; } const studentData = students[currentStudentIndex].attendance; if (!studentData[clickedDateStr]) { studentData[clickedDateStr] = []; } studentData[clickedDateStr].push({ hours: parseFloat(hours), timeRange }); saveData(); closeAttendanceModal(); });
    hoursInput.addEventListener('keydown', handleEnterKey);
    timeRangeInput.addEventListener('keydown', handleEnterKey);
    cancelNewStudentBtn.addEventListener('click', closeAddStudentModal);
    saveNewStudentBtn.addEventListener('click', () => {
        const newName = newStudentNameInput.value;
        if (newName && newName.trim() !== '') {
            if (!students) { students = []; }
            students.push({ name: newName.trim(), attendance: {} });
            saveData();
            closeAddStudentModal();
        } else {
            alert('Please enter a student name.');
        }
    });

    // =========================================================================
    // 8. INITIALIZATION
    // =========================================================================
    loadData();
});
