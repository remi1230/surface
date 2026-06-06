/**
 * Shader CRUD System
 * Gère la création, lecture, mise à jour et suppression des shaders
 * Utilise ShaderLoader pour charger depuis le serveur et sauvegarder dans localStorage
 *
 * Les shaders peuvent être nommés avec un commentaire en première ligne :
 * // Mon Shader
 * vec3 col = ...
 */

const ShaderCRUD = {
    // Index du shader en cours d'édition
    currentShaderIndex: 0,

    // Flag pour savoir si on est en mode création
    isCreatingNew: false,

    /**
     * Initialise le système CRUD
     */
    init: async function() {
        // Charger les shaders depuis le serveur ou localStorage
        await ShaderLoader.load();

        this.populateSelect();
        this.bindEvents();
        this.currentShaderIndex = glo.numShaderSelect;
        this.updateSelectValue();
        this.updateStorageIndicator();
    },

    /**
     * Met à jour l'indicateur de stockage local
     */
    updateStorageIndicator: function() {
        const indicator = getById('storageIndicator');
        if (indicator) {
            if (ShaderLoader.hasLocalChanges) {
                indicator.textContent = '💾 Local';
                indicator.title = 'Modifications sauvegardées localement. Cliquez pour recharger depuis le serveur.';
                indicator.style.display = 'inline-block';
            } else {
                indicator.textContent = '☁️ Serveur';
                indicator.title = 'Shaders chargés depuis le serveur';
                indicator.style.display = 'inline-block';
            }
        }
    },

    /**
     * Extrait le nom du shader depuis le commentaire de première ligne
     * Format attendu : // Nom du shader
     */
    getShaderName: function(shaderCode, index) {
        if (!shaderCode) return `Shader ${index}`;

        // Chercher un commentaire en première ligne (après les espaces/sauts de ligne)
        const trimmed = shaderCode.trim();
        const match = trimmed.match(/\/\/\s*(.+)/);

        if (match && match[1]) {
            return match[1].trim();
        }

        return `Shader ${index}`;
    },

    /**
     * Sauvegarde les shaders dans localStorage
     * @returns {boolean} true si sauvegarde réussie
     */
    saveToStorage: function() {
        const saved = ShaderLoader.saveToStorage();
        this.updateStorageIndicator();
        return saved;
    },

    /**
     * Recharge les shaders depuis le serveur (efface les modifications locales)
     */
    reloadFromServer: async function() {
        if (ShaderLoader.hasLocalChanges) {
            const confirmReload = confirm(
                'Vous avez des modifications locales.\n\n' +
                'Recharger depuis le serveur effacera ces modifications.\n\n' +
                'Continuer ?'
            );
            if (!confirmReload) return;
        }

        const success = await ShaderLoader.reloadFromServer();
        if (success) {
            this.currentShaderIndex = 0;
            glo.numShaderSelect = 0;
            this.populateSelect();
            this.updateSelectValue();
            this.loadShaderInEditor(0);
            this.compileCurrentShader();
            this.updateStorageIndicator();
            updateStatus('Shaders rechargés depuis le serveur');
        } else {
            updateStatus('Erreur rechargement serveur', true);
        }
    },

    /**
     * Peuple le select avec les shaders disponibles (avec leurs noms)
     */
    populateSelect: function() {
        const select = getById('shaderSelect');
        if (!select) return;

        select.innerHTML = '';

        fragmentShaders.forEach((shader, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = this.getShaderName(shader, index);
            select.appendChild(option);
        });

        if (this.isCreatingNew) {
            const option = document.createElement('option');
            option.value = 'new';
            option.textContent = '* Nouveau shader *';
            select.appendChild(option);
            select.value = 'new';
        }
    },

    /**
     * Met à jour la valeur du select
     */
    updateSelectValue: function() {
        const select = getById('shaderSelect');
        if (select && !this.isCreatingNew) {
            select.value = this.currentShaderIndex;
        }
    },

    /**
     * Attache les événements aux éléments du DOM
     */
    bindEvents: function() {
        const select = getById('shaderSelect');
        if (select) {
            select.addEventListener('change', (e) => this.onSelectChange(e));
        }

        const newBtn = getById('newShaderBtn');
        if (newBtn) {
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.createNew();
            });
        }

        const saveBtn = getById('saveShaderBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.save();
            });
        }

        const deleteBtn = getById('deleteShaderBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.delete();
            });
        }

        const exportBtn = getById('exportShadersBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportAll();
            });
        }

        const importBtn = getById('importShadersBtn');
        if (importBtn) {
            importBtn.addEventListener('click', (e) => {
                e.preventDefault();
                getById('importShadersFile').click();
            });
        }

        const importFile = getById('importShadersFile');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.importFromFile(e));
        }

        // Indicateur de stockage (clic pour recharger depuis le serveur)
        const storageIndicator = getById('storageIndicator');
        if (storageIndicator) {
            storageIndicator.addEventListener('click', (e) => {
                e.preventDefault();
                this.reloadFromServer();
            });
        }
    },

    /**
     * Gère le changement de shader dans le select
     */
    onSelectChange: function(e) {
        const value = e.target.value;

        if (value === 'new') {
            return;
        }

        if (this.isCreatingNew) {
            this.isCreatingNew = false;
            this.populateSelect();
        }

        const index = parseInt(value);
        this.currentShaderIndex = index;

        while(glo.numShaderMove.next().value !== index){ } 

        this.loadShaderInEditor(index);
        this.compileCurrentShader();
    },

    /**
     * Charge le shader COMPLET dans l'éditeur Monaco
     */
    loadShaderInEditor: function(index) {
        if (typeof glo.editor !== 'undefined' && glo.editor) {
            const fullShader = fragmentShaderHeader + fragmentShaders[index] + fragmentShaderFooter;
            glo.editor.setValue(fullShader);
            updateStatus(this.getShaderName(fragmentShaders[index], index) + ' chargé');
        }
    },

    /**
     * Extrait uniquement le fragment depuis l'éditeur
     */
    extractFragmentCode: function() {
        if (typeof glo.editor === 'undefined' || !glo.editor) return '';

        const fullCode = glo.editor.getValue();

        const startTag = 'vec3 col = meshBg;';
        const startPos = fullCode.indexOf(startTag);
        if (startPos === -1) return '';

        const afterStart = fullCode.substring(startPos + startTag.length);

        const footerPos = afterStart.indexOf('// __FOOTER_START__');
        if (footerPos === -1) return '';

        return afterStart.substring(0, footerPos);
    },

    /**
     * Crée un nouveau shader
     */
    createNew: function() {
        this.isCreatingNew = true;

        // Demander un nom pour le shader
        const shaderName = prompt('Nom du nouveau shader :', 'Nouveau shader');
        if (shaderName === null) {
            this.isCreatingNew = false;
            return;
        }

        const newFragment = `
    // ${shaderName}
    col = vec3(1.0);
`;

        this.populateSelect();

        if (typeof glo.editor !== 'undefined' && glo.editor) {
            const fullShader = fragmentShaderHeader + newFragment + fragmentShaderFooter;
            glo.editor.setValue(fullShader);
            updateStatus('Mode création - Modifier et sauvegarder');
        }
    },

    /**
     * Sauvegarde le shader actuel dans localStorage
     */
    save: function() {
        const fragmentCode = this.extractFragmentCode();

        if (!fragmentCode.trim()) {
            updateStatus('Erreur: Code shader vide', true);
            return;
        }

        if (this.isCreatingNew) {
            fragmentShaders.push(fragmentCode);
            this.currentShaderIndex = fragmentShaders.length - 1;
            glo.numShaderSelect = this.currentShaderIndex;
            this.isCreatingNew  = false;
        } else {
            fragmentShaders[this.currentShaderIndex] = fragmentCode;
        }

        const saved = this.saveToStorage();

        if (saved) {
            const name = this.getShaderName(fragmentCode, this.currentShaderIndex);
            updateStatus(name + ' sauvegardé (local)');
        }

        this.populateSelect();
        this.updateSelectValue();
        this.compileCurrentShader();
    },

    /**
     * Supprime le shader actuel
     */
    delete: function() {
        if (fragmentShaders.length <= 1) {
            updateStatus('Erreur: Impossible de supprimer le dernier shader', true);
            return;
        }

        if (this.isCreatingNew) {
            this.isCreatingNew = false;
            this.populateSelect();
            this.loadShaderInEditor(this.currentShaderIndex);
            updateStatus('Création annulée');
            return;
        }

        const shaderName = this.getShaderName(fragmentShaders[this.currentShaderIndex], this.currentShaderIndex);
        if (!confirm('Supprimer "' + shaderName + '" ?')) {
            return;
        }

        fragmentShaders.splice(this.currentShaderIndex, 1);

        if (this.currentShaderIndex >= fragmentShaders.length) {
            this.currentShaderIndex = fragmentShaders.length - 1;
        }
        glo.numShaderSelect = this.currentShaderIndex;

        const saved = this.saveToStorage();

        if (saved) {
            updateStatus(shaderName + ' supprimé');
        }

        this.populateSelect();
        this.updateSelectValue();
        this.loadShaderInEditor(this.currentShaderIndex);
        this.compileCurrentShader();
    },

    /**
     * Exporte tous les shaders (téléchargement)
     */
    exportAll: function() {
        ShaderLoader.exportToFile();
        updateStatus('Fichier shaders-frags.js téléchargé');
    },

    /**
     * Importe des shaders depuis un fichier
     */
    importFromFile: async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Demander si on remplace ou ajoute
            const replace = confirm(
                'Comment importer les shaders ?\n\n' +
                'OK = Remplacer tous les shaders existants\n' +
                'Annuler = Ajouter aux shaders existants'
            );

            const count = await ShaderLoader.importFromFile(file, replace);

            if (replace) {
                this.currentShaderIndex = 0;
            }
            glo.numShaderSelect = this.currentShaderIndex;

            this.populateSelect();
            this.updateSelectValue();
            this.loadShaderInEditor(this.currentShaderIndex);
            this.compileCurrentShader();
            this.updateStorageIndicator();

            updateStatus('Import réussi: ' + count + ' shaders');

        } catch (err) {
            console.error('Erreur import:', err);
            updateStatus('Erreur import: ' + err.message, true);
        }

        e.target.value = '';
    },

    /**
     * Compile le shader actuel
     */
    compileCurrentShader: function() {
        fragmentShader = fragmentShaderHeader + fragmentShaders[glo.numShaderSelect] + fragmentShaderFooter;

        const compileBtn = getById('compileBtn');
        if (compileBtn) {
            compileBtn.click();
        }
    }
};

