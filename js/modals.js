/**
 * Initializes the export modal dialog using Materialize CSS.
 * Sets up open/close callbacks that manage the global modal state,
 * display the estimated download file weight, and handle fullscreen toggling.
 */
function initExportModal(){
	var elems = document.querySelectorAll('#exportModal');
    M.Modal.init(elems, {
        onOpenEnd: function() {
            glo.modalOpen = true;
            document.querySelector('#weightToDownload').textContent = glo.ribbon.weightToDownload();
			getById('filename').focus();
        },
        onCloseEnd: function() {
			glo.modalOpen = false;
            if (glo.fullScreen) {
                glo.engine.switchFullscreen();
            }
        },
    });
}

/**
 * Extracts the text prefix and optional trailing number from a string.
 * Used to auto-increment filenames (e.g., "surface3" -> {filename: "surface", fileNumber: 3}).
 * @param {string} chaine - The input string to parse.
 * @returns {{filename: string, fileNumber: number|false}} An object with the text prefix and parsed number, or false if no trailing number exists.
 */
const extractTextAndNumber = (chaine) => {
    const resultat = chaine.match(/^(.*?)(\d+)?$/);
    return {
        filename   : resultat[1],
        fileNumber : resultat[2] ? parseInt(resultat[2], 10) : false
    };
};

/**
 * Opens the export modal dialog and auto-increments the filename number suffix.
 * Exits fullscreen mode if currently active before displaying the modal.
 */
function exportModal(){
	glo.modalOpen = true;
	if(glo.fullScreen){ glo.engine.switchFullscreen(); }
	var instance = M.Modal.getInstance(document.querySelector('#exportModal'));
    instance.open();

	let {filename, fileNumber} = extractTextAndNumber(getById('filename').value);
	if(fileNumber){
		getById('filename').value = filename + (fileNumber + 1);
	}
}

/**
 * Initializes the import modal dialog using Materialize CSS.
 * Sets up callbacks to initialize the import format selector and populate
 * the example surfaces dropdown on open, and restore fullscreen on close.
 */
function initImportModal(){
	var elems = document.querySelectorAll('#importModal');
	M.Modal.init(elems, {
		onOpenStart: function() {
			M.FormSelect.init(document.querySelector('#importFormat'));
			populateExampleSelect();
		},
		onCloseEnd: function() {
			if(glo.fullScreen){ glo.engine.switchFullscreen(); }
			glo.modalOpen = false;
		},
	});
}

/**
 * Opens the import modal dialog.
 * Stops event propagation if triggered by a DOM event, and exits fullscreen mode if active.
 */
function importModal(){
	glo.modalOpen = true;
	if(typeof event !== 'undefined' && event && event.stopPropagation){
		event.stopPropagation();
		event.preventDefault();
	}
	if(glo.fullScreen){ glo.engine.switchFullscreen(); }
	M.Modal.getInstance(document.querySelector('#importModal')).open();
}

/**
 * Handles file upload from the import modal. Reads the selected file and dispatches
 * to the appropriate importer based on file extension (.json or .obj).
 * For OBJ files, distinguishes between app-exported files (*.surface.obj) and
 * generic OBJ files that use BabylonJS's built-in loader.
 * @param {Event} event - The file input change event.
 */
function downloadJsonMesh(event){
	M.Modal.getInstance(getById('importModal')).close();
	var fileToRead = getById("jsonFileUpload").files[0];
	getById('jsonFileUpload').value = '';

	const fileName      = fileToRead.name;
	const fileExtension = fileName.slice(fileName.lastIndexOf('.') + 1);

	var fileread = new FileReader();
	fileread.onload = function(e) {
		var fileContent = e.target.result;

		if (fileExtension === 'obj') {
			const isAppExport = fileName.toLowerCase().endsWith('.surface.obj');
			if (isAppExport) {
				importAppOBJ(fileContent, fileName);
			} else {
				importOBJWithBabylon(fileToRead, fileName);
			}
			return;
		}

		if (fileExtension === 'json') {
			applyImportedJSON(fileContent);
		}
	};

	fileread.readAsText(fileToRead);
}

