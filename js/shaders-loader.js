/**
 * Shader Loader - Charge les shaders depuis le serveur
 * Utilise fetch() pour récupérer le fichier et localStorage pour la persistance locale
 */

const ShaderLoader = {
    // URL du fichier shaders sur le serveur
    serverUrl: 'js/shaders-frags.js',

    // Clé pour localStorage
    storageKey: 'surface_shaders',

    // Flag pour savoir si on a des modifications locales
    hasLocalChanges: false,

    /**
     * Charge les shaders (priorité au localStorage, sinon serveur)
     * @returns {Promise<boolean>} true si chargement réussi
     */
    load: async function() {
        // D'abord, essayer de charger depuis localStorage
        const localShaders = this.loadFromStorage();

        if (localShaders && localShaders.length > 0) {
            fragmentShaders = localShaders;
            this.hasLocalChanges = true;
            console.log('Shaders chargés depuis localStorage:', fragmentShaders.length);
            return true;
        }

        // Sinon, charger depuis le serveur
        return await this.loadFromServer();
    },

    /**
     * Charge les shaders depuis le serveur avec fetch()
     * @returns {Promise<boolean>} true si chargement réussi
     */
    loadFromServer: async function() {
        try {
            // Ajouter un timestamp pour éviter le cache
            const url = this.serverUrl + '?t=' + Date.now();

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const content = await response.text();
            const shaders = this.parseShaderFile(content);

            if (shaders && shaders.length > 0) {
                fragmentShaders = shaders;
                this.hasLocalChanges = false;
                console.log('Shaders chargés depuis le serveur:', fragmentShaders.length);
                return true;
            }

            throw new Error('Aucun shader trouvé dans le fichier');

        } catch (err) {
            console.error('Erreur chargement shaders depuis serveur:', err);
            return false;
        }
    },

    /**
     * Recharge les shaders depuis le serveur (ignore localStorage)
     * @returns {Promise<boolean>} true si chargement réussi
     */
    reloadFromServer: async function() {
        const success = await this.loadFromServer();
        if (success) {
            // Effacer les modifications locales
            this.clearStorage();
            this.hasLocalChanges = false;
        }
        return success;
    },

    /**
     * Parse le contenu du fichier shaders-frags.js
     * @param {string} content - Contenu du fichier JS
     * @returns {Array} Tableau de shaders
     */
    parseShaderFile: function(content) {
        const shaders = [];

        // Extraire le contenu du tableau fragmentShaders = [...]
        const match = content.match(/fragmentShaders\s*=\s*\[([\s\S]*)\];/);

        if (!match) {
            console.error('Format de fichier invalide');
            return null;
        }

        const arrayContent = match[1];

        // Extraire chaque shader entre backticks
        const shaderRegex = /`([\s\S]*?)`/g;
        let shaderMatch;

        while ((shaderMatch = shaderRegex.exec(arrayContent)) !== null) {
            shaders.push(shaderMatch[1]);
        }

        return shaders;
    },

    /**
     * Sauvegarde les shaders dans localStorage
     */
    saveToStorage: function() {
        try {
            const data = JSON.stringify(fragmentShaders);
            localStorage.setItem(this.storageKey, data);
            this.hasLocalChanges = true;
            console.log('Shaders sauvegardés dans localStorage');
            return true;
        } catch (err) {
            console.error('Erreur sauvegarde localStorage:', err);
            return false;
        }
    },

    /**
     * Charge les shaders depuis localStorage
     * @returns {Array|null} Tableau de shaders ou null
     */
    loadFromStorage: function() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (err) {
            console.error('Erreur lecture localStorage:', err);
        }
        return null;
    },

    /**
     * Efface les shaders du localStorage
     */
    clearStorage: function() {
        try {
            localStorage.removeItem(this.storageKey);
            this.hasLocalChanges = false;
            console.log('localStorage effacé');
        } catch (err) {
            console.error('Erreur suppression localStorage:', err);
        }
    },

    /**
     * Génère le contenu du fichier shaders-frags.js pour export
     * @returns {string} Contenu du fichier JS
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
     * Exporte les shaders (téléchargement du fichier)
     */
    exportToFile: function() {
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
     * Importe des shaders depuis un fichier uploadé
     * @param {File} file - Fichier à importer
     * @param {boolean} replace - true pour remplacer, false pour ajouter
     * @returns {Promise<number>} Nombre de shaders importés
     */
    importFromFile: function(file, replace = false) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const content = event.target.result;
                    const shaders = this.parseShaderFile(content);

                    if (!shaders || shaders.length === 0) {
                        reject(new Error('Aucun shader trouvé'));
                        return;
                    }

                    if (replace) {
                        fragmentShaders = shaders;
                    } else {
                        fragmentShaders = fragmentShaders.concat(shaders);
                    }

                    this.saveToStorage();
                    resolve(shaders.length);

                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Erreur lecture fichier'));
            reader.readAsText(file);
        });
    }
};