// ==================== SHADER CRUD NORMAL ====================

const ShaderCRUDNormal = {
    currentShaderIndex: 0,
    isCreatingNew: false,

    // Shader par défaut d'origine (pour réinitialisation)
    defaultNormalShaders: null,

    /** Initializes the normal shader CRUD system, saves defaults, populates select, and binds events. */
    init: function() {
        // Sauvegarder les shaders par défaut au premier init
        if (this.defaultNormalShaders === null) {
            this.defaultNormalShaders = normalShaders.map(s => s);
        }
        this.populateSelect();
        this.bindEvents();
        this.currentShaderIndex = glo.numNormalShaderSelect;
        this.updateSelectValue();
        this.updateStorageIndicator();
    },

    /** Checks if normal shaders have local modifications in localStorage. @returns {boolean} */
    hasLocalChanges: function() {
        return localStorage.getItem('normalShaders') !== null;
    },

    /** Updates the storage indicator DOM element to show local or default status. */
    updateStorageIndicator: function() {
        const indicator = getById('storageIndicatorNormal');
        if (indicator) {
            if (this.hasLocalChanges()) {
                indicator.textContent = '💾 Local';
                indicator.title = 'Modifications sauvegardées localement. Cliquez pour recharger les shaders par défaut.';
                indicator.style.display = 'inline-block';
            } else {
                indicator.textContent = '☁️ Défaut';
                indicator.title = 'Shaders par défaut';
                indicator.style.display = 'inline-block';
            }
        }
    },

    /** Reloads default normal shaders, clearing any local changes. */
    reloadDefaults: function() {
        if (this.hasLocalChanges()) {
            const confirmReload = confirm(
                'Vous avez des modifications locales.\n\n' +
                'Recharger les shaders par défaut effacera ces modifications.\n\n' +
                'Continuer ?'
            );
            if (!confirmReload) return;
        }

        localStorage.removeItem('normalShaders');

        // Restaurer les shaders par défaut
        normalShaders.length = 0;
        this.defaultNormalShaders.forEach(s => normalShaders.push(s));

        this.currentShaderIndex = 0;
        glo.numNormalShaderSelect = 0;
        this.populateSelect();
        this.updateSelectValue();
        this.loadShaderInEditor(0);
        this.compileCurrentShader();
        this.updateStorageIndicator();
        updateStatus('Shaders normaux réinitialisés', false, getById('editorStatusNormal'));
    },

    /**
     * Extracts shader name from a first-line comment or returns a default name.
     * @param {string} shaderCode - The shader source code.
     * @param {number} index - The shader index used for the fallback name.
     * @returns {string} The shader name.
     */
    getShaderName: function(shaderCode, index) {
        if (!shaderCode) return `Normal ${index}`;
        const trimmed = shaderCode.trim();
        const match = trimmed.match(/\/\/\s*(.+)/);
        if (match && match[1]) return match[1].trim();
        return `Normal ${index}`;
    },

    /** Fills the select dropdown with normal shader options. */
    populateSelect: function() {
        const select = getById('shaderSelectNormal');
        if (!select) return;

        select.innerHTML = '';
        normalShaders.forEach((shader, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = this.getShaderName(shader, index);
            select.appendChild(option);
        });

        if (this.isCreatingNew) {
            const option = document.createElement('option');
            option.value = 'new';
            option.textContent = '* Nouveau shader normal *';
            select.appendChild(option);
            select.value = 'new';
        }
    },

    /** Syncs the select element value with currentShaderIndex. */
    updateSelectValue: function() {
        const select = getById('shaderSelectNormal');
        if (select && !this.isCreatingNew) {
            select.value = this.currentShaderIndex;
        }
    },

    /** Attaches DOM event listeners for normal shader CRUD buttons. */
    bindEvents: function() {
        const select = getById('shaderSelectNormal');
        if (select) {
            select.addEventListener('change', (e) => this.onSelectChange(e));
        }

        const newBtn = getById('newShaderBtnNormal');
        if (newBtn) {
            newBtn.addEventListener('click', (e) => { e.preventDefault(); this.createNew(); });
        }

        const saveBtn = getById('saveShaderBtnNormal');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => { e.preventDefault(); this.save(); });
        }

        const deleteBtn = getById('deleteShaderBtnNormal');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => { e.preventDefault(); this.delete(); });
        }

        const exportBtn = getById('exportShadersBtnNormal');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportAll(); });
        }

        const importBtn = getById('importShadersBtnNormal');
        if (importBtn) {
            importBtn.addEventListener('click', (e) => {
                e.preventDefault();
                getById('importShadersFileNormal').click();
            });
        }

        const importFile = getById('importShadersFileNormal');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.importFromFile(e));
        }

        const storageIndicator = getById('storageIndicatorNormal');
        if (storageIndicator) {
            storageIndicator.addEventListener('click', (e) => {
                e.preventDefault();
                this.reloadDefaults();
            });
        }
    },

    /**
     * Handles shader selection change in the dropdown.
     * @param {Event} e - The change event.
     */
    onSelectChange: function(e) {
        const value = e.target.value;
        if (value === 'new') return;

        if (this.isCreatingNew) {
            this.isCreatingNew = false;
            this.populateSelect();
        }

        const index = parseInt(value);
        this.currentShaderIndex = index;
        glo.numNormalShaderSelect = index;

        this.loadShaderInEditor(index);
        this.compileCurrentShader();
    },

    /**
     * Loads a normal shader into the Monaco editor.
     * @param {number} index - The shader index to load.
     */
    loadShaderInEditor: function(index) {
        if (glo.editorNormal) {
            const fullShader = normalShaderHeader + normalShaders[index] + normalShaderFooter;
            glo.editorNormal.setValue(fullShader);
            updateStatus(this.getShaderName(normalShaders[index], index) + ' chargé', false, getById('editorStatusNormal'));
        }
    },

    /** Extracts the editable normal code portion from the editor. @returns {string} */
    extractNormCode: function() {
        if (!glo.editorNormal) return '';

        const fullCode = glo.editorNormal.getValue();

        const startTag = 'float result = 0.0;';
        const endTag = 'return result;';
        const startIndex = fullCode.indexOf(startTag);
        const endIndex = fullCode.indexOf(endTag);

        if (startIndex === -1 || endIndex === -1) return '';

        return fullCode.slice(startIndex + startTag.length, endIndex);
    },

    /** Creates a new normal shader with a user-provided name. */
    createNew: function() {
        this.isCreatingNew = true;

        const shaderName = prompt('Nom du nouveau shader normal :', 'Nouveau shader normal');
        if (shaderName === null) {
            this.isCreatingNew = false;
            return;
        }

        const newCode = `
	// ${shaderName}
	result = sin(x * 5.0) * cos(z * 5.0) * 0.3;
`;

        this.populateSelect();

        if (glo.editorNormal) {
            const fullShader = normalShaderHeader + newCode + normalShaderFooter;
            glo.editorNormal.setValue(fullShader);
            updateStatus('Mode création - Modifier et sauvegarder', false, getById('editorStatusNormal'));
        }
    },

    /** Saves the current normal shader to localStorage. */
    save: function() {
        const normCode = this.extractNormCode();

        if (!normCode.trim()) {
            updateStatus('Erreur: Code shader vide', true, getById('editorStatusNormal'));
            return;
        }

        if (this.isCreatingNew) {
            normalShaders.push(normCode);
            this.currentShaderIndex = normalShaders.length - 1;
            glo.numNormalShaderSelect = this.currentShaderIndex;
            this.isCreatingNew = false;
        } else {
            normalShaders[this.currentShaderIndex] = normCode;
        }

        this.saveToStorage();
        const name = this.getShaderName(normCode, this.currentShaderIndex);
        updateStatus(name + ' sauvegardé (local)', false, getById('editorStatusNormal'));

        this.populateSelect();
        this.updateSelectValue();
        this.compileCurrentShader();
    },

    /** Persists the normal shaders array to localStorage. @returns {boolean} */
    saveToStorage: function() {
        try {
            localStorage.setItem('normalShaders', JSON.stringify(normalShaders));
            this.updateStorageIndicator();
            return true;
        } catch (e) {
            return false;
        }
    },

    /** Loads normal shaders from localStorage. @returns {boolean} */
    loadFromStorage: function() {
        try {
            const data = localStorage.getItem('normalShaders');
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    normalShaders.length = 0;
                    parsed.forEach(s => normalShaders.push(s));
                    return true;
                }
            }
        } catch (e) {}
        return false;
    },

    /** Deletes the current normal shader. */
    delete: function() {
        if (normalShaders.length <= 1) {
            updateStatus('Erreur: Impossible de supprimer le dernier shader', true, getById('editorStatusNormal'));
            return;
        }

        if (this.isCreatingNew) {
            this.isCreatingNew = false;
            this.populateSelect();
            this.loadShaderInEditor(this.currentShaderIndex);
            updateStatus('Création annulée', false, getById('editorStatusNormal'));
            return;
        }

        const shaderName = this.getShaderName(normalShaders[this.currentShaderIndex], this.currentShaderIndex);
        if (!confirm('Supprimer "' + shaderName + '" ?')) return;

        normalShaders.splice(this.currentShaderIndex, 1);
        if (this.currentShaderIndex >= normalShaders.length) {
            this.currentShaderIndex = normalShaders.length - 1;
        }
        glo.numNormalShaderSelect = this.currentShaderIndex;

        this.saveToStorage();
        updateStatus(shaderName + ' supprimé', false, getById('editorStatusNormal'));

        this.populateSelect();
        this.updateSelectValue();
        this.loadShaderInEditor(this.currentShaderIndex);
        this.compileCurrentShader();
    },

    /** Exports all normal shaders as a downloadable JS file. */
    exportAll: function() {
        let content = 'normalShaders = [\n';
        normalShaders.forEach((shader, index) => {
            content += '`' + shader + '`';
            if (index < normalShaders.length - 1) content += ',';
            content += '\n';
        });
        content += '];\n';

        const blob = new Blob([content], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shaders-normal.js';
        a.click();
        URL.revokeObjectURL(url);

        updateStatus('Fichier shaders-normal.js téléchargé', false, getById('editorStatusNormal'));
    },

    /**
     * Imports normal shaders from a file.
     * @param {Event} e - The file input change event.
     */
    importFromFile: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const content = ev.target.result;
                const match = content.match(/normalShaders\s*=\s*\[([\s\S]*)\];/);
                if (!match) throw new Error('Format invalide');

                const inner = match[1];
                const shaders = [];
                const regex = /`([\s\S]*?)`/g;
                let m;
                while ((m = regex.exec(inner)) !== null) {
                    shaders.push(m[1]);
                }
                if (shaders.length === 0) throw new Error('Aucun shader trouvé');

                const replace = confirm(
                    'Comment importer ?\n\nOK = Remplacer tous\nAnnuler = Ajouter aux existants'
                );

                if (replace) {
                    normalShaders.length = 0;
                    shaders.forEach(s => normalShaders.push(s));
                    this.currentShaderIndex = 0;
                } else {
                    shaders.forEach(s => normalShaders.push(s));
                }
                glo.numNormalShaderSelect = this.currentShaderIndex;

                this.saveToStorage();
                this.populateSelect();
                this.updateSelectValue();
                this.loadShaderInEditor(this.currentShaderIndex);
                this.compileCurrentShader();

                updateStatus('Import réussi: ' + shaders.length + ' shaders', false, getById('editorStatusNormal'));
            } catch (err) {
                updateStatus('Erreur import: ' + err.message, true, getById('editorStatusNormal'));
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    /** Compiles the currently selected normal shader. */
    compileCurrentShader: function() {
        normalShader = normalShaderHeader + normalShaders[glo.numNormalShaderSelect] + normalShaderFooter;

        const compileBtn = getById('compileBtnNormal');
        if (compileBtn) {
            compileBtn.click();
        }
    }
};

