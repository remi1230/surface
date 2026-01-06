/**
 * Shader CRUD System
 * Gère la création, lecture, mise à jour et suppression des shaders
 * en modifiant directement le fichier shaders-frags.js
 */

const ShaderCRUD = {
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
     * Télécharge automatiquement le fichier
     */
    saveToFile: function() {
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

        return true;
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
        glo.shaders.params.numshader = index;

        this.loadShaderInEditor(index);
        this.compileCurrentShader();
    },

    /**
     * Charge le shader COMPLET dans l'éditeur Monaco
     * (header de shaders.js + fragment de shaders-frags.js + footer de shaders.js)
     */
    loadShaderInEditor: function(index) {
        if (typeof editor !== 'undefined' && editor) {
            // Construire le shader complet comme dans shaders.js
            const fullShader = fragmentShaderHeader + fragmentShaders[index] + fragmentShaderFooter;
            editor.setValue(fullShader);
            updateStatus('Shader ' + index + ' chargé');
        }
    },

    /**
     * Extrait uniquement le fragment (partie modifiable) depuis l'éditeur
     * C'est cette partie qui sera sauvegardée dans shaders-frags.js
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

        // Retourner uniquement le fragment (entre main et footer)
        return afterMain.substring(0, footerPos);
    },

    /**
     * Crée un nouveau shader
     */
    createNew: function() {
        this.isCreatingNew = true;

        const newFragment = `
    // Nouveau shader
    vec3 col = palette(length(npos()));
`;

        this.populateSelect();

        if (typeof editor !== 'undefined' && editor) {
            // Afficher le shader complet avec le nouveau fragment
            const fullShader = fragmentShaderHeader + newFragment + fragmentShaderFooter;
            editor.setValue(fullShader);
            updateStatus('Mode création - Modifier et sauvegarder');
        }
    },

    /**
     * Sauvegarde le shader actuel
     */
    save: function() {
        // Extraire uniquement le fragment depuis le shader complet
        const fragmentCode = this.extractFragmentCode();

        if (!fragmentCode.trim()) {
            updateStatus('Erreur: Code shader vide', true);
            return;
        }

        if (this.isCreatingNew) {
            // Ajouter le nouveau fragment au tableau
            fragmentShaders.push(fragmentCode);
            this.currentShaderIndex = fragmentShaders.length - 1;
            glo.shaders.params.numshader = this.currentShaderIndex;
            this.isCreatingNew = false;
            updateStatus('Nouveau shader créé (index ' + this.currentShaderIndex + ')');
        } else {
            // Mettre à jour le fragment existant
            fragmentShaders[this.currentShaderIndex] = fragmentCode;
            updateStatus('Shader ' + this.currentShaderIndex + ' mis à jour');
        }

        // Télécharger le fichier shaders-frags.js mis à jour
        this.saveToFile();

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

        if (!confirm('Supprimer le shader ' + this.currentShaderIndex + ' ?')) {
            return;
        }

        fragmentShaders.splice(this.currentShaderIndex, 1);

        if (this.currentShaderIndex >= fragmentShaders.length) {
            this.currentShaderIndex = fragmentShaders.length - 1;
        }
        glo.shaders.params.numshader = this.currentShaderIndex;

        // Réinitialiser le générateur numShaderMove
        glo.numShaderMove = glo.numShaderMove();
        for (let i = 0; i < this.currentShaderIndex; i++) {
            glo.numShaderMove.next();
        }

        // Télécharger le fichier mis à jour
        this.saveToFile();

        this.populateSelect();
        this.updateSelectValue();
        this.loadShaderInEditor(this.currentShaderIndex);
        this.compileCurrentShader();

        updateStatus('Shader supprimé');
    },

    /**
     * Exporte tous les shaders
     */
    exportAll: function() {
        this.saveToFile();
        updateStatus('Fichier shaders-frags.js téléchargé');
    },

    /**
     * Importe des shaders depuis un fichier
     */
    importFromFile: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
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

                        glo.shaders.params.numshader = this.currentShaderIndex;
                        glo.numShaderMove = glo.numShaderMove();

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
     * Combine header (shaders.js) + fragment (shaders-frags.js) + footer (shaders.js)
     */
    compileCurrentShader: function() {
        fragmentShader = fragmentShaderHeader + fragmentShaders[glo.shaders.params.numshader] + fragmentShaderFooter;

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
