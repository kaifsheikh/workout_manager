// Global variables
let currentFilter = { date: '', muscle: '', month: '' };
let currentEditId = null;
let muscleChart = null;

// ========== INITIALIZATION ==========
function init() {
    loadData();
    setupEventListeners();
}

function loadData() {
    workoutData = DataManager.loadFromLocalStorage();
    populateMuscleFilter();
    populateDeleteColumnSelect();
    renderDynamicForm();
    renderTable();
    updateStats();
    updateMuscleChart();
}

function saveData() {
    DataManager.saveToLocalStorage(workoutData);
}

// ========== COLUMN MANAGEMENT ==========
function addNewColumn() {
    const columnName = document.getElementById('newColumnName').value.trim();
    const columnType = document.getElementById('newColumnType').value;

    if (!columnName) {
        showToast('Please enter a column name', 'warning');
        return;
    }

    const columnId = columnName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    if (workoutData.columns.some(col => col.id === columnId)) {
        showToast('Column already exists!', 'warning');
        return;
    }

    workoutData.columns.push({
        id: columnId,
        name: columnName,
        type: columnType,
        required: false
    });

    workoutData.workouts.forEach(workout => {
        if (columnType === 'boolean') {
            workout[columnId] = false;
        } else if (columnType === 'number') {
            workout[columnId] = null;
        } else {
            workout[columnId] = '';
        }
    });

    saveData();
    document.getElementById('newColumnName').value = '';
    renderDynamicForm();
    renderTable();
    populateDeleteColumnSelect();
    showToast(`Column "${columnName}" added!`, 'success');
}

function deleteColumn() {
    const columnId = document.getElementById('deleteColumnSelect').value;

    if (!columnId) {
        showToast('Please select a column to delete', 'warning');
        return;
    }

    const column = workoutData.columns.find(col => col.id === columnId);

    if (!column) {
        showToast('Column not found', 'error');
        return;
    }

    if (DataManager.defaultColumns.includes(columnId) && column.required) {
        showToast('Cannot delete required default columns', 'warning');
        return;
    }

    if (confirm(`Are you sure you want to delete "${column.name}" column? This will remove all data in this column from all workouts.`)) {
        workoutData.columns = workoutData.columns.filter(col => col.id !== columnId);

        workoutData.workouts.forEach(workout => {
            delete workout[columnId];
        });

        saveData();
        renderDynamicForm();
        renderTable();
        populateDeleteColumnSelect();
        updateStats();
        showToast(`Column "${column.name}" deleted!`, 'success');
    }
}

function populateDeleteColumnSelect() {
    const select = document.getElementById('deleteColumnSelect');
    select.innerHTML = '<option value="">Select Column</option>';

    workoutData.columns.forEach(column => {
        const option = document.createElement('option');
        option.value = column.id;
        option.textContent = column.name + (column.required ? ' (Required)' : '');
        select.appendChild(option);
    });
}

// ========== FORM RENDERING ==========
function renderDynamicForm(containerId = 'dynamicForm', data = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const idPrefix = containerId === 'editForm' ? 'edit_' : '';

    workoutData.columns.forEach(column => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-field';

        const label = document.createElement('label');
        label.textContent = column.name + (column.required ? ' *' : '');
        label.setAttribute('for', `${idPrefix}field_${column.id}`);

        let input;
        const inputId = `${idPrefix}field_${column.id}`;

        switch (column.type) {
            case 'boolean':
                input = document.createElement('select');
                input.id = inputId;
                input.innerHTML = '<option value="false">No</option><option value="true">Yes</option>';
                if (data && data[column.id] !== undefined) {
                    input.value = data[column.id].toString();
                }
                break;
            case 'date':
                input = document.createElement('input');
                input.type = 'date';
                input.id = inputId;
                if (data && data[column.id]) {
                    input.value = data[column.id];
                } else if (!data && column.id === 'date') {
                    input.value = new Date().toISOString().split('T')[0];
                }
                break;
            case 'number':
                input = document.createElement('input');
                input.type = 'number';
                input.id = inputId;
                if (data && data[column.id] !== undefined && data[column.id] !== null) {
                    input.value = data[column.id];
                }
                break;
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.id = inputId;
                if (data && data[column.id]) {
                    input.value = data[column.id];
                }
        }

        input.placeholder = column.name;
        if (column.required) input.required = true;

        fieldDiv.appendChild(label);
        fieldDiv.appendChild(input);
        container.appendChild(fieldDiv);
    });
}

