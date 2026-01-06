/**
 * Shader CRUD System
 * Gère la création, lecture, mise à jour et suppression des shaders
 * en modifiant directement le fichier shaders-frags.js
 *
 * Les shaders peuvent être nommés avec un commentaire en première ligne :
 * // Mon Shader
 * vec3 col = ...
 */

const ShaderCRUD = {
    // Handle du fichier pour écriture directe
    fileHandle: null,

    // Index du shader en cours d'édition
    currentShaderIndex: 0,

    // Flag pour savoir si on est en mode création
    isCreatingNew: false,

    /**
     * Initialise le système CRUD
     */
    init: function() {
        this.populateSelect();
        this.bindEvents();
        this.currentShaderIndex = glo.numShaderSelect;
        this.updateSelectValue();
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
     * Génère le contenu du fichier shaders-frags.js
     */
    generateFileContent: function() {
        let content = 'fragmentShaders = [\n';

        fragmentShaders.forEach((shader, index) => {
            content += '`' + shader + '`';
            if (index < fragmentShaders.length - 1) {
                content += ',';
            }
            content += '\n';
        });

        content += '];\n';
        return content;
    },

    /**
     * Demande à l'utilisateur de sélectionner le fichier shaders-frags.js
     */
    selectFile: async function() {
        const expectedFileName = 'shaders-frags.js';

        while (true) {
            try {
                alert('Veuillez sélectionner le fichier "shaders-frags.js" dans le dossier js/');

                [this.fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Fichier shaders-frags.js',
                        accept: { 'application/javascript': ['.js'] }
                    }],
                    multiple: false
                });

                // Vérifier le nom du fichier
                const file = await this.fileHandle.getFile();
                if (file.name !== expectedFileName) {
                    const retry = confirm(
                        `Fichier incorrect : "${file.name}"\n\n` +
                        `Vous devez sélectionner "${expectedFileName}"\n\n` +
                        `Cliquez OK pour réessayer, ou Annuler pour abandonner.`
                    );
                    if (!retry) {
                        this.fileHandle = null;
                        return false;
                    }
                    continue;
                }

                // Vérifier que le contenu ressemble à shaders-frags.js
                const content = await file.text();
                if (!content.includes('fragmentShaders')) {
                    const retry = confirm(
                        `Le fichier ne semble pas être le bon.\n` +
                        `Il devrait contenir "fragmentShaders".\n\n` +
                        `Cliquez OK pour réessayer, ou Annuler pour abandonner.`
                    );
                    if (!retry) {
                        this.fileHandle = null;
                        return false;
                    }
                    continue;
                }

                return true;

            } catch (err) {
                if (err.name === 'AbortError') {
                    return false;
                }
                console.error('Erreur sélection fichier:', err);
                return false;
            }
        }
    },

    /**
     * Sauvegarde les shaders dans le fichier shaders-frags.js
     */
    saveToFile: async function() {
        try {
            if (!this.fileHandle) {
                const selected = await this.selectFile();
                if (!selected) {
                    updateStatus('Sauvegarde annulée', true);
                    return false;
                }
            }

            const writable = await this.fileHandle.createWritable();
            await writable.write(this.generateFileContent());
            await writable.close();

            return true;
        } catch (err) {
            console.error('Erreur sauvegarde:', err);
            if (err.name === 'NotAllowedError') {
                this.fileHandle = null;
                updateStatus('Permission refusée, resélectionnez le fichier', true);
            } else {
                updateStatus('Erreur: ' + err.message, true);
            }
            return false;
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
     * Sauvegarde le shader actuel
     */
    save: async function() {
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

        const saved = await this.saveToFile();

        if (saved) {
            const name = this.getShaderName(fragmentCode, this.currentShaderIndex);
            updateStatus(name + ' sauvegardé');
        }

        this.populateSelect();
        this.updateSelectValue();
        this.compileCurrentShader();
    },

    /**
     * Supprime le shader actuel
     */
    delete: async function() {
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

        const saved = await this.saveToFile();

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
        const content = this.generateFileContent();
        const blob = new Blob([content], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'shaders-frags.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        updateStatus('Fichier shaders-frags.js téléchargé');
    },

    /**
     * Importe des shaders depuis un fichier
     */
    importFromFile: async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target.result;
                const match = content.match(/fragmentShaders\s*=\s*\[([\s\S]*)\];/);

                if (match) {
                    const arrayContent = match[1];
                    const tempShaders = [];

                    const shaderRegex = /`([\s\S]*?)`/g;
                    let shaderMatch;

                    while ((shaderMatch = shaderRegex.exec(arrayContent)) !== null) {
                        tempShaders.push(shaderMatch[1]);
                    }

                    if (tempShaders.length > 0) {
                        const replace = confirm(
                            'Shaders trouvés: ' + tempShaders.length + '\n\n' +
                            'OK = Remplacer tous les shaders\n' +
                            'Annuler = Ajouter aux shaders existants'
                        );

                        if (replace) {
                            fragmentShaders = tempShaders;
                            this.currentShaderIndex = 0;
                        } else {
                            fragmentShaders = fragmentShaders.concat(tempShaders);
                        }

                        glo.numShaderSelect = this.currentShaderIndex;

                        await this.saveToFile();

                        this.populateSelect();
                        this.updateSelectValue();
                        this.loadShaderInEditor(this.currentShaderIndex);
                        this.compileCurrentShader();

                        updateStatus('Import réussi: ' + tempShaders.length + ' shaders');
                    } else {
                        updateStatus('Erreur: Aucun shader trouvé', true);
                    }
                } else {
                    updateStatus('Erreur: Format invalide', true);
                }
            } catch (err) {
                console.error('Erreur import:', err);
                updateStatus('Erreur import', true);
            }

            e.target.value = '';
        };

        reader.readAsText(file);
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