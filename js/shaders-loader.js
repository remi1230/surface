/**
 * Shader Loader — fetches fragment shaders from the server and persists
 * local modifications in localStorage.
 *
 * Load priority: localStorage first, then server fallback.
 * @namespace ShaderLoader
 */

const ShaderLoader = {
    /** @type {string} URL of the shader definitions file on the server. */
    serverUrl: 'js/shaders-frags.js',

    /** @type {string} localStorage key for persisted shader edits. */
    storageKey: 'surface_shaders',

    /** @type {boolean} Whether the current shaders differ from the server version. */
    hasLocalChanges: false,

    /**
     * Loads shaders, prioritizing localStorage over the server.
     * @returns {Promise<boolean>} `true` if shaders were loaded successfully.
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
     * Fetches shaders from the server using `fetch()`, bypassing cache.
     * @returns {Promise<boolean>} `true` if the server returned valid shaders.
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
     * Force-reloads shaders from the server, ignoring and clearing localStorage.
     * @returns {Promise<boolean>} `true` if the server returned valid shaders.
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
     * Parses the content of a `shaders-frags.js` file, extracting each shader
     * from the backtick-delimited entries in the `fragmentShaders` array.
     * @param {string} content - Raw JS file content.
     * @returns {string[]|null} Array of shader code strings, or `null` on parse failure.
     */
    parseShaderFile: function(content) {
        const shaders = [];

        // Extraire le contenu du tableau fragmentShaders = [...]
        const match = content.match(/fragmentShaders\s*=\s*\[([\s\S]*?)\];/);

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
     * Persists the current `fragmentShaders` array to localStorage.
     * @returns {boolean} `true` if saved successfully.
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
     * Reads shaders from localStorage.
     * @returns {string[]|null} Array of shader code strings, or `null` if none stored.
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
     * Removes all persisted shaders from localStorage.
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
     * Generates the JS source content of a `shaders-frags.js` file from the current shaders.
     * @returns {string} Complete JS file content ready for download.
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
     * Triggers a browser download of the current shaders as a `shaders-frags.js` file.
     * @returns {boolean} Always `true`.
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
     * Imports shaders from an uploaded file, either replacing or appending to the current list.
     * @param {File} file - The uploaded `.js` file.
     * @param {boolean} [replace=false] - If `true`, replaces all shaders; otherwise appends.
     * @returns {Promise<number>} The number of shaders imported.
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