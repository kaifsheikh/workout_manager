    // ==================== GLOBAL STATE ====================
        let exercisesData = []; // will be loaded from workout.json
        let activeFilters = {
            muscle: null,
            category: null,
            type: null,
            search: ''
        };

        // ==================== DOM REFS ====================
        const cardsGrid = document.getElementById('cardsGrid');
        const searchInput = document.getElementById('searchInput');
        const totalCountEl = document.getElementById('totalCount');
        const filteredCountEl = document.getElementById('filteredCount');
        const filterIndicator = document.getElementById('filterIndicator');
        const resultsTitle = document.getElementById('resultsTitle');
        const muscleDropdownMenu = document.getElementById('muscleDropdownMenu');
        const categoryDropdownMenu = document.getElementById('categoryDropdownMenu');
        const typeDropdownMenu = document.getElementById('typeDropdownMenu');
        const muscleDropdownBtn = document.getElementById('muscleDropdownBtn');
        const categoryDropdownBtn = document.getElementById('categoryDropdownBtn');
        const typeDropdownBtn = document.getElementById('typeDropdownBtn');

        // ==================== DATA LOADING ====================
        async function loadExercises() {
            try {
                const response = await fetch('./workout.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                exercisesData = await response.json();
                console.log(`✅ Loaded ${exercisesData.length} exercises from workout.json`);
                init();
            } catch (error) {
                console.error('❌ Failed to load workout.json:', error);
                cardsGrid.innerHTML = `
                    <div class="no-results">
                        <span class="icon">⚠️</span>
                        <strong>Failed to load exercise data</strong><br>
                        <span style="font-size:0.9rem;">Please ensure "workout.json" is in the same directory.</span>
                    </div>`;
            }
        }

        // ==================== HELPERS ====================
        function getUniqueValues(key, dataArray = exercisesData) {
            return [...new Set(dataArray.map(ex => ex[key]))].sort();
        }

        function getAvailableCategories() {
            let data = exercisesData;
            if (activeFilters.muscle) data = data.filter(ex => ex.muscle === activeFilters.muscle);
            return [...new Set(data.map(ex => ex.category))].sort();
        }

        function getAvailableTypes() {
            let data = exercisesData;
            if (activeFilters.muscle) data = data.filter(ex => ex.muscle === activeFilters.muscle);
            return [...new Set(data.map(ex => ex.type))].sort();
        }

        function getAvailableMuscles() {
            return [...new Set(exercisesData.map(ex => ex.muscle))].sort();
        }

        // ==================== DROPDOWN BUILDING ====================
        function buildDropdown(menuEl, options, filterKey, selectedValue, colorMap = null) {
            menuEl.innerHTML = '';
            const allOption = document.createElement('div');
            allOption.className = 'option option-all' + (selectedValue === null ? ' selected-option' : '');
            allOption.textContent = '📋 All';
            allOption.addEventListener('click', () => {
                activeFilters[filterKey] = null;
                onFilterChanged(filterKey);
                closeAllDropdowns();
            });
            menuEl.appendChild(allOption);

            if (options.length === 0) {
                const emptyOption = document.createElement('div');
                emptyOption.className = 'option';
                emptyOption.style.color = '#666';
                emptyOption.style.cursor = 'default';
                emptyOption.textContent = '— No options —';
                menuEl.appendChild(emptyOption);
            } else {
                options.forEach(opt => {
                    const div = document.createElement('div');
                    div.className = 'option' + (selectedValue === opt ? ' selected-option' : '');
                    if (colorMap && colorMap[opt]) {
                        div.innerHTML =
                            `<span class="dot" style="background:${colorMap[opt]}; box-shadow: 0 0 8px ${colorMap[opt]};"></span> ${opt}`;
                    } else {
                        div.textContent = opt;
                    }
                    div.addEventListener('click', () => {
                        activeFilters[filterKey] = opt;
                        onFilterChanged(filterKey);
                        closeAllDropdowns();
                    });
                    menuEl.appendChild(div);
                });
            }
        }

        const muscleColorMap = {
            'Chest': 'var(--chest)',
            'Back': 'var(--back)',
            'Biceps': 'var(--biceps)',
            'Triceps': 'var(--triceps)',
            'Shoulders': 'var(--shoulders)',
            'Legs': 'var(--legs)',
            'Abs': 'var(--abs)',
        };

        function updateAllDropdowns() {
            const availableMuscles = getAvailableMuscles();
            const availableCategories = getAvailableCategories();
            const availableTypes = getAvailableTypes();

            // Validate selections against available options
            if (activeFilters.muscle && !availableMuscles.includes(activeFilters.muscle)) activeFilters.muscle = null;
            if (activeFilters.category && !availableCategories.includes(activeFilters.category)) activeFilters.category =
                null;
            if (activeFilters.type && !availableTypes.includes(activeFilters.type)) activeFilters.type = null;

            buildDropdown(muscleDropdownMenu, availableMuscles, 'muscle', activeFilters.muscle, muscleColorMap);
            buildDropdown(categoryDropdownMenu, availableCategories, 'category', activeFilters.category);
            buildDropdown(typeDropdownMenu, availableTypes, 'type', activeFilters.type);

            updateDropdownButtonStyles();
            updateFilterIndicator();
            updateResultsTitle();
        }

        function onFilterChanged(changedFilter) {
            if (changedFilter === 'muscle') {
                const availableCategories = getAvailableCategories();
                const availableTypes = getAvailableTypes();
                if (activeFilters.category && !availableCategories.includes(activeFilters.category)) activeFilters
                    .category = null;
                if (activeFilters.type && !availableTypes.includes(activeFilters.type)) activeFilters.type = null;
            }
            updateAllDropdowns();
            renderCards();
        }

        function updateDropdownButtonStyles() {
            const configs = [
                { btn: muscleDropdownBtn, filterKey: 'muscle', icon: '🎯', label: 'Muscle' },
                { btn: categoryDropdownBtn, filterKey: 'category', icon: '📂', label: 'Category' },
                { btn: typeDropdownBtn, filterKey: 'type', icon: '🏷️', label: 'Type' },
            ];
            configs.forEach(({ btn, filterKey, icon, label }) => {
                const val = activeFilters[filterKey];
                if (val) {
                    btn.classList.add('active-filter');
                    btn.innerHTML =
                        `<span class="btn-icon">${icon}</span> ${label}: <span style="color:#ff8c5a;font-weight:700;">${val}</span> <span class="arrow">▾</span>`;
                } else {
                    btn.classList.remove('active-filter');
                    btn.innerHTML = `<span class="btn-icon">${icon}</span> ${label} <span class="arrow">▾</span>`;
                }
            });
        }

        function updateFilterIndicator() {
            const hasFilters = activeFilters.muscle || activeFilters.category || activeFilters.type || activeFilters
                .search;
            filterIndicator.classList.toggle('visible', hasFilters);
        }

        function updateResultsTitle() {
            const parts = [];
            if (activeFilters.muscle) parts.push(`<strong>${activeFilters.muscle}</strong>`);
            if (activeFilters.category) parts.push(`<strong>${activeFilters.category}</strong>`);
            if (activeFilters.type) parts.push(`<strong>${activeFilters.type}</strong>`);
            if (activeFilters.search) parts.push(`matching "<strong>${activeFilters.search}</strong>"`);
            resultsTitle.innerHTML = parts.length === 0 ? 'Showing <strong>all exercises</strong>' : 'Filtered by: ' +
                parts.join(' › ');
        }

        // ==================== DROPDOWN TOGGLE ====================
        let openDropdown = null;

        function toggleDropdown(type) {
            const menuMap = {
                muscle: { menu: muscleDropdownMenu, btn: muscleDropdownBtn },
                category: { menu: categoryDropdownMenu, btn: categoryDropdownBtn },
                type: { menu: typeDropdownMenu, btn: typeDropdownBtn },
            };
            const { menu, btn } = menuMap[type];

            if (openDropdown === type) {
                menu.classList.remove('show');
                btn.classList.remove('open-dropdown');
                openDropdown = null;
                return;
            }
            Object.values(menuMap).forEach(({ menu: m, btn: b }) => {
                m.classList.remove('show');
                b.classList.remove('open-dropdown');
            });
            menu.classList.add('show');
            btn.classList.add('open-dropdown');
            openDropdown = type;
        }

        function closeAllDropdowns() {
            [muscleDropdownMenu, categoryDropdownMenu, typeDropdownMenu].forEach(m => m.classList.remove('show'));
            [muscleDropdownBtn, categoryDropdownBtn, typeDropdownBtn].forEach(b => b.classList.remove('open-dropdown'));
            openDropdown = null;
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-wrapper') && openDropdown) closeAllDropdowns();
        });

        // ==================== FILTER LOGIC ====================
        function getFilteredExercises() {
            return exercisesData.filter(ex => {
                if (activeFilters.muscle && ex.muscle !== activeFilters.muscle) return false;
                if (activeFilters.category && ex.category !== activeFilters.category) return false;
                if (activeFilters.type && ex.type !== activeFilters.type) return false;
                if (activeFilters.search) {
                    const query = activeFilters.search.toLowerCase().trim();
                    const altNames = [];
                    if (ex.alternative_id) {
                        const altIds = Array.isArray(ex.alternative_id) ? ex.alternative_id : [ex.alternative_id];
                        altIds.forEach(id => {
                            const aEx = exercisesData.find(e => e.id === id);
                            if (aEx) altNames.push(aEx.exerciseName);
                        });
                    }
                    const searchable = [
                        ex.exerciseName, ex.muscle, ex.category, ex.targetMuscle, ex.type,
                        ...altNames
                    ].join(' ').toLowerCase();
                    if (!searchable.includes(query)) return false;
                }
                return true;
            });
        }

        // ==================== RENDER CARDS ====================
        function getBadgeClass(muscle) {
            const map = {
                'Chest': 'badge-chest',
                'Back': 'badge-back',
                'Biceps': 'badge-biceps',
                'Triceps': 'badge-triceps',
                'Shoulders': 'badge-shoulders',
                'Legs': 'badge-legs',
                'Abs': 'badge-abs'
            };
            return map[muscle] || 'badge-chest';
        }

        function getAccentClass(muscle) {
            const map = {
                'Chest': 'accent-chest',
                'Back': 'accent-back',
                'Biceps': 'accent-biceps',
                'Triceps': 'accent-triceps',
                'Shoulders': 'accent-shoulders',
                'Legs': 'accent-legs',
                'Abs': 'accent-abs'
            };
            return map[muscle] || 'accent-chest';
        }

        function getTypeClass(type) {
            const map = { 'Hypertrophy': 'type-hypertrophy', 'Strength': 'type-strength', 'Endurance': 'type-endurance' };
            return map[type] || '';
        }

        function getMuscleEmoji(muscle) {
            const icons = { 'Chest': '🏋️', 'Back': '🔙', 'Biceps': '💪', 'Triceps': '🦾', 'Shoulders': '🦿', 'Legs': '🦵',
                'Abs': '🧘' };
            return icons[muscle] || '🏋️';
        }

        function scrollToResults() {
            const grid = document.getElementById('cardsGrid');
            if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function updateDots(event, slider) {
            const scrollLeft = slider.scrollLeft;
            const width = slider.offsetWidth;
            if (width === 0) return;
            const index = Math.round(scrollLeft / width);
            
            const card = slider.closest('.card-img-section');
            if (card) {
                const dots = card.querySelectorAll('.dot-nav');
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active-dot', i === index);
                });
            }
        }

        function checkEmptySlider(img) {
            const slider = img.parentElement;
            let hasVisible = false;
            const imgs = slider.querySelectorAll('.slide-image');
            for (let i = 0; i < imgs.length; i++) {
                if (imgs[i].style.display !== 'none') {
                    hasVisible = true;
                    break;
                }
            }
            if (!hasVisible) {
                slider.style.display = 'none';
                const card = slider.closest('.card-img-section');
                if (card) {
                    const dots = card.querySelector('.card-dots-nav');
                    if (dots) dots.style.display = 'none';
                }
            }
        }

        function filterByExerciseId(id) {
            const ex = exercisesData.find(e => e.id === id);
            if (ex) {
                activeFilters.search = ex.exerciseName;
                searchInput.value = ex.exerciseName;
                activeFilters.muscle = null;
                activeFilters.category = null;
                activeFilters.type = null;
                updateAllDropdowns();
                renderCards();
                scrollToResults();
            }
        }

        function renderCards() {
            const filtered = getFilteredExercises();
            totalCountEl.textContent = exercisesData.length;
            filteredCountEl.textContent = filtered.length;
            updateFilterIndicator();
            updateResultsTitle();

            if (filtered.length === 0) {
                cardsGrid.innerHTML = `
                    <div class="no-results">
                        <span class="icon">😕</span>
                        <strong>No exercises found</strong><br>
                        <span style="font-size:0.95rem;color:var(--text3);">Try adjusting your filters or search query.</span>
                    </div>`;
                return;
            }

            cardsGrid.innerHTML = filtered.map((ex, index) => {
                const badgeClass = getBadgeClass(ex.muscle);
                const accentClass = getAccentClass(ex.muscle);
                const typeClass = getTypeClass(ex.type);
                const emoji = getMuscleEmoji(ex.muscle);
                const imageCount = ex.images.length;
                const altIds = Array.isArray(ex.alternative_id) ? ex.alternative_id : (ex.alternative_id ? [ex.alternative_id] : []);

                const alternativesHTML = altIds.length > 0 ?
                    altIds.map(altId => {
                        const altEx = exercisesData.find(e => e.id === altId);
                        if (!altEx) return '';
                        return `<span class="alt-link" onclick="filterByExerciseId(${altId})" title="Show this exercise">${altEx.exerciseName}</span>`;
                    }).filter(Boolean).join('') :
                    '<span class="alt-link no-alt">None</span>';

                const dotsHTML = ex.images ? ex.images.map((_, i) =>
                    `<span class="dot-nav ${i === 0 ? 'active-dot' : ''}"></span>`).join('') : '';

                const imagesHTML = ex.images && ex.images.length > 0 ? 
                    `<div class="image-slider" onscroll="updateDots(event, this)">
                        ${ex.images.map(img => `<img src="${img}" class="slide-image" alt="${ex.exerciseName}" onerror="this.style.display='none'; checkEmptySlider(this)">`).join('')}
                    </div>` : '';

                return `
                <div class="exercise-card" style="animation-delay: ${index * 0.04}s;">
                    <div class="card-accent-line ${accentClass}"></div>
                    <div class="card-img-section">
                        ${imagesHTML}
                        <div class="img-placeholder" style="${ex.images && ex.images.length > 0 ? 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;' : ''}">
                            <span class="muscle-emoji">${emoji}</span>
                        </div>
                        <span class="muscle-badge-top ${badgeClass}" style="z-index: 3;">${ex.muscle}</span>
                        <span class="image-count-badge" style="z-index: 3;">📷 ${imageCount} image${imageCount>1?'s':''}</span>
                        <div class="card-dots-nav" style="z-index: 3;">${dotsHTML}</div>
                    </div>
                    <div class="card-body">
                        <h3 class="exercise-name">${ex.exerciseName}</h3>
                        <div class="meta-row">
                            <span class="tag ${typeClass}">⚡ ${ex.type}</span>
                            <span class="tag">📂 ${ex.category}</span>
                            <span class="tag">🎯 ${ex.targetMuscle}</span>
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">📊 Sets</span>
                                <span class="info-value">${ex.sets}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">🔁 Reps</span>
                                <span class="info-value">${ex.reps}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">⏱️ Rest Time</span>
                                <span class="info-value">${ex.restTime}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">💪 Target</span>
                                <span class="info-value">${ex.targetMuscle}</span>
                            </div>
                        </div>
                        <div class="alt-exercises">
                            <strong>🔄 Alternatives:</strong> ${alternativesHTML}
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        // ==================== CLEAR FILTERS ====================
        function clearAllFilters() {
            activeFilters = { muscle: null, category: null, type: null, search: '' };
            searchInput.value = '';
            updateAllDropdowns();
            renderCards();
            closeAllDropdowns();
        }

        // ==================== SEARCH ====================
        searchInput.addEventListener('input', () => {
            activeFilters.search = searchInput.value.trim();
            updateAllDropdowns();
            renderCards();
        });

        // ==================== INIT ====================
        function init() {
            updateAllDropdowns();
            renderCards();
            updateFilterIndicator();
            updateResultsTitle();
        }

        // Start: load data from JSON then initialize
        loadExercises();