/**
 * Applies imported JSON surface data to the application state.
 * Parses the JSON content, updates global parameters (including mesh transformations),
 * synchronizes UI controls, switches coordinate system if needed, restores the
 * selected color shader and its custom code, and rebuilds the surface curves.
 * @param {string} fileContent - The raw JSON string containing surface parameters.
 */
function applyImportedJSON(fileContent) {
	var contentJsonFile = JSON.parse(fileContent);
	for(var prop in contentJsonFile){
		if(prop === 'meshTransformations'){
			Object.assign(glo.params.meshTransformations, contentJsonFile.meshTransformations);
		} else {
			glo.params[prop] = contentJsonFile[prop];
		}
	}

    var importedStepsU = glo.params.stepsU;
	var importedStepsV = glo.params.stepsV;

	paramsToControls();
    if(!contentJsonFile.textInputSymR){ glo.inputSymR.text = ''; }

	var sameAsRadioCheck = isInputsEquationsSameAsRadioCheck();
	var formName = glo.params.formName;
	if(glo.coordsType != glo.params.coordsType){
		while(glo.coordsType !== glo.params.coordsType){ glo.coordinatesType.next(); }
        addRadios();
	}

	glo.formes.setFormeSelect(formName, glo.coordsType, sameAsRadioCheck, {u: importedStepsU, v: importedStepsV});
    glo.radiosFormes.setCheckByName(`Radio-${formName}`);

	if(!sameAsRadioCheck){
		if(glo.params.uvToXy){ uvToXy(); }
		makeCurves();
	}

	// Update the UV/XY toggle button
	var uvToXyButton = glo.advancedTexture.getControlByName("uvToXyButton");
	if(uvToXyButton){
		uvToXyButton.textBlock.text = glo.params.uvToXy ? "XY → UV" : "UV → XY";
	}

    ['X', 'Y', 'Z'].forEach(axe => { glo.allControls.getByName('symmetrize' + axe).value = glo.params['symmetrize' + axe]; });

	// Restore the selected color shader
	if(contentJsonFile.shaderSelectIndex !== undefined){
		var shaderIndex = parseInt(contentJsonFile.shaderSelectIndex);
		if(!isNaN(shaderIndex) && shaderIndex >= 0 && shaderIndex < fragmentShaders.length){
			glo.numShaderSelect = shaderIndex;
			ShaderCRUD.currentShaderIndex = shaderIndex;
			ShaderCRUD.updateSelectValue();
		}

		if(contentJsonFile.shaderCode){
			// Restore the fragment code (includes any user modifications)
			fragmentShaders[glo.numShaderSelect] = contentJsonFile.shaderCode;
		}

		// Recompose the full shader and update the editor if open
		fragmentShader = fragmentShaderHeader + fragmentShaders[glo.numShaderSelect] + fragmentShaderFooter;
		if(glo.editor){
			glo.editor.setValue(fragmentShader);
		}

		// Compile directly via the GPU instance (works even without Monaco)
		if(glo.ribbon && glo.ribbon.shaderMeshInstance){
			glo.ribbon.shaderMeshInstance.updateFragmentShader(fragmentShaders[glo.numShaderSelect]);
		}
	}
}

/**
 * Populates the example surface selector dropdown by fetching the manifest
 * of available example JSON files from the server. Each filename is converted
 * to a human-readable label by removing the .json extension and inserting
 * spaces before capital letters.
 */
function populateExampleSelect() {
	var select = document.querySelector('#importJsonExemple');
	fetch('json/import-exemples/manifest.json')
		.then(function(response) { return response.json(); })
		.then(function(files) {
			select.innerHTML = '<option value="none" selected>None</option>';
			files.forEach(function(file) {
				var label = file.replace('.json', '').replace(/([A-Z])/g, ' $1').trim();
				label = label.charAt(0).toUpperCase() + label.slice(1);
				var option = document.createElement('option');
				option.value = file;
				option.textContent = label;
				select.appendChild(option);
			});
			M.FormSelect.init(select);
		})
		.catch(function(err) {
			console.error('Error loading example manifest:', err);
			M.FormSelect.init(select);
		});
}