function getFormData(containerId = 'dynamicForm') {
    const formData = {};
    const container = document.getElementById(containerId);
    if (!container) return formData;

    const idPrefix = containerId === 'editForm' ? 'edit_' : '';

    workoutData.columns.forEach(column => {
        const field = container.querySelector(`#${idPrefix}field_${column.id}`);
        if (field) {
            let value = field.value;
            if (column.type === 'number') {
                value = value ? parseFloat(value) : null;
            } else if (column.type === 'boolean') {
                value = value === 'true';
            }
            formData[column.id] = value;
        }
    });
    return formData;
}

// ========== WORKOUT CRUD OPERATIONS ==========
function addWorkout() {
    const newWorkout = getFormData('dynamicForm');
    let isValid = true;

    workoutData.columns.forEach(column => {
        if (column.required && !newWorkout[column.id]) {
            showToast(`Please fill in: ${column.name}`, 'warning');
            isValid = false;
        }
    });

    if (!isValid) return;

    newWorkout.id = Date.now();
    workoutData.workouts.push(newWorkout);
    saveData();
    renderDynamicForm();
    populateMuscleFilter();
    renderTable();
    updateStats();
    updateMuscleChart();
    showToast('Workout added successfully!', 'success');
}

function editWorkout(id) {
    const workout = workoutData.workouts.find(w => w.id === id);
    if (!workout) return;
    currentEditId = id;
    renderDynamicForm('editForm', workout);
    document.getElementById('editModal').classList.add('active');
}

function updateWorkout() {
    const updatedWorkout = getFormData('editForm');
    updatedWorkout.id = currentEditId;

    const index = workoutData.workouts.findIndex(w => w.id === currentEditId);
    if (index !== -1) {
        workoutData.workouts[index] = updatedWorkout;
        saveData();
        closeModal();
        renderTable();
        updateStats();
        updateMuscleChart();
        populateMuscleFilter();
        showToast('Workout updated successfully!', 'success');
    }
}

function deleteWorkout(id) {
    if (confirm('Are you sure you want to delete this workout?')) {
        workoutData.workouts = workoutData.workouts.filter(w => w.id !== id);
        saveData();
        renderTable();
        updateStats();
        updateMuscleChart();
        populateMuscleFilter();
        showToast('Workout deleted!', 'success');
    }
}

function deleteMonthData() {
    const month = document.getElementById('monthFilter').value;
    if (!month) {
        showToast('Please select a month first!', 'warning');
        return;
    }

    const workoutsInMonth = workoutData.workouts.filter(w => w.date && w.date.startsWith(month));
    if (workoutsInMonth.length === 0) {
        showToast('No workouts found in this month', 'warning');
        return;
    }

    if (confirm(`Delete ALL ${workoutsInMonth.length} workouts for this month?`)) {
        workoutData.workouts = workoutData.workouts.filter(w => !w.date || !w.date.startsWith(month));
        saveData();
        renderTable();
        updateStats();
        updateMuscleChart();
        populateMuscleFilter();
        showToast(`Deleted ${workoutsInMonth.length} workouts`, 'success');
    }
}