// ==================== SHADER CRUD GEOMETRY (MESH) ====================
//
// Gère une liste de maillages GLSL custom nommés (sauvegardés dans localStorage),
// en parallèle de l'option "Équations (forme)" qui désactive le code custom.
// Calqué sur ShaderCRUDNormal, adapté à la dualité équations / maillage custom.

const ShaderCRUDGeometry = {
    isCreatingNew: false,

    /** Initializes the mesh CRUD: loads saved meshes, populates the select, binds events. */
    init: function() {
        this.loadFromStorage();
        this.populateSelect();
        this.bindEvents();
        // Démarrage en mode équations (aucun maillage custom appliqué).
        glo.numGeometryShaderSelect = -1;
        this.updateSelectValue();
        this.updateStorageIndicator();
    },

    /** @returns {boolean} True if saved meshes exist in localStorage. */
    hasLocalChanges: function() {
        return localStorage.getItem('geometryShaders') !== null;
    },

    /** Updates the storage indicator DOM element. */
    updateStorageIndicator: function() {
        const indicator = getById('storageIndicatorGeometry');
        if (!indicator) return;
        if (this.hasLocalChanges()) {
            indicator.textContent = '💾 Local';
            indicator.title = 'Maillages sauvegardés localement.';
        } else {
            indicator.textContent = '⚙ Équations';
            indicator.title = 'Aucun maillage custom sauvegardé.';
        }
        indicator.style.display = 'inline-block';
    },

    /**
     * Extracts the mesh name from a `// Name` first-line comment, or a default.
     * @param {string} code - The mesh GLSL body.
     * @param {number} index - Fallback index.
     * @returns {string}
     */
    getShaderName: function(code, index) {
        if (!code) return `Maillage ${index}`;
        const match = code.trim().match(/\/\/\s*(.+)/);
        return (match && match[1]) ? match[1].trim() : `Maillage ${index}`;
    },

    /** Fills the dropdown: equations sentinel + saved meshes. */
    populateSelect: function() {
        const select = getById('shaderSelectGeometry');
        if (!select) return;
        select.innerHTML = '';

        const eqOpt = document.createElement('option');
        eqOpt.value = 'eq';
        eqOpt.textContent = '⚙ Équations (forme)';
        select.appendChild(eqOpt);

        geometryShaders.forEach((code, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = this.getShaderName(code, index);
            select.appendChild(option);
        });

        if (this.isCreatingNew) {
            const option = document.createElement('option');
            option.value = 'new';
            option.textContent = '* Nouveau maillage *';
            select.appendChild(option);
            select.value = 'new';
        }
    },

    /** Syncs the dropdown value with the active selection. */
    updateSelectValue: function() {
        const select = getById('shaderSelectGeometry');
        if (!select || this.isCreatingNew) return;
        select.value = glo.numGeometryShaderSelect >= 0 ? String(glo.numGeometryShaderSelect) : 'eq';
    },

    /** Binds DOM events for the mesh CRUD controls. */
    bindEvents: function() {
        const select = getById('shaderSelectGeometry');
        if (select) select.addEventListener('change', (e) => this.onSelectChange(e));

        const newBtn = getById('newShaderBtnGeometry');
        if (newBtn) newBtn.addEventListener('click', (e) => { e.preventDefault(); this.createNew(); });

        const saveBtn = getById('saveShaderBtnGeometry');
        if (saveBtn) saveBtn.addEventListener('click', (e) => { e.preventDefault(); this.save(); });

        const deleteBtn = getById('deleteShaderBtnGeometry');
        if (deleteBtn) deleteBtn.addEventListener('click', (e) => { e.preventDefault(); this.delete(); });

        const exportBtn = getById('exportShadersBtnGeometry');
        if (exportBtn) exportBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportAll(); });

        const importBtn = getById('importShadersBtnGeometry');
        if (importBtn) importBtn.addEventListener('click', (e) => { e.preventDefault(); getById('importShadersFileGeometry').click(); });

        const importFile = getById('importShadersFileGeometry');
        if (importFile) importFile.addEventListener('change', (e) => this.importFromFile(e));

        const storageIndicator = getById('storageIndicatorGeometry');
        if (storageIndicator) storageIndicator.addEventListener('click', (e) => { e.preventDefault(); this.updateStorageIndicator(); });
    },

    /**
     * Handles dropdown selection: equations sentinel or a saved mesh.
     * @param {Event} e
     */
    onSelectChange: function(e) {
        const value = e.target.value;
        if (value === 'new') return;

        if (this.isCreatingNew) {
            this.isCreatingNew = false;
            this.populateSelect();
        }

        if (value === 'eq') {
            this.applyEquations();
        } else {
            this.applyMesh(parseInt(value));
        }
    },

    /** Reverts to equation-based geometry and refreshes the editor. */
    applyEquations: async function() {
        glo.geometryShaderCode = null;
        glo.numGeometryShaderSelect = -1;
        this.updateSelectValue();
        await remakeRibbon();
        if (glo.editorGeometry) glo.editorGeometry.setValue(composeGeometryDoc(null));
        updateStatus('Équations (forme)', false, getById('editorStatusGeometry'));
    },

    /**
     * Applies a saved mesh by index and refreshes the editor.
     * @param {number} index
     */
    applyMesh: async function(index) {
        if (index < 0 || index >= geometryShaders.length) return;
        glo.numGeometryShaderSelect = index;
        glo.geometryShaderCode = geometryShaders[index];
        this.updateSelectValue();
        await remakeRibbon();
        if (glo.editorGeometry) glo.editorGeometry.setValue(composeGeometryDoc(geometryShaders[index]));
        updateStatus(this.getShaderName(geometryShaders[index], index) + ' chargé', false, getById('editorStatusGeometry'));
    },

    /** Extracts the editable GLSL body from the editor (between markers). @returns {string} */
    extractCode: function() {
        if (!glo.editorGeometry || typeof GEOMETRY_EDIT_START === 'undefined') return '';
        const full = glo.editorGeometry.getValue();
        const s = full.indexOf(GEOMETRY_EDIT_START);
        const en = full.indexOf(GEOMETRY_EDIT_END);
        if (s === -1 || en === -1) return '';
        return full.slice(s + GEOMETRY_EDIT_START.length, en);
    },

    /** Returns the current editor body, or the current equation GLSL as a fallback. @returns {string} */
    currentBodyOrEquation: function() {
        let body = this.extractCode();
        if (body.trim()) return body;
        const inst = glo.ribbon && glo.ribbon.shaderMeshInstance;
        return (inst && typeof inst.getPositionGLSL === 'function') ? inst.getPositionGLSL() : '\toutPos = vec3(u, v, 0.0);';
    },

    /** Creates a new named mesh seeded from the current editor body. */
    createNew: function() {
        const name = prompt('Nom du nouveau maillage :', 'Nouveau maillage');
        if (name === null) return;

        const body = this.currentBodyOrEquation();
        const named = `\t// ${name}\n${body.replace(/^\s*\n/, '')}`;

        geometryShaders.push(named);
        const index = geometryShaders.length - 1;
        this.isCreatingNew = false;
        this.saveToStorage();
        this.populateSelect();
        this.applyMesh(index);
    },

    /** Saves the current editor body to the active slot, or creates a new mesh when in equations mode. */
    save: function() {
        const body = this.extractCode();
        if (!body.trim()) {
            updateStatus('Erreur: maillage vide', true, getById('editorStatusGeometry'));
            return;
        }

        if (glo.numGeometryShaderSelect >= 0) {
            const index = glo.numGeometryShaderSelect;
            geometryShaders[index] = body;
            glo.geometryShaderCode = body;
            this.saveToStorage();
            this.populateSelect();
            this.updateSelectValue();
            updateStatus(this.getShaderName(body, index) + ' sauvegardé (local)', false, getById('editorStatusGeometry'));
        } else {
            // Mode équations : enregistrer comme nouveau maillage nommé.
            this.createNew();
        }
    },

    /** Persists the meshes array to localStorage. @returns {boolean} */
    saveToStorage: function() {
        try {
            localStorage.setItem('geometryShaders', JSON.stringify(geometryShaders));
            this.updateStorageIndicator();
            return true;
        } catch (e) { return false; }
    },

    /** Loads the meshes array from localStorage. @returns {boolean} */
    loadFromStorage: function() {
        try {
            const data = localStorage.getItem('geometryShaders');
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    geometryShaders.length = 0;
                    parsed.forEach(s => geometryShaders.push(s));
                    return true;
                }
            }
        } catch (e) {}
        return false;
    },

    /** Deletes the active saved mesh and falls back to equations mode. */
    delete: function() {
        const index = glo.numGeometryShaderSelect;
        if (index < 0) {
            updateStatus('Rien à supprimer (mode équations)', false, getById('editorStatusGeometry'));
            return;
        }
        const name = this.getShaderName(geometryShaders[index], index);
        if (!confirm('Supprimer "' + name + '" ?')) return;

        geometryShaders.splice(index, 1);
        this.saveToStorage();
        this.populateSelect();
        updateStatus(name + ' supprimé', false, getById('editorStatusGeometry'));
        // Revenir aux équations après suppression.
        this.applyEquations();
    },

    /** Exports all saved meshes as a downloadable JS file. */
    exportAll: function() {
        let content = 'geometryShaders = [\n';
        geometryShaders.forEach((code, index) => {
            content += '`' + code + '`';
            if (index < geometryShaders.length - 1) content += ',';
            content += '\n';
        });
        content += '];\n';

        const blob = new Blob([content], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shaders-geometry.js';
        a.click();
        URL.revokeObjectURL(url);
        updateStatus('Fichier shaders-geometry.js téléchargé', false, getById('editorStatusGeometry'));
    },

    /**
     * Imports meshes from a file (replace or append).
     * @param {Event} e
     */
    importFromFile: function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const content = ev.target.result;
                const match = content.match(/geometryShaders\s*=\s*\[([\s\S]*)\];/);
                if (!match) throw new Error('Format invalide');
                const inner = match[1];
                const meshes = [];
                const regex = /`([\s\S]*?)`/g;
                let m;
                while ((m = regex.exec(inner)) !== null) meshes.push(m[1]);
                if (meshes.length === 0) throw new Error('Aucun maillage trouvé');

                const replace = confirm('Comment importer ?\n\nOK = Remplacer tous\nAnnuler = Ajouter aux existants');
                if (replace) { geometryShaders.length = 0; }
                meshes.forEach(s => geometryShaders.push(s));

                this.saveToStorage();
                this.populateSelect();
                this.updateSelectValue();
                updateStatus('Import réussi: ' + meshes.length + ' maillages', false, getById('editorStatusGeometry'));
            } catch (err) {
                updateStatus('Erreur import: ' + err.message, true, getById('editorStatusGeometry'));
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },
};

// Initialiser le système CRUD quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        ShaderCRUD.init();
        ShaderCRUDNormal.loadFromStorage();
        ShaderCRUDNormal.init();
        ShaderCRUDGeometry.init();
    }, 500);
});