/**
 * Loads and applies an example surface JSON file selected from the examples dropdown.
 * Fetches the file from the server, closes the import modal, and applies the
 * imported data to the application. Resets the selector to "none" afterward.
 * @param {HTMLSelectElement} selectElement - The select element containing the chosen example filename.
 */
function loadExampleJSON(selectElement) {
	var fileName = selectElement.value;
	if (fileName === 'none') return;

	fetch('json/import-exemples/' + fileName)
		.then(function(response) {
			if (!response.ok) throw new Error('Failed to load example file');
			return response.text();
		})
		.then(function(fileContent) {
			M.Modal.getInstance(getById('importModal')).close();
			applyImportedJSON(fileContent);
			selectElement.value = 'none';
			M.FormSelect.init(selectElement);
		})
		.catch(function(err) {
			console.error('Error loading example file:', err);
		});
}

/**
 * Imports an OBJ file that was previously exported by this application.
 * Parses the OBJ text content, reconstructs the parametric surface paths
 * from vertices and faces, and rebuilds the BabylonJS mesh.
 * @param {string} fileContent - The raw OBJ file content as text.
 * @param {string} fileName - The original filename, used for labeling the mesh.
 */
function importAppOBJ(fileContent, fileName) {
	try {
		const objData = parseOBJFile(fileContent);
		console.log("OBJ parsed (app): " + objData.vertices.length + " vertices, " + objData.faces.length + " faces");

		if (objData.vertices.length === 0) {
			console.error("No vertices found in OBJ file");
			return;
		}

		const paths = buildPathsFromOBJ(objData.vertices, objData.faces);
		if (paths.length === 0 || paths[0].length === 0) {
			console.error("Could not convert mesh to valid paths");
			return;
		}

		buildMeshFromPaths(paths, fileName);
	} catch (error) {
		console.error("Error importing app OBJ:", error);
	}
}

/**
 * Cached object URL for the most recent export download, revoked before each new export
 * to prevent memory leaks.
 * @type {string|undefined}
 */
var objectUrl;

/**
 * Exports the current surface mesh in the specified format (json, stl, or obj).
 * For JSON exports, serializes the global parameters including shader configuration.
 * For STL exports, delegates to the dedicated STL exporter.
 * For OBJ exports, extracts GPU vertex positions from shader meshes if needed,
 * bakes transforms, and uses BabylonJS OBJ export. Creates a downloadable blob
 * and triggers the browser download.
 * @async
 * @param {string} exportFormat - The target export format: "json", "stl", or "obj".
 * @returns {Promise<false>} Always returns false to prevent default form submission.
 */
async function exportMesh(exportFormat) {
    if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
    }

    var filename = getById('filename').value;
    if (exportFormat === "obj") {
        if (!filename.toLowerCase().endsWith(".surface.obj")) {
            filename = filename.replace(/\.(surface\.)?obj$/i, "") + ".surface.obj";
        }
    } else if (filename.toLowerCase().lastIndexOf("." + exportFormat) !== filename.length - exportFormat.length || filename.length < exportFormat.length + 1) {
        filename += "." + exportFormat;
    }

    let strMesh;
    if (exportFormat === "json") {
        // JSON export: serialize only glo.params without touching the GPU mesh
        glo.params.coordsType = glo.coordsType;
        var objForm = glo.formes.getFormSelect();
        glo.params.formName = !objForm ? "" : objForm.form.text;

        // Export the selected color shader index
        glo.params.shaderSelectIndex = glo.numShaderSelect;

        // Always export the current fragment code (which includes user modifications
        // if the shader was compiled via the editor)
        glo.params.shaderCode = fragmentShaders[glo.numShaderSelect];

        strMesh = JSON.stringify(glo.params);
    }
    else if (exportFormat === "stl") {
        await exportMeshToSTL(glo.ribbon, filename);
        M.Modal.getInstance(document.querySelector('#exportModal')).close();
        return false;
    }
    else {
        // For shader meshes, extract the actual positions from the GPU
        let exportMeshRef = null;
        if (glo.fromShader && glo.ribbon && glo.ribbon.shaderMeshInstance) {
            exportMeshRef = glo.ribbon.shaderMeshInstance.createExportMesh();
            if (!exportMeshRef) {
                console.error('[Export] Unable to extract positions from the shader mesh');
                return false;
            }
        }

        const meshToExport = exportMeshRef || glo.ribbon;
        await meshToExport.bakeCurrentTransformIntoVertices();

        strMesh = BABYLON.OBJExport.OBJ([meshToExport]);

        // Clean up the temporary export mesh
        if (exportMeshRef) {
            exportMeshRef.dispose();
        }
    }

    // Create a blob and generate the download URL
    var blob = new Blob([strMesh], { type: "octet/stream" });
    objectUrl = (window.webkitURL || window.URL).createObjectURL(blob);

    // Update the hidden download link
    var downloadLink = getById('downloadLink');
    downloadLink.href = objectUrl;
    downloadLink.download = filename;

    // Trigger the download by clicking the hidden link
    downloadLink.click();

    // Close the modal
    M.Modal.getInstance(document.querySelector('#exportModal')).close();

    return false;
}