// ========== PDF EXPORT ==========
async function downloadMonthPDF() {
    const month = document.getElementById('monthFilter').value;
    if (!month) {
        showToast('Please select a month first!', 'warning');
        return;
    }

    const monthWorkouts = workoutData.workouts.filter(w => w.date && w.date.startsWith(month));
    if (monthWorkouts.length === 0) {
        showToast('No workouts found in this month', 'warning');
        return;
    }

    const [year, monthNum] = month.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const totalWorkouts = monthWorkouts.length;
    const totalSets = monthWorkouts.reduce((sum, w) => sum + (w.sets || 0), 0);
    const totalVolume = monthWorkouts.reduce((sum, w) => sum + ((w.sets || 0) * (w.weight || 0)), 0);

    const pdfArea = document.getElementById('pdfExportArea');

    pdfArea.innerHTML = `
        <div class="pdf-header">
            <h1>Workout Report</h1>
            <p>${monthNames[parseInt(monthNum) - 1]} ${year}</p>
            <p style="font-size: 12px; color: #999; margin-top: 5px;">Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="pdf-stats">
            <div class="pdf-stat-box">
                <h4>Total Workouts</h4>
                <div class="value">${totalWorkouts}</div>
            </div>
            <div class="pdf-stat-box">
                <h4>Total Sets</h4>
                <div class="value">${totalSets}</div>
            </div>
            <div class="pdf-stat-box">
                <h4>Total Volume</h4>
                <div class="value">${totalVolume.toLocaleString()} kg</div>
            </div>
        </div>
        <table class="pdf-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Exercise</th>
                    <th>Muscle</th>
                    <th>Sets</th>
                    <th>Reps</th>
                    <th>Weight</th>
                </tr>
            </thead>
            <tbody>
                ${monthWorkouts.map(w => `
                    <tr>
                        <td>${w.date || '-'}</td>
                        <td>${w.exercise || '-'}</td>
                        <td>${w.targetMuscle || '-'}</td>
                        <td>${w.sets || '-'}</td>
                        <td>${w.reps || '-'}</td>
                        <td>${w.weight ? w.weight + ' kg' : '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.body.appendChild(pdfArea);

    try {
        await html2pdf().set({
            margin: [0.5, 0.5, 0.5, 0.5],
            filename: `workout_report_${month}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false
            },
            jsPDF: {
                unit: 'in',
                format: 'a4',
                orientation: 'landscape'
            }
        }).from(pdfArea).save();

        showToast('PDF downloaded successfully!', 'success');
    } catch (error) {
        showToast('Error generating PDF', 'error');
        console.error(error);
    }

    document.body.removeChild(pdfArea);
}

// ========== STATS AND CHARTS ==========
function updateStats() {
    const workouts = getFilteredWorkouts();
    const container = document.getElementById('statsGrid');

    if (workouts.length === 0) {
        container.innerHTML = '<div class="no-data-message">No data available for selected filter.</div>';
        return;
    }

    const totalWorkouts = workouts.length;
    const uniqueDates = [...new Set(workouts.map(w => w.date))];
    const totalDays = uniqueDates.length;
    const avg = totalDays > 0 ? (totalWorkouts / totalDays).toFixed(1) : 0;

    let totalVolume = 0, totalSets = 0;
    workouts.forEach(w => {
        if (w.sets && w.weight) totalVolume += w.sets * w.weight;
        if (w.sets) totalSets += w.sets;
    });

    const muscleCount = {};
    workouts.forEach(w => {
        if (w.targetMuscle) {
            muscleCount[w.targetMuscle] = (muscleCount[w.targetMuscle] || 0) + 1;
        }
    });
    const topMuscle = Object.entries(muscleCount).sort((a, b) => b[1] - a[1])[0];

    const maxWeights = {};
    workouts.forEach(w => {
        if (w.exercise && w.weight) {
            maxWeights[w.exercise] = Math.max(maxWeights[w.exercise] || 0, w.weight);
        }
    });
    const maxWeight = Math.max(0, ...Object.values(maxWeights));

    container.innerHTML = `
        <div class="stat-card">
            <h4>Total Workouts</h4>
            <div class="stat-value">${totalWorkouts}</div>
            <div class="stat-trend">${totalDays} active days</div>
        </div>
        <div class="stat-card">
            <h4>Total Volume</h4>
            <div class="stat-value">${totalVolume.toLocaleString()} kg</div>
            <div class="stat-trend">${totalSets} sets</div>
        </div>
        <div class="stat-card">
            <h4>Avg/Day</h4>
            <div class="stat-value">${avg}</div>
            <div class="stat-trend">workouts per day</div>
        </div>
        <div class="stat-card">
            <h4>Top Muscle</h4>
            <div class="stat-value">${topMuscle ? topMuscle[0] : '-'}</div>
            <div class="stat-trend">${topMuscle ? topMuscle[1] + ' workouts' : ''}</div>
        </div>
        <div class="stat-card">
            <h4>Max Weight</h4>
            <div class="stat-value">${maxWeight} kg</div>
            <div class="stat-trend">${Object.keys(maxWeights).length} exercises</div>
        </div>
        <div class="stat-card">
            <h4>Exercises</h4>
            <div class="stat-value">${Object.keys(maxWeights).length}</div>
            <div class="stat-trend">unique tracked</div>
        </div>
    `;
}

function updateMuscleChart() {
    const workouts = getFilteredWorkouts();
    const muscleCount = {};
    workouts.forEach(w => {
        if (w.targetMuscle) {
            muscleCount[w.targetMuscle] = (muscleCount[w.targetMuscle] || 0) + 1;
        }
    });

    const sorted = Object.entries(muscleCount).sort((a, b) => b[1] - a[1]);

    if (muscleChart) {
        muscleChart.destroy();
    }

    const ctx = document.getElementById('muscleChart').getContext('2d');

    if (sorted.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '14px Inter';
        ctx.fillStyle = '#5a6b80';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    muscleChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                data: sorted.map(s => s[1]),
                backgroundColor: [
                    '#00d4aa', '#3742fa', '#ffa502', '#ff4757',
                    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
                    '#06b6d4', '#84cc16'
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#8fa3bf',
                        font: { family: 'Inter', size: 12 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// ========== TABLE RENDERING ==========
function renderTable() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const headerRow = document.createElement('tr');
    const actionTh = document.createElement('th');
    actionTh.textContent = 'Actions';
    headerRow.appendChild(actionTh);

    workoutData.columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.name;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const filtered = getFilteredWorkouts();

    if (filtered.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = workoutData.columns.length + 1;
        cell.className = 'empty-table';
        cell.textContent = 'No workouts found. Add your first workout above!';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    filtered.forEach(w => {
        const row = document.createElement('tr');
        const actionCell = document.createElement('td');
        actionCell.className = 'action-buttons';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-icon btn-edit';
        editBtn.innerHTML = '✏️';
        editBtn.onclick = () => editWorkout(w.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon btn-delete';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.onclick = () => deleteWorkout(w.id);

        actionCell.append(editBtn, deleteBtn);
        row.appendChild(actionCell);

        workoutData.columns.forEach(col => {
            const cell = document.createElement('td');
            let val = w[col.id];

            if (val !== undefined && val !== null) {
                if (col.type === 'boolean') {
                    cell.innerHTML = val ? '<span style="color:#00d4aa;font-weight:600;">Yes</span>' : '<span style="color:#ff4757;font-weight:600;">No</span>';
                } else {
                    cell.textContent = val;
                }
            } else {
                cell.textContent = '-';
            }
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
}

// ========== MODAL FUNCTIONS ==========
function closeModal() {
    document.getElementById('editModal').classList.remove('active');
    currentEditId = null;
}

// ========== UTILITY FUNCTIONS ==========
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    const bgColors = {
        success: '#00d4aa',
        warning: '#ffa502',
        error: '#ff4757',
        info: '#3742fa'
    };

    t.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 2000;
        animation: slideUp 0.3s ease;
        color: #080c14;
        background: ${bgColors[type] || bgColors.info};
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    `;
    t.textContent = msg;
    document.body.appendChild(t);

    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(10px)';
        t.style.transition = 'all 0.3s ease';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// ========== DATA BACKUP & RESTORE (No Monthly Export) ==========

// Export all data to JSON file
function exportData() {
    const data = {
        columns: workoutData.columns,
        workouts: workoutData.workouts,
        exportDate: new Date().toISOString(),
        totalWorkouts: workoutData.workouts.length,
        version: "1.0"
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `gym_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`✅ Exported ${workoutData.workouts.length} workouts successfully!`, 'success');
    localStorage.setItem('lastBackupDate', new Date().toLocaleDateString());
    updateBackupInfo();
}

// Import data from JSON file (UPDATED - MERGE instead of REPLACE)
function importData() {
    const input = document.getElementById('importFile');
    input.click();

    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);

                if (importedData.workouts && importedData.columns) {
                    // Check for duplicate IDs
                    const existingIds = new Set(workoutData.workouts.map(w => w.id));
                    const duplicateCount = importedData.workouts.filter(w => existingIds.has(w.id)).length;
                    
                    let message = `Import ${importedData.workouts.length} workouts?\n`;
                    message += `Current: ${workoutData.workouts.length} workouts\n`;
                    if (duplicateCount > 0) {
                        message += `⚠️ Warning: ${duplicateCount} workouts with duplicate IDs will be skipped.\n`;
                    }
                    message += `\nChoose an option:`;
                    
                    const choice = confirm(message + "\n\nOK = Merge (skip duplicates)\nCancel = Replace all");
                    
                    if (choice) {
                        // MERGE: Add new workouts, skip duplicates
                        const newWorkouts = importedData.workouts.filter(w => !existingIds.has(w.id));
                        workoutData.workouts = [...workoutData.workouts, ...newWorkouts];
                        
                        // Merge columns (add new columns if any)
                        importedData.columns.forEach(newCol => {
                            if (!workoutData.columns.some(col => col.id === newCol.id)) {
                                workoutData.columns.push(newCol);
                            }
                        });
                        
                        showToast(`✅ Merged ${newWorkouts.length} new workouts (skipped ${duplicateCount} duplicates)`, 'success');
                    } else {
                        // REPLACE all
                        workoutData = {
                            columns: importedData.columns,
                            workouts: importedData.workouts
                        };
                        showToast(`✅ Replaced with ${importedData.workouts.length} workouts`, 'success');
                    }
                    
                    saveData();
                    loadData();
                    updateBackupInfo();
                } else {
                    showToast('❌ Invalid backup file! Missing workouts or columns', 'error');
                }
            } catch (error) {
                showToast(`❌ Error: ${error.message}`, 'error');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    };
}

// Backup to device storage
async function backupToDevice() {
    try {
        const data = {
            columns: workoutData.columns,
            workouts: workoutData.workouts,
            lastBackup: new Date().toISOString()
        };

        if ('showDirectoryPicker' in window) {
            const dirHandle = await window.showDirectoryPicker();
            const fileHandle = await dirHandle.getFileHandle('gym_backup.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            showToast('✅ Backup saved to device!', 'success');
        } else {
            exportData();
        }
    } catch (error) {
        console.error('Backup failed:', error);
        exportData();
    }
}

// Update backup info display (showing months but no export buttons)
function updateBackupInfo() {
    const backupDetails = document.getElementById('backupDetails');
    if (!backupDetails) return;

    const workouts = workoutData.workouts;
    if (workouts.length === 0) {
        backupDetails.innerHTML = '<p>✨ No data yet. Add your first workout!</p>';
        return;
    }

    // Group workouts by month
    const monthGroups = {};
    workouts.forEach(w => {
        if (w.date) {
            const monthYear = w.date.substring(0, 7);
            if (!monthGroups[monthYear]) monthGroups[monthYear] = [];
            monthGroups[monthYear].push(w);
        }
    });

    const sortedMonths = Object.keys(monthGroups).sort().reverse();

    let html = '<div style="display: grid; gap: 8px;">';
    sortedMonths.forEach(month => {
        const monthWorkouts = monthGroups[month];
        const [year, monthNum] = month.split('-');
        const monthName = new Date(year, monthNum - 1).toLocaleString('default', { month: 'long' });

        let totalVolume = 0;
        monthWorkouts.forEach(w => {
            if (w.sets && w.weight) totalVolume += w.sets * w.weight;
        });

        // Just show info, no export button
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-card); border-radius: 8px;">
                <div>
                    <strong style="color: var(--accent-primary);">📅 ${monthName} ${year}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">
                        💪 ${monthWorkouts.length} workouts | 🏋️ ${totalVolume.toLocaleString()} kg volume
                    </div>
                </div>
                <span style="font-size: 0.7rem; color: var(--text-muted);">✓ Backed up in full export</span>
            </div>
        `;
    });
    html += '</div>';

    // Add total summary
    const totalWorkouts = workouts.length;
    const uniqueDates = [...new Set(workouts.map(w => w.date))];
    const totalDays = uniqueDates.length;

    html += `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
            <div style="display: flex; gap: 20px; justify-content: space-around;">
                <div style="text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted);">📊 Total Workouts</div>
                    <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-primary);">${totalWorkouts}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted);">📆 Active Days</div>
                    <div style="font-size: 1.3rem; font-weight: bold;">${totalDays}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted);">💾 Last Backup</div>
                    <div style="font-size: 0.75rem;">${localStorage.getItem('lastBackupDate') || 'Never'}</div>
                </div>
            </div>
        </div>
    `;

    backupDetails.innerHTML = html;
}

// Event Listeners
document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
document.getElementById('importDataBtn')?.addEventListener('click', importData);
document.getElementById('backupToDeviceBtn')?.addEventListener('click', backupToDevice);

// Initialize backup info
setTimeout(() => {
    updateBackupInfo();
}, 500);

// Call updateBackupInfo after any data change
const originalSaveDataBackup = saveData;
if (originalSaveDataBackup) {
    window.saveData = function () {
        originalSaveDataBackup();
        updateBackupInfo();
    };
}

// Update on page load
document.addEventListener('DOMContentLoaded', function () {
    updateBackupInfo();
});



// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    document.getElementById('dateFilter').addEventListener('change', e => {
        currentFilter.date = e.target.value;
        currentFilter.month = '';
        document.getElementById('monthFilter').value = '';
        renderTable();
        updateStats();
        updateMuscleChart();
    });

    document.getElementById('muscleFilter').addEventListener('change', e => {
        currentFilter.muscle = e.target.value;
        renderTable();
        updateStats();
        updateMuscleChart();
    });

    document.getElementById('monthFilter').addEventListener('change', e => {
        currentFilter.month = e.target.value;
        currentFilter.date = '';
        document.getElementById('dateFilter').value = '';
        renderTable();
        updateStats();
        updateMuscleChart();
    });

    document.getElementById('clearFilterBtn').addEventListener('click', () => {
        document.getElementById('dateFilter').value = '';
        document.getElementById('muscleFilter').value = '';
        document.getElementById('monthFilter').value = '';
        currentFilter = { date: '', muscle: '', month: '' };
        renderTable();
        updateStats();
        updateMuscleChart();
    });

    document.getElementById('deleteMonthBtn').addEventListener('click', deleteMonthData);
    document.getElementById('downloadMonthBtn').addEventListener('click', downloadMonthPDF);
    document.getElementById('addWorkoutBtn').addEventListener('click', addWorkout);
    document.getElementById('addColumnBtn').addEventListener('click', addNewColumn);
    document.getElementById('deleteColumnBtn').addEventListener('click', deleteColumn);
    document.getElementById('updateWorkoutBtn').addEventListener('click', updateWorkout);
    document.getElementById('cancelEditBtn').addEventListener('click', closeModal);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    // Add these in setupEventListeners() function
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('importDataBtn')?.addEventListener('click', importData);
    document.getElementById('backupToDeviceBtn')?.addEventListener('click', backupToDevice);

    document.getElementById('editModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}



// ========== MUSCLE MAPPING (Major -> Sub-muscles) ==========
const muscleMapping = {
    'Chest': ['Upper chest', 'Middle chest', 'Lower chest', 'Chest'],
    'Back': ['Lats', 'Upper back', 'Middle back', 'Lower back', 'Back'],
    'Arms': ['Bicep short head', 'Bicep long head', 'Tricep long head', 'Tricep short head', 'Short head', 'Long head', 'Arms'],
    'Shoulder': ['Front delt', 'Rear delt', 'Lateral delt', 'Traps', 'Shoulder'],
    'All muscles': ['All muscles', 'Lats', 'Upper back', 'Traps', 'Short head', 'Long head', 'Upper chest', 'Middle chest', 'Lower chest', 'Front delt', 'Rear delt', 'Lateral delt', 'Bicep short head', 'Bicep long head', 'Tricep long head', 'Tricep short head']
};

// Get all sub-muscles for a major muscle
function getSubMuscles(majorMuscle) {
    return muscleMapping[majorMuscle] || [majorMuscle];
}

// Populate muscle filter with ONLY major muscles
function populateMuscleFilter() {
    const majorMuscles = ['Chest', 'Back', 'Arms', 'Shoulder', 'All muscles'];
    const muscleSelect = document.getElementById('muscleFilter');

    if (!muscleSelect) return;

    // Clear existing options except first
    while (muscleSelect.options.length > 1) {
        muscleSelect.remove(1);
    }

    majorMuscles.forEach(muscle => {
        const option = document.createElement('option');
        option.value = muscle;
        option.textContent = muscle;
        muscleSelect.appendChild(option);
    });
}

// Get filtered workouts based on major muscle selection
function getFilteredWorkouts() {
    let filtered = [...workoutData.workouts];

    // Date filter
    if (currentFilter.date) {
        filtered = filtered.filter(w => w.date === currentFilter.date);
    }

    // Month filter
    if (currentFilter.month) {
        filtered = filtered.filter(w => w.date && w.date.startsWith(currentFilter.month));
    }

    // Muscle filter - if major muscle selected, include ALL its sub-muscles
    if (currentFilter.muscle) {
        const subMuscles = getSubMuscles(currentFilter.muscle);
        filtered = filtered.filter(w => {
            const workoutMuscle = w.targetMuscle || '';
            // Check if workout's target muscle matches ANY sub-muscle of selected major muscle
            return subMuscles.some(sub =>
                workoutMuscle.toLowerCase().includes(sub.toLowerCase()) ||
                sub.toLowerCase().includes(workoutMuscle.toLowerCase())
            );
        });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    return filtered;
}

// ========== DETAILED MUSCLE ANALYTICS (Shows sub-muscles breakdown) ==========
function getDetailedMuscleAnalytics() {
    const filtered = getFilteredWorkouts();

    if (filtered.length === 0) return null;

    // Group by target muscle (sub-muscles)
    const muscleGroups = {};

    filtered.forEach(workout => {
        const muscle = workout.targetMuscle || 'Unknown';
        if (!muscleGroups[muscle]) {
            muscleGroups[muscle] = {
                name: muscle,
                totalWorkouts: 0,
                totalSets: 0,
                totalVolume: 0,
                exercises: {},
                dates: []
            };
        }

        muscleGroups[muscle].totalWorkouts++;
        muscleGroups[muscle].totalSets += (workout.sets || 0);
        muscleGroups[muscle].totalVolume += ((workout.sets || 0) * (workout.weight || 0));

        // Track exercises per muscle
        const exerciseName = workout.exercise || 'Unknown';
        if (!muscleGroups[muscle].exercises[exerciseName]) {
            muscleGroups[muscle].exercises[exerciseName] = 0;
        }
        muscleGroups[muscle].exercises[exerciseName]++;

        // Track dates
        if (workout.date && !muscleGroups[muscle].dates.includes(workout.date)) {
            muscleGroups[muscle].dates.push(workout.date);
        }
    });

    return muscleGroups;
}

function updateDetailedAnalytics() {
    const filtered = getFilteredWorkouts();
    const statsContainer = document.getElementById('statsGrid');
    const selectedMuscle = currentFilter.muscle;

    if (filtered.length === 0) {
        if (statsContainer) {
            statsContainer.innerHTML = '<div class="no-data-message">No data available for selected filter. Try selecting a different muscle or month.</div>';
        }
        return;
    }

    // Group workouts by DATE first
    const workoutsByDate = {};
    filtered.forEach(workout => {
        const date = workout.date;
        if (!workoutsByDate[date]) {
            workoutsByDate[date] = [];
        }
        workoutsByDate[date].push(workout);
    });

    // Sort dates (newest first)
    const sortedDates = Object.keys(workoutsByDate).sort((a, b) => new Date(b) - new Date(a));

    let html = '';

    // Show selected major muscle info header
    if (selectedMuscle) {
        const subMusclesList = getSubMuscles(selectedMuscle).filter(m => m !== selectedMuscle);
        const uniqueSubMuscles = [...new Set(filtered.map(w => w.targetMuscle))];

        html += `
            <div class="stat-card" style="grid-column: span 3; background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%); margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0;">🎯 Filtering: ${selectedMuscle}</h4>
                <div style="font-size: 0.8rem; margin-bottom: 10px;">
                    📌 Sub-muscles trained: ${uniqueSubMuscles.join(', ')}
                </div>
                <div style="display: flex; justify-content: space-around; text-align: center; margin-top: 10px;">
                    <div>
                        <div style="font-size: 1.8rem; font-weight: bold;">${filtered.length}</div>
                        <div style="font-size: 0.7rem;">Total Exercises</div>
                    </div>
                    <div>
                        <div style="font-size: 1.8rem; font-weight: bold;">${sortedDates.length}</div>
                        <div style="font-size: 0.7rem;">Active Days</div>
                    </div>
                    <div>
                        <div style="font-size: 1.8rem; font-weight: bold;">${uniqueSubMuscles.length}</div>
                        <div style="font-size: 0.7rem;">Sub-Muscles</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Create a card for EACH DATE
    sortedDates.forEach(date => {
        const workoutsOnDate = workoutsByDate[date];
        const totalExercises = workoutsOnDate.length;

        // Calculate stats for this date
        let totalSets = 0;
        let totalVolume = 0;
        workoutsOnDate.forEach(w => {
            totalSets += (w.sets || 0);
            totalVolume += ((w.sets || 0) * (w.weight || 0));
        });

        // Get unique sub-muscles for this date
        const subMusclesOnDate = [...new Set(workoutsOnDate.map(w => w.targetMuscle))];

        // Format date nicely
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Start date card
        html += `
            <div class="stat-card date-workout-card" style="grid-column: span 3; margin-bottom: 20px; padding: 0; overflow: hidden;">
                <!-- Date Header -->
                <div style="background: linear-gradient(135deg, var(--accent-primary) 0%, #2a9d8f 100%); padding: 15px 20px; color: #080c14;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.2rem;">📅 ${formattedDate}</h3>
                            <div style="font-size: 0.75rem; margin-top: 5px; opacity: 0.9;">${totalExercises} exercises | ${totalSets} sets | ${totalVolume.toLocaleString()} kg volume</div>
                        </div>
                        <div>
                            <span style="background: rgba(8,12,20,0.3); padding: 5px 12px; border-radius: 20px; font-size: 0.7rem;">
                                🎯 ${subMusclesOnDate.join(', ')}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Exercises Table for this date -->
                <div style="padding: 15px 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border-color);">
                                <th style="text-align: left; padding: 10px 8px;">🏋️ Exercise</th>
                                <th style="text-align: left; padding: 10px 8px;">🎯 Sub-Muscle</th>
                                <th style="text-align: center; padding: 10px 8px;">Sets</th>
                                <th style="text-align: center; padding: 10px 8px;">Reps</th>
                                <th style="text-align: center; padding: 10px 8px;">Weight (kg)</th>
                                <th style="text-align: center; padding: 10px 8px;">Rest (sec)</th>
                                <th style="text-align: center; padding: 10px 8px;">💧 Dropset</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${workoutsOnDate.map(workout => `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 10px 8px; font-weight: 500;">${workout.exercise || '-'}</td>
                                    <td style="padding: 10px 8px;">${workout.targetMuscle || '-'}</td>
                                    <td style="text-align: center; padding: 10px 8px;">${workout.sets || '-'}</td>
                                    <td style="text-align: center; padding: 10px 8px;">${workout.reps || '-'}</td>
                                    <td style="text-align: center; padding: 10px 8px;">${workout.weight || '-'}</td>
                                    <td style="text-align: center; padding: 10px 8px;">${workout.restTime || '-'}</td>
                                    <td style="text-align: center; padding: 10px 8px;">${workout.dropset && workout.dropset > 0 ? `✓ (${workout.dropset})` : '✗'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    // Add CSS for responsive table on small screens
    if (statsContainer) {
        statsContainer.innerHTML = html;

        // Add responsive style for tables
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                .date-workout-card table {
                    font-size: 0.7rem;
                }
                .date-workout-card th,
                .date-workout-card td {
                    padding: 6px 4px !important;
                }
            }
            .date-workout-card {
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .date-workout-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
        `;
        if (!document.querySelector('#date-card-styles')) {
            style.id = 'date-card-styles';
            document.head.appendChild(style);
        }
    }
}

// Update muscle chart to show sub-muscle distribution
function updateMuscleChart() {
    const workouts = getFilteredWorkouts();
    const muscleCount = {};

    workouts.forEach(w => {
        if (w.targetMuscle) {
            muscleCount[w.targetMuscle] = (muscleCount[w.targetMuscle] || 0) + 1;
        }
    });

    const sorted = Object.entries(muscleCount).sort((a, b) => b[1] - a[1]).slice(0, 8); // Show top 8 sub-muscles

    if (muscleChart) {
        muscleChart.destroy();
    }

    const ctx = document.getElementById('muscleChart').getContext('2d');

    if (sorted.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '14px Inter';
        ctx.fillStyle = '#5a6b80';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    muscleChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                data: sorted.map(s => s[1]),
                backgroundColor: [
                    '#00d4aa', '#3742fa', '#ffa502', '#ff4757',
                    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#8fa3bf',
                        font: { family: 'Inter', size: 11 },
                        padding: 12,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} workouts (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Update stats function to use detailed analytics when muscle filter is active
function updateStats() {
    const hasMuscleFilter = currentFilter.muscle;
    if (hasMuscleFilter || getFilteredWorkouts().length > 0) {
        updateDetailedAnalytics();
    } else {
        // Original stats function logic for no filter
        const workouts = getFilteredWorkouts();
        const container = document.getElementById('statsGrid');

        if (workouts.length === 0) {
            container.innerHTML = '<div class="no-data-message">No data available for selected filter.</div>';
            return;
        }

        const totalWorkouts = workouts.length;
        const uniqueDates = [...new Set(workouts.map(w => w.date))];
        const totalDays = uniqueDates.length;
        const avg = totalDays > 0 ? (totalWorkouts / totalDays).toFixed(1) : 0;

        let totalVolume = 0, totalSets = 0;
        workouts.forEach(w => {
            if (w.sets && w.weight) totalVolume += w.sets * w.weight;
            if (w.sets) totalSets += w.sets;
        });

        const muscleCount = {};
        workouts.forEach(w => {
            if (w.targetMuscle) {
                muscleCount[w.targetMuscle] = (muscleCount[w.targetMuscle] || 0) + 1;
            }
        });
        const topMuscle = Object.entries(muscleCount).sort((a, b) => b[1] - a[1])[0];

        const maxWeights = {};
        workouts.forEach(w => {
            if (w.exercise && w.weight) {
                maxWeights[w.exercise] = Math.max(maxWeights[w.exercise] || 0, w.weight);
            }
        });
        const maxWeight = Math.max(0, ...Object.values(maxWeights));

        container.innerHTML = `
            <div class="stat-card">
                <h4>Total Workouts</h4>
                <div class="stat-value">${totalWorkouts}</div>
                <div class="stat-trend">${totalDays} active days</div>
            </div>
            <div class="stat-card">
                <h4>Total Volume</h4>
                <div class="stat-value">${totalVolume.toLocaleString()} kg</div>
                <div class="stat-trend">${totalSets} sets</div>
            </div>
            <div class="stat-card">
                <h4>Avg/Day</h4>
                <div class="stat-value">${avg}</div>
                <div class="stat-trend">workouts per day</div>
            </div>
            <div class="stat-card">
                <h4>Top Muscle</h4>
                <div class="stat-value">${topMuscle ? topMuscle[0] : '-'}</div>
                <div class="stat-trend">${topMuscle ? topMuscle[1] + ' workouts' : ''}</div>
            </div>
            <div class="stat-card">
                <h4>Max Weight</h4>
                <div class="stat-value">${maxWeight} kg</div>
                <div class="stat-trend">${Object.keys(maxWeights).length} exercises</div>
            </div>
            <div class="stat-card">
                <h4>Exercises</h4>
                <div class="stat-value">${Object.keys(maxWeights).length}</div>
                <div class="stat-trend">unique tracked</div>
            </div>
        `;
    }
}

// Fix the clear filter to work properly
const originalClearFilter = document.getElementById('clearFilterBtn')?.onclick;
if (document.getElementById('clearFilterBtn')) {
    document.getElementById('clearFilterBtn').onclick = () => {
        document.getElementById('dateFilter').value = '';
        document.getElementById('muscleFilter').value = '';
        document.getElementById('monthFilter').value = '';
        currentFilter = { date: '', muscle: '', month: '' };
        renderTable();
        updateStats();
        updateMuscleChart();
    };
}

// Start the application
init();