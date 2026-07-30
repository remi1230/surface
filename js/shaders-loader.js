/**
 * Shader Loader — fetches fragment shaders from the server and persists
 * local modifications in localStorage.
 *
 * The server is consulted on every load, and a stored copy is *merged* with it rather than
 * substituted for it. Storage used to win outright, which froze the application on the
 * shaders as they stood the first time anyone pressed Save in the editor: the shipped file
 * was never read again, so every shader added or corrected in `shaders-frags.js`
 * afterwards was invisible, permanently, with nothing in the interface to say so.
 *
 * Merging needs to tell an edited shader from an untouched one, and a stored array alone
 * cannot: every entry looks equally local. So a save also records a *baseline* — what the
 * server was serving at that moment — and the merge keeps the stored text only where it
 * differs from that. The baseline holds fingerprints rather than the shader source: the
 * only question asked of it is "is this still what the server gave us", and 143 shaders
 * cost about 3 KB as fingerprints against several hundred as text.
 *
 * @namespace ShaderLoader
 */

const ShaderLoader = {
    /** @type {string} URL of the shader definitions file on the server. */
    serverUrl: 'js/shaders-frags.js',

    /** @type {string} localStorage key for persisted shader edits. */
    storageKey: 'surface_shaders',

    /**
     * @type {string} localStorage key for the fingerprints of the server version the
     * stored edits were made against.
     */
    baselineKey: 'surface_shaders_baseline',

    /** @type {boolean} Whether the current shaders differ from the server version. */
    hasLocalChanges: false,

    /**
     * @type {string[]|null} The last array fetched from the server, kept so a save can
     * record the baseline it was made against.
     */
    serverShaders: null,

    /**
     * Loads shaders: the server, merged with whatever edits are in storage.
     * @returns {Promise<boolean>} `true` if shaders were loaded successfully.
     */
    load: async function() {
        const stored = this.loadFromStorage();
        const server = await this.fetchFromServer();

        if (!server) {
            // Offline, or the file has become unreachable. A stored copy is then the only
            // thing there is, and stale beats empty.
            if (stored && stored.length > 0) {
                fragmentShaders = stored;
                this.hasLocalChanges = true;
                console.log('Serveur injoignable, shaders repris du stockage:', stored.length);
                return true;
            }
            return false;
        }

        // A copy, never the same array: `fragmentShaders` is edited in place by the editor,
        // and the baseline recorded at save time has to be what the *server* sent, not what
        // the user has since typed into it.
        this.serverShaders = server.slice();

        if (!stored || stored.length === 0) {
            fragmentShaders = server;
            this.hasLocalChanges = false;
            console.log('Shaders chargés depuis le serveur:', server.length);
            return true;
        }

        const base = this.loadBaseline();
        if (!base) {
            // Saved before baselines existed, so there is no way to know which of these
            // were edited and nothing may be overwritten. Newly shipped shaders can still
            // be appended, and recording a baseline now makes the next load a real merge.
            const merged = stored.concat(server.slice(stored.length));
            fragmentShaders = merged;
            this.hasLocalChanges = true;
            this.persist(merged, server);
            console.log('Copie locale sans référence: conservée, ' +
                        (merged.length - stored.length) + ' shader(s) livré(s) ajouté(s)');
            return true;
        }

        const { merged, edits } = this.mergeShaders(server, stored, base);
        fragmentShaders = merged;
        this.hasLocalChanges = edits > 0;
        if (edits > 0) {
            // Re-anchor on today's server copy, so the same edit is not re-detected for
            // ever against a baseline that keeps ageing.
            this.persist(merged, server);
        } else {
            // Nothing local survived the merge: drop the copy so the next load is a plain
            // read from the server, with no chance of drifting again.
            this.clearStorage();
        }
        console.log('Shaders fusionnés: ' + merged.length + ' au total, ' +
                    edits + ' modification(s) locale(s) conservée(s)');
        return true;
    },

    /**
     * Fingerprint of one shader, for deciding whether it still matches the server's.
     *
     * FNV-1a over the source, with the length prefixed: two shaders would have to collide
     * on both to be mistaken for each other, and the cost of a mistake is bounded — one
     * edit taken as untouched, hence replaced by the server's version.
     *
     * @param {string} s - Shader source.
     * @returns {string} A short fingerprint.
     */
    fingerprint: function(s) {
        let h = 0x811c9dc5;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return s.length.toString(36) + ':' + (h >>> 0).toString(36);
    },

    /**
     * Three-way merge of the shipped shaders with a stored copy.
     *
     * An index means the same shader in all three lists only as far as the shortest of
     * them, so the aligned region stops there. Past the baseline, both sides may have
     * grown — the server by shipping, the user by creating — and neither growth is a
     * conflict, so both tails are kept. A list shorter than the baseline is a deletion and
     * is honoured: the entries beyond it are dropped, the server's included.
     *
     * @param {string[]} server - What the server serves now.
     * @param {string[]} stored - The user's copy.
     * @param {string[]} base - Fingerprints of the server version `stored` was made against.
     * @returns {{merged: string[], edits: number}} The merged list and how many local
     *   shaders it kept.
     */
    mergeShaders: function(server, stored, base) {
        const common = Math.min(server.length, stored.length, base.length);
        const merged = [];
        let edits = 0;

        for (let i = 0; i < common; i++) {
            if (this.fingerprint(stored[i]) !== base[i]) {
                merged.push(stored[i]);   // the user changed this one: theirs wins
                edits++;
            } else {
                merged.push(server[i]);   // untouched: take whatever is shipped today
            }
        }
        for (let i = base.length; i < server.length; i++) merged.push(server[i]);
        for (let i = base.length; i < stored.length; i++) { merged.push(stored[i]); edits++; }

        return { merged, edits };
    },

    /**
     * Writes a shader list and the baseline it is expressed against.
     * @param {string[]} shaders - The list to store.
     * @param {string[]} server - The server version to fingerprint as the baseline.
     * @returns {boolean} `true` if both were written.
     */
    persist: function(shaders, server) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(shaders));
            localStorage.setItem(this.baselineKey,
                                 JSON.stringify(server.map(s => this.fingerprint(s))));
            return true;
        } catch (err) {
            console.error('Erreur sauvegarde localStorage:', err);
            return false;
        }
    },

    /**
     * Reads the stored baseline fingerprints.
     * @returns {string[]|null} The fingerprints, or `null` if there are none.
     */
    loadBaseline: function() {
        try {
            const data = localStorage.getItem(this.baselineKey);
            if (data) {
                const base = JSON.parse(data);
                if (Array.isArray(base) && base.length > 0) return base;
            }
        } catch (err) {
            console.error('Erreur lecture référence localStorage:', err);
        }
        return null;
    },

    /**
     * Fetches and parses the shader file, without touching any global state.
     * @returns {Promise<string[]|null>} The shaders, or `null` if unreachable or unparsable.
     */
    fetchFromServer: async function() {
        try {
            // Ajouter un timestamp pour éviter le cache
            const url = this.serverUrl + '?t=' + Date.now();

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const content = await response.text();
            const shaders = this.parseShaderFile(content);

            if (shaders && shaders.length > 0) return shaders;

            throw new Error('Aucun shader trouvé dans le fichier');

        } catch (err) {
            console.error('Erreur chargement shaders depuis serveur:', err);
            return null;
        }
    },

    /**
     * Fetches shaders from the server and adopts them wholesale, discarding local edits.
     * @returns {Promise<boolean>} `true` if the server returned valid shaders.
     */
    loadFromServer: async function() {
        const shaders = await this.fetchFromServer();
        if (!shaders) return false;
        this.serverShaders = shaders.slice();
        fragmentShaders = shaders;
        this.hasLocalChanges = false;
        console.log('Shaders chargés depuis le serveur:', fragmentShaders.length);
        return true;
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
        // Without a baseline the next load cannot tell these edits from untouched shaders,
        // and has to keep the lot untouched — which is the freeze this whole file exists to
        // avoid. `serverShaders` is null only if the server was unreachable at load.
        const server = this.serverShaders;
        if (!server) {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(fragmentShaders));
                this.hasLocalChanges = true;
                console.warn('Shaders sauvegardés sans référence serveur: la fusion au ' +
                             'prochain chargement sera conservatrice');
                return true;
            } catch (err) {
                console.error('Erreur sauvegarde localStorage:', err);
                return false;
            }
        }
        const saved = this.persist(fragmentShaders, server);
        if (saved) {
            this.hasLocalChanges = true;
            console.log('Shaders sauvegardés dans localStorage');
        }
        return saved;
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
            // The baseline is meaningless without the copy it describes, and leaving it
            // behind would make a later save look like it had a reference it does not.
            localStorage.removeItem(this.baselineKey);
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