/**
 * Opens the shader editor window and initializes the Monaco editor if not already created.
 * If the editor already exists, refreshes its layout and sets focus.
 * @param {Object} [target=glo] - The object that holds the editor instance reference.
 * @param {string} [key='editor'] - The property name on the target object for the editor instance.
 * @param {HTMLElement} [editWindow=glo.editorWindow] - The editor window DOM element to display.
 * @param {string} [shaderFragmentSource=fragmentShader] - The initial GLSL fragment shader source code.
 * @param {HTMLElement} [editorContainer=getById('editor-container')] - The DOM container for the Monaco editor.
 * @param {string} [compileBtnId='compileBtn'] - The ID of the compile button element.
 * @param {HTMLElement} [statusEl=getById('editorStatus')] - The DOM element for displaying editor status messages.
 */
function openShaderWindow(target = glo, key = 'editor', editWindow = glo.editorWindow, shaderFragmentSource = fragmentShader, editorContainer = getById('editor-container'), compileBtnId = 'compileBtn', statusEl = getById('editorStatus')){
	editWindow.style.display = 'flex';

	if (!target[key] && !target[key + '_loading']) {
		target[key + '_loading'] = true;
		initMonacoEditor(editorContainer, target, key, shaderFragmentSource, compileBtnId, statusEl);
	} else if (target[key]) {
		target[key].layout();
		target[key].focus();
	}
}

/**
 * Makes the editor window draggable by its header bar.
 * Constrains movement within the browser viewport boundaries.
 * Dragging is disabled when the editor is in fullscreen mode.
 * @param {HTMLElement} [editWindow=glo.editorWindow] - The editor window DOM element to make draggable.
 */
function makeDraggable(editWindow = glo.editorWindow) {
    const header = editWindow.querySelector('.editor-header');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    /**
     * Initiates the drag operation on mousedown, recording the initial cursor offset.
     * @param {MouseEvent} e - The mousedown event.
     */
    function dragStart(e) {
        if (isFullscreen) return;
        if (e.target.closest('.editor-controls')) return;

        initialX = e.clientX - editWindow.offsetLeft;
        initialY = e.clientY - editWindow.offsetTop;
        isDragging = true;
    }

    /**
     * Moves the editor window during an active drag, clamping to viewport bounds.
     * @param {MouseEvent} e - The mousemove event.
     */
    function drag(e) {
        if (!isDragging) return;

        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        const maxX = window.innerWidth - editWindow.offsetWidth;
        const maxY = window.innerHeight - editWindow.offsetHeight;

        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        editWindow.style.left = currentX + 'px';
        editWindow.style.top = currentY + 'px';
    }

    /**
     * Ends the drag operation on mouseup.
     */
    function dragEnd() {
        isDragging = false;
    }
}

