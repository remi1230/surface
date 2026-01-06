/**
 * Shader CRUD System
 * Gère la création, lecture, mise à jour et suppression des shaders
 * en modifiant directement le fichier shaders-frags.js
 */

const ShaderCRUD = {
    // Handle du fichier pour l'écriture
    fileHandle: null,

    // Index du shader en cours d'édition
    currentShaderIndex: 0,

    // Flag pour savoir si on est en mode création
    isCreatingNew: false,

    // Shader temporaire pour la création
    tempNewShader: '',

    /**
     * Initialise le système CRUD
     */
    init: function() {
        // Peupler le select avec les shaders existants
        this.populateSelect();

        // Attacher les événements aux boutons
        this.bindEvents();

        // Synchroniser avec l'index actuel de glo
        this.currentShaderIndex = glo.shaders.params.numshader;
        this.updateSelectValue();
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
     * Sauvegarde les shaders dans le fichier shaders-frags.js
     */
    saveToFile: async function() {
        try {
            // Si on n'a pas encore de handle, demander à l'utilisateur de sélectionner le fichier
            if (!this.fileHandle) {
                // Utiliser showSaveFilePicker pour obtenir un handle d'écriture
                this.fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'shaders-frags.js',
                    types: [{
                        description: 'JavaScript Files',
                        accept: { 'application/javascript': ['.js'] }
                    }]
                });
            }

            // Créer un writable stream
            const writable = await this.fileHandle.createWritable();

            // Écrire le contenu
            const content = this.generateFileContent();
            await writable.write(content);

            // Fermer le stream
            await writable.close();

            return true;
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Sauvegarde annulée par l\'utilisateur');
                return false;
            }
            console.error('Erreur lors de la sauvegarde:', err);
            updateStatus('Erreur: ' + err.message, true);
            return false;
        }
    },

    /**
     * Peuple le select avec les shaders disponibles
     */
    populateSelect: function() {
        const select = document.getElementById('shaderSelect');
        if (!select) return;

        select.innerHTML = '';

        fragmentShaders.forEach((shader, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Shader ${index}`;
            select.appendChild(option);
        });

        // Ajouter l'option "Nouveau" si en mode création
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
        // Select de shader
        const select = document.getElementById('shaderSelect');
        if (select) {
            select.addEventListener('change', (e) => this.onSelectChange(e));
        }

        // Bouton Nouveau
        const newBtn = document.getElementById('newShaderBtn');
        if (newBtn) {
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.createNew();
            });
        }

        // Bouton Sauvegarder
        const saveBtn = document.getElementById('saveShaderBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.save();
            });
        }

        // Bouton Supprimer
        const deleteBtn = document.getElementById('deleteShaderBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.delete();
            });
        }

        // Bouton Exporter (téléchargement direct)
        const exportBtn = document.getElementById('exportShadersBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportAll();
            });
        }

        // Bouton Importer
        const importBtn = document.getElementById('importShadersBtn');
        if (importBtn) {
            importBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('importShadersFile').click();
            });
        }

        // Input file pour l'import
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

        // Annuler le mode création si on sélectionne un shader existant
        if (this.isCreatingNew) {
            this.isCreatingNew = false;
            this.tempNewShader = '';
            this.populateSelect();
        }

        const index = parseInt(value);
        this.currentShaderIndex = index;
        glo.shaders.params.numshader = index;

        // Mettre à jour l'éditeur avec le code du shader sélectionné
        this.loadShaderInEditor(index);

        // Compiler automatiquement le shader
        this.compileCurrentShader();
    },

    /**
     * Charge un shader dans l'éditeur Monaco
     */
    loadShaderInEditor: function(index) {
        if (typeof editor !== 'undefined' && editor) {
            const shaderCode = fragmentShaders[index] || '';
            // Construire le shader complet pour l'affichage
            const fullShader = fragmentShaderHeader + shaderCode + fragmentShaderFooter;
            editor.setValue(fullShader);
            updateStatus('Shader ' + index + ' chargé');
        }
    },

    /**
     * Extrait le code du fragment shader depuis l'éditeur
     */
    extractFragmentCode: function() {
        if (typeof editor === 'undefined' || !editor) return '';

        const fullCode = editor.getValue();

        // Trouver la position après "void main(){"
        const mainPos = fullCode.indexOf('void main(){');
        if (mainPos === -1) return '';

        const afterMain = fullCode.substring(mainPos + 12);

        // Trouver la position de "if(invcol" qui marque le début du footer
        const footerPos = afterMain.indexOf('if(invcol');
        if (footerPos === -1) return '';

        // Extraire le code entre main() et le footer
        return afterMain.substring(0, footerPos);
    },

    /**
     * Crée un nouveau shader
     */
    createNew: function() {
        this.isCreatingNew = true;
        this.tempNewShader = `
    // Nouveau shader
    vec3 col = palette(length(npos()));
`;

        // Ajouter l'option "Nouveau" au select
        this.populateSelect();

        // Charger le template dans l'éditeur
        if (typeof editor !== 'undefined' && editor) {
            const fullShader = fragmentShaderHeader + this.tempNewShader + fragmentShaderFooter;
            editor.setValue(fullShader);
            updateStatus('Mode création - Modifier et sauvegarder');
        }
    },

    /**
     * Sauvegarde le shader actuel dans le fichier
     */
    save: async function() {
        const fragmentCode = this.extractFragmentCode();

        if (!fragmentCode.trim()) {
            updateStatus('Erreur: Code shader vide', true);
            return;
        }

        if (this.isCreatingNew) {
            // Ajouter le nouveau shader au tableau
            fragmentShaders.push(fragmentCode);
            this.currentShaderIndex = fragmentShaders.length - 1;
            glo.shaders.params.numshader = this.currentShaderIndex;
            this.isCreatingNew = false;
            this.tempNewShader = '';
        } else {
            // Mettre à jour le shader existant
            fragmentShaders[this.currentShaderIndex] = fragmentCode;
        }

        // Sauvegarder dans le fichier
        const saved = await this.saveToFile();

        if (saved) {
            updateStatus('Shader ' + this.currentShaderIndex + ' sauvegardé dans le fichier');
        }

        // Mettre à jour le select
        this.populateSelect();
        this.updateSelectValue();

        // Compiler le shader
        this.compileCurrentShader();
    },

    /**
     * Supprime le shader actuel du fichier
     */
    delete: async function() {
        if (fragmentShaders.length <= 1) {
            updateStatus('Erreur: Impossible de supprimer le dernier shader', true);
            return;
        }

        if (this.isCreatingNew) {
            // Annuler la création
            this.isCreatingNew = false;
            this.tempNewShader = '';
            this.populateSelect();
            this.loadShaderInEditor(this.currentShaderIndex);
            updateStatus('Création annulée');
            return;
        }

        if (!confirm('Supprimer le shader ' + this.currentShaderIndex + ' du fichier ?')) {
            return;
        }

        // Supprimer le shader du tableau
        fragmentShaders.splice(this.currentShaderIndex, 1);

        // Ajuster l'index si nécessaire
        if (this.currentShaderIndex >= fragmentShaders.length) {
            this.currentShaderIndex = fragmentShaders.length - 1;
        }
        glo.shaders.params.numshader = this.currentShaderIndex;

        // Réinitialiser le générateur numShaderMove
        glo.numShaderMove = glo.numShaderMove();
        for (let i = 0; i < this.currentShaderIndex; i++) {
            glo.numShaderMove.next();
        }

        // Sauvegarder dans le fichier
        const saved = await this.saveToFile();

        if (saved) {
            updateStatus('Shader supprimé du fichier');
        }

        // Mettre à jour l'interface
        this.populateSelect();
        this.updateSelectValue();
        this.loadShaderInEditor(this.currentShaderIndex);
        this.compileCurrentShader();
    },

    /**
     * Exporte tous les shaders vers un fichier JS (téléchargement)
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

        updateStatus('Shaders exportés');
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

                // Parser le contenu du fichier
                const match = content.match(/fragmentShaders\s*=\s*\[([\s\S]*)\];/);

                if (match) {
                    const arrayContent = match[1];
                    const tempShaders = [];

                    // Extraire les template literals
                    const shaderRegex = /`([\s\S]*?)`/g;
                    let shaderMatch;

                    while ((shaderMatch = shaderRegex.exec(arrayContent)) !== null) {
                        tempShaders.push(shaderMatch[1]);
                    }

                    if (tempShaders.length > 0) {
                        const replace = confirm(
                            'Shaders trouvés: ' + tempShaders.length + '\n\n' +
                            'OK = Remplacer tous les shaders existants\n' +
                            'Annuler = Ajouter aux shaders existants'
                        );

                        if (replace) {
                            fragmentShaders = tempShaders;
                            this.currentShaderIndex = 0;
                        } else {
                            fragmentShaders = fragmentShaders.concat(tempShaders);
                        }

                        glo.shaders.params.numshader = this.currentShaderIndex;

                        // Réinitialiser le générateur
                        glo.numShaderMove = glo.numShaderMove();

                        // Sauvegarder dans le fichier
                        const saved = await this.saveToFile();

                        // Mettre à jour l'interface
                        this.populateSelect();
                        this.updateSelectValue();
                        this.loadShaderInEditor(this.currentShaderIndex);
                        this.compileCurrentShader();

                        if (saved) {
                            updateStatus('Import réussi: ' + tempShaders.length + ' shaders sauvegardés');
                        }
                    } else {
                        updateStatus('Erreur: Aucun shader trouvé dans le fichier', true);
                    }
                } else {
                    updateStatus('Erreur: Format de fichier invalide', true);
                }
            } catch (err) {
                console.error('Erreur lors de l\'import:', err);
                updateStatus('Erreur lors de l\'import', true);
            }

            e.target.value = '';
        };

        reader.readAsText(file);
    },

    /**
     * Compile le shader actuel
     */
    compileCurrentShader: function() {
        // Mettre à jour le fragmentShader global
        fragmentShader = fragmentShaderHeader + fragmentShaders[glo.shaders.params.numshader] + fragmentShaderFooter;

        // Déclencher la recompilation
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
