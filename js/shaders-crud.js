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
        const indicator = document.getElementById('storageIndicator');
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
        const match = trimmed.match(/^\/\/\s*(.+)/);

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
            const confirm_reload = confirm(
                'Vous avez des modifications locales.\n\n' +
                'Recharger depuis le serveur effacera ces modifications.\n\n' +
                'Continuer ?'
            );
            if (!confirm_reload) return;
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
        const select = document.getElementById('shaderSelect');
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
        const select = document.getElementById('shaderSelect');
        if (select && !this.isCreatingNew) {
            select.value = this.currentShaderIndex;
        }
    },

    /**
     * Attache les événements aux éléments du DOM
     */
    bindEvents: function() {
        const select = document.getElementById('shaderSelect');
        if (select) {
            select.addEventListener('change', (e) => this.onSelectChange(e));
        }

        const newBtn = document.getElementById('newShaderBtn');
        if (newBtn) {
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.createNew();
            });
        }

        const saveBtn = document.getElementById('saveShaderBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.save();
            });
        }

        const deleteBtn = document.getElementById('deleteShaderBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.delete();
            });
        }

        const exportBtn = document.getElementById('exportShadersBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportAll();
            });
        }

        const importBtn = document.getElementById('importShadersBtn');
        if (importBtn) {
            importBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('importShadersFile').click();
            });
        }

        const importFile = document.getElementById('importShadersFile');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.importFromFile(e));
        }

        // Indicateur de stockage (clic pour recharger depuis le serveur)
        const storageIndicator = document.getElementById('storageIndicator');
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
        if (typeof editor !== 'undefined' && editor) {
            const fullShader = fragmentShaderHeader + fragmentShaders[index] + fragmentShaderFooter;
            editor.setValue(fullShader);
            updateStatus(this.getShaderName(fragmentShaders[index], index) + ' chargé');
        }
    },

    /**
     * Extrait uniquement le fragment depuis l'éditeur
     */
    extractFragmentCode: function() {
        if (typeof editor === 'undefined' || !editor) return '';

        const fullCode = editor.getValue();

        const mainPos = fullCode.indexOf('void main(){');
        if (mainPos === -1) return '';

        const afterMain = fullCode.substring(mainPos + 12);

        const footerPos = afterMain.indexOf('if(invcol');
        if (footerPos === -1) return '';

        return afterMain.substring(0, footerPos);
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
    vec3 col = palette(length(npos()));
`;

        this.populateSelect();

        if (typeof editor !== 'undefined' && editor) {
            const fullShader = fragmentShaderHeader + newFragment + fragmentShaderFooter;
            editor.setValue(fullShader);
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

        const compileBtn = document.getElementById('compileBtn');
        if (compileBtn) {
            compileBtn.click();
        }
    }
};

// Initialiser le système CRUD quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        ShaderCRUD.init();
    }, 500);
});