/**
 * Makes the editor window resizable by adding mouse event listeners to its resize handles.
 * Supports resizing from all edges (north, south, east, west) with minimum size constraints
 * (400px width, 300px height). Triggers a Monaco editor layout refresh during resizing.
 * Resizing is disabled when the editor is in fullscreen mode.
 * @param {HTMLElement} [editWindow=glo.editorWindow] - The editor window DOM element to make resizable.
 * @param {Object} [target=glo] - The object that holds the editor instance reference.
 * @param {string} [key='editor'] - The property name on the target object for the editor instance.
 */
function makeResizable(editWindow = glo.editorWindow, target = glo, key = 'editor') {
    const handles = editWindow.querySelectorAll('.resize-handle');

    handles.forEach(handle => {
        handle.addEventListener('mousedown', initResize);
    });

    let isResizing = false;
    let currentHandle = null;
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    /**
     * Initiates the resize operation, capturing the starting dimensions and cursor position.
     * @param {MouseEvent} e - The mousedown event on a resize handle.
     */
    function initResize(e) {
        if (isFullscreen) return;

        isResizing = true;
        currentHandle = e.target;
        startX = e.clientX;
        startY = e.clientY;

        const rect = editWindow.getBoundingClientRect();
        startWidth = rect.width;
        startHeight = rect.height;
        startLeft = rect.left;
        startTop = rect.top;

        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
    }

    /**
     * Handles the resize during mouse movement, adjusting the window dimensions
     * based on which edge handle is being dragged.
     * @param {MouseEvent} e - The mousemove event during resizing.
     */
    function resize(e) {
        if (!isResizing) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const className = currentHandle.className;

        if (className.includes('resize-handle-e')) {
            editWindow.style.width = Math.max(400, startWidth + dx) + 'px';
        }
        if (className.includes('resize-handle-w')) {
            const newWidth = Math.max(400, startWidth - dx);
            editWindow.style.width = newWidth + 'px';
            editWindow.style.left = (startLeft + startWidth - newWidth) + 'px';
        }
        if (className.includes('resize-handle-s')) {
            editWindow.style.height = Math.max(300, startHeight + dy) + 'px';
        }
        if (className.includes('resize-handle-n')) {
            const newHeight = Math.max(300, startHeight - dy);
            editWindow.style.height = newHeight + 'px';
            editWindow.style.top = (startTop + startHeight - newHeight) + 'px';
        }

        if (target[key]) {
            target[key].layout();
        }
    }

    /**
     * Stops the resize operation and removes the temporary event listeners.
     */
    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// Enable dragging for both editor windows
makeDraggable();
makeDraggable(glo.editorWindowNormal);

// Enable resizing for both editor windows
makeResizable();
makeResizable(glo.editorWindowNormal, glo, 'editorNormal');

/**
 * Dynamically loads the Monaco editor's AMD loader script if not already present.
 * Preserves the Materialize CSS global `M` reference which would otherwise be
 * overwritten by the AMD loader's `require` mechanism.
 * @returns {Promise<void>} Resolves when the loader script is ready.
 */
function loadMonacoLoader() {
    return new Promise((resolve) => {
        if (window.require && window.require.config) return resolve();
        const savedM = window.M;
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.53.0/min/vs/loader.min.js';
        script.onload = () => { window.M = savedM; resolve(); };
        document.head.appendChild(script);
    });
}

/**
 * Initializes a Monaco code editor instance configured for GLSL shader editing.
 * Registers GLSL as a custom language with syntax highlighting for keywords,
 * built-in functions, numbers, strings, and comments. Adds keyboard shortcuts
 * for compiling the shader (Ctrl+S) and duplicating lines (Ctrl+D).
 * @param {HTMLElement} [container=getById('editor-container')] - The DOM container element for the editor.
 * @param {Object} [target=glo] - The object that will hold the editor instance reference.
 * @param {string} [key='editor'] - The property name on the target object to store the editor instance.
 * @param {string} [shaderFragmentSource=fragmentShader] - The initial GLSL source code to display.
 * @param {string} [compileBtnId='compileBtn'] - The ID of the compile button to trigger on Ctrl+S.
 * @param {HTMLElement} [statusEl=getById('editorStatus')] - The DOM element for displaying editor status messages.
 */
function initMonacoEditor(container = getById('editor-container'), target = glo, key = 'editor', shaderFragmentSource = fragmentShader, compileBtnId = 'compileBtn', statusEl = getById('editorStatus')) {
    loadMonacoLoader().then(() => {
        const savedM = window.M;
        require.config({
            paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.53.0/min/vs' }
        });
        require(['vs/editor/editor.main'], function() {
        window.M = savedM;
        if (!monaco.languages.getLanguages().some(l => l.id === 'glsl')) {
            monaco.languages.register({ id: 'glsl' });
        }

        monaco.languages.setMonarchTokensProvider('glsl', {
            keywords: [
                'attribute', 'const', 'uniform', 'varying',
                'break', 'continue', 'do', 'for', 'while',
                'if', 'else', 'in', 'out', 'inout',
                'float', 'int', 'void', 'bool', 'true', 'false',
                'discard', 'return',
                'mat2', 'mat3', 'mat4', 'vec2', 'vec3', 'vec4',
                'sampler2D', 'samplerCube',
                'struct', 'precision', 'highp', 'mediump', 'lowp'
            ],
            builtins: [
                'radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
                'pow', 'exp', 'log', 'sqrt', 'abs', 'floor', 'ceil', 'fract',
                'mod', 'min', 'max', 'clamp', 'mix', 'step', 'smoothstep',
                'length', 'distance', 'dot', 'cross', 'normalize',
                'texture2D', 'gl_Position', 'gl_FragColor', 'gl_FragCoord'
            ],
            tokenizer: {
                root: [
                    [/[a-zA-Z_]\w*/, {
                        cases: {
                            '@keywords': 'keyword',
                            '@builtins': 'predefined',
                            '@default': 'identifier'
                        }
                    }],
                    [/[0-9]+\.[0-9]*/, 'number.float'],
                    [/[0-9]+/, 'number'],
                    [/".*?"/, 'string'],
                    [/\/\/.*$/, 'comment']
                ]
            }
        });

        delete target[key + '_loading'];
        target[key] = monaco.editor.create(container, {
            value: shaderFragmentSource,
            language: 'glsl',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on'
        });

        // Ctrl+S action to compile the shader
        target[key].addAction({
            id: 'compile-shader',
            label: 'Compile shader',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: function() {
                getById(compileBtnId)?.click();
            }
        });

        target[key].addAction({
            id: 'duplicate-line',
            label: 'Duplicate line',
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD
            ],
            run: function(ed) {
                ed.trigger('keyboard', 'editor.action.copyLinesDownAction', null);
            }
        });

        updateStatus('Ready', false, statusEl);
    });
    });
}

/**
 * Updates the editor status bar with a message and color indicator.
 * Displays green for normal status and red for error status.
 * @param {string} message - The status message to display.
 * @param {boolean} [isError=false] - Whether the message represents an error condition.
 * @param {HTMLElement} [status=getById('editorStatus')] - The DOM element to update with the status.
 */
function updateStatus(message, isError = false, status = getById('editorStatus')) {
    if (status) {
        status.textContent = message;
        status.style.color = isError ? '#ef5350' : '#4caf50';
    }
}

/**
 * Initializes the help modal sidebar navigation.
 * Handles section switching and close button behavior.
 */
function initHelpModal() {
    const sidebar = document.querySelector('.help-sidebar');
    if (!sidebar) return;

    sidebar.addEventListener('click', function(e) {
        const link = e.target.closest('a[data-section]');
        if (!link) return;
        e.preventDefault();

        const sectionId = link.dataset.section;
        const target = document.getElementById(sectionId);
        if (!target) return;

        sidebar.querySelectorAll('a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');

        document.querySelectorAll('.help-section').forEach(s => s.classList.remove('active'));
        target.classList.add('active');
    });

    const closeBtn = getById('helpCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            M.Modal.getInstance(getById('helpModal')).close();
        });
    }
}