function initExportModal(){
	var elems = document.querySelectorAll('#exportModal');
    M.Modal.init(elems, {
        onOpenEnd: function() {
            glo.modalOpen = true;
            document.querySelector('#weightToDownload').textContent = glo.ribbon.weightToDownload();
			$('#filename').focus();
        },
        onCloseEnd: function() {
			glo.modalOpen = false;
            if (glo.fullScreen) {
                glo.engine.switchFullscreen();
            }
        },
    });
}

const extraireTexteEtNombre = (chaine) => {
    const resultat = chaine.match(/^(.*?)(\d+)?$/);
    return {
        filename   : resultat[1],
        fileNumber : resultat[2] ? parseInt(resultat[2], 10) : false
    };
};

function exportModal(){
	glo.modalOpen = true;
	if(glo.fullScreen){ glo.engine.switchFullscreen(); }
	var instance = M.Modal.getInstance(document.querySelector('#exportModal'));
    instance.open();

	let {filename, fileNumber} = extraireTexteEtNombre($("#filename").val());
	if(fileNumber){
		$("#filename").val(filename + (fileNumber + 1));
	}
}
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

function importModal(){
	glo.modalOpen = true;
	if(typeof event !== 'undefined' && event && event.stopPropagation){
		event.stopPropagation();
		event.preventDefault();
	}
	if(glo.fullScreen){ glo.engine.switchFullscreen(); }
	M.Modal.getInstance(document.querySelector('#importModal')).open();
}

function download_JSON_mesh(event){
	$('#importModal').modal('close');
	var file_to_read = getById("jsonFileUpload").files[0];
	$("#jsonFileUpload").val("");

	const fileName      = file_to_read.name;
	const fileExtension = fileName.slice(fileName.lastIndexOf('.') + 1);

	var fileread = new FileReader();
	fileread.onload = function(e) {
		var fileContent = e.target.result;

		if (fileExtension === 'obj') {
			const isAppExport = fileName.toLowerCase().endsWith('.surface.obj');
			if (isAppExport) {
				importAppOBJ(fileContent, fileName);
			} else {
				importOBJWithBabylon(file_to_read, fileName);
			}
			return;
		}

		if (fileExtension === 'json') {
			applyImportedJSON(fileContent);
		}
	};

	fileread.readAsText(file_to_read);
}

function applyImportedJSON(fileContent) {
	var contentJsonFile = JSON.parse(fileContent);
	for(var prop in contentJsonFile){
		if(prop === 'meshTransformations'){
			Object.assign(glo.params.meshTransformations, contentJsonFile.meshTransformations);
		} else {
			glo.params[prop] = contentJsonFile[prop];
		}
	}

	paramsToControls();
    if(!contentJsonFile.text_input_sym_r){ glo.input_sym_r.text = ''; }

	var sameAsRadioCheck = isInputsEquationsSameAsRadioCheck();
	var formName = glo.params.formName;
	if(glo.coordsType != glo.params.coordsType){
		while(glo.coordsType !== glo.params.coordsType){ glo.coordinatesType.next(); }
        add_radios();
	}

	var importedStepsU = glo.params.steps_u;
	var importedStepsV = glo.params.steps_v;

	glo.formes.setFormeSelect(formName, glo.coordsType, sameAsRadioCheck);
    glo.radios_formes.setCheckByName(`Radio-${formName}`);

	// Restaurer la résolution importée (setFormeSelect l'écrase avec les valeurs par défaut de la forme)
	if(sameAsRadioCheck){
		glo.params.steps_u = importedStepsU;
		glo.params.steps_v = importedStepsV;
		glo.slider_nb_steps_u.value = importedStepsU;
		glo.slider_nb_steps_v.value = importedStepsV;

		if(glo.slider_nb_steps_u.maximum < importedStepsU){ glo.slider_nb_steps_u.maximum = importedStepsU * 2; }
		if(glo.slider_nb_steps_v.maximum < importedStepsV){ glo.slider_nb_steps_v.maximum = importedStepsV * 2; }
	}

	if(!sameAsRadioCheck){
		make_curves();
	}

	// Restauration du shader de couleurs
	if(contentJsonFile.shaderSelectIndex !== undefined){
		var shaderIndex = parseInt(contentJsonFile.shaderSelectIndex);
		if(!isNaN(shaderIndex) && shaderIndex >= 0 && shaderIndex < fragmentShaders.length){
			glo.numShaderSelect = shaderIndex;
			ShaderCRUD.currentShaderIndex = shaderIndex;
			ShaderCRUD.updateSelectValue();
		}

		if(contentJsonFile.shaderCode){
			// Restaurer le code fragment (inclut les éventuelles modifications utilisateur)
			fragmentShaders[glo.numShaderSelect] = contentJsonFile.shaderCode;
		}

		// Recomposer le shader complet et mettre à jour l'éditeur si ouvert
		fragmentShader = fragmentShaderHeader + fragmentShaders[glo.numShaderSelect] + fragmentShaderFooter;
		if(glo.editor){
			glo.editor.setValue(fragmentShader);
		}

		// Compiler directement via l'instance GPU (fonctionne même sans Monaco)
		if(glo.ribbon && glo.ribbon.shaderMeshInstance){
			glo.ribbon.shaderMeshInstance.updateFragmentShader(fragmentShaders[glo.numShaderSelect]);
		}
	}
}

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

function loadExampleJSON(selectElement) {
	var fileName = selectElement.value;
	if (fileName === 'none') return;

	fetch('json/import-exemples/' + fileName)
		.then(function(response) {
			if (!response.ok) throw new Error('Failed to load example file');
			return response.text();
		})
		.then(function(fileContent) {
			$('#importModal').modal('close');
			applyImportedJSON(fileContent);
			selectElement.value = 'none';
			M.FormSelect.init(selectElement);
		})
		.catch(function(err) {
			console.error('Error loading example file:', err);
		});
}

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

var objectUrl;
async function exportMesh(exportFormat) {
    if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
    }

    var filename = $("#filename").val();
    if (exportFormat === "obj") {
        if (!filename.toLowerCase().endsWith(".surface.obj")) {
            filename = filename.replace(/\.(surface\.)?obj$/i, "") + ".surface.obj";
        }
    } else if (filename.toLowerCase().lastIndexOf("." + exportFormat) !== filename.length - exportFormat.length || filename.length < exportFormat.length + 1) {
        filename += "." + exportFormat;
    }

    let strMesh;
    if (exportFormat === "json") {
        // Export JSON : on sérialise uniquement glo.params, sans toucher au mesh GPU
        glo.params.coordsType = glo.coordsType;
        var objForm = glo.formes.getFormSelect();
        glo.params.formName = !objForm ? "" : objForm.form.text;

        // Export du shader de couleurs sélectionné
        glo.params.shaderSelectIndex = glo.numShaderSelect;

        // Toujours exporter le code fragment actuel (qui inclut les modifications utilisateur
        // si le shader a été compilé via l'éditeur)
        glo.params.shaderCode = fragmentShaders[glo.numShaderSelect];

        strMesh = JSON.stringify(glo.params);
    } 
    else {
        // Pour les shader meshes, extraire les positions réelles du GPU
        let exportMeshRef = null;
        if (glo.fromShader && glo.ribbon && glo.ribbon.shaderMeshInstance) {
            exportMeshRef = glo.ribbon.shaderMeshInstance.createExportMesh();
            if (!exportMeshRef) {
                console.error('[Export] Impossible d\'extraire les positions du shader mesh');
                return false;
            }
        }

        const meshToExport = exportMeshRef || glo.ribbon;
        await meshToExport.bakeCurrentTransformIntoVertices();

        strMesh = BABYLON.OBJExport.OBJ([meshToExport]);
        
        // Nettoyer le mesh temporaire d'export
        if (exportMeshRef) {
            exportMeshRef.dispose();
        }
    }

    // Créer un blob et générer l'URL de téléchargement
    var blob = new Blob([strMesh], { type: "octet/stream" });
    objectUrl = (window.webkitURL || window.URL).createObjectURL(blob);

    // Mettre à jour le lien de téléchargement caché
    $("#downloadLink").attr("href", objectUrl);
    $("#downloadLink").attr("download", filename);

    // Déclencher le téléchargement en cliquant sur le lien caché
    $("#downloadLink")[0].click();

    // Fermer le modal
    M.Modal.getInstance(document.querySelector('#exportModal')).close();

    return false;
}

function openShaderWindow(target = glo, key = 'editor', editWindow = glo.editorWindow, shaderFragmentSource = fragmentShader, editorContainer = getById('editor-container'), compileBtnId = 'compileBtn', statusEl = getById('editorStatus')){
	editWindow.style.display = 'flex';

	if (!target[key]) {
		initMonacoEditor(editorContainer, target, key, shaderFragmentSource, compileBtnId, statusEl);
	} else {
		target[key].layout();
		target[key].focus();
	}
}

// Fonction pour déplacer la fenêtre
function makeDraggable(editWindow = glo.editorWindow) {
    const header = editWindow.querySelector('.editor-header');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    function dragStart(e) {
        if (isFullscreen) return;
        if (e.target.closest('.editor-controls')) return;
        
        initialX = e.clientX - editWindow.offsetLeft;
        initialY = e.clientY - editWindow.offsetTop;
        isDragging = true;
    }
    
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
    
    function dragEnd() {
        isDragging = false;
    }
}

// Fonction pour redimensionner la fenêtre
function makeResizable(editWindow = glo.editorWindow, target = glo, key = 'editor') {
    const handles = editWindow.querySelectorAll('.resize-handle');

    handles.forEach(handle => {
        handle.addEventListener('mousedown', initResize);
    });

    let isResizing = false;
    let currentHandle = null;
    let startX, startY, startWidth, startHeight, startLeft, startTop;

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

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// Rendre déplaçable
makeDraggable();
makeDraggable(glo.editorWindowNormal);

// Rendre redimensionnable
makeResizable();
makeResizable(glo.editorWindowNormal, glo, 'editorNormal');

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

function initMonacoEditor(container = getById('editor-container'), target = glo, key = 'editor', shaderFragmentSource = fragmentShader, compileBtnId = 'compileBtn', statusEl = getById('editorStatus')) {
    loadMonacoLoader().then(() => {
        const savedM = window.M;
        require.config({
            paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.53.0/min/vs' }
        });
        require(['vs/editor/editor.main'], function() {
        window.M = savedM;
        monaco.languages.register({ id: 'glsl' });

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

        // Action Ctrl+S pour compiler
        target[key].addAction({
            id: 'compile-shader',
            label: 'Compiler le shader',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: function() {
                getById(compileBtnId)?.click();
            }
        });

        target[key].addAction({
            id: 'duplicate-line',
            label: 'Dupliquer la ligne',
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD
            ],
            run: function(ed) {
                ed.trigger('keyboard', 'editor.action.copyLinesDownAction', null);
            }
        });

        updateStatus('Prêt', false, statusEl);
    });
    });
}

function updateStatus(message, isError = false, status = getById('editorStatus')) {
    if (status) {
        status.textContent = message;
        status.style.color = isError ? '#ef5350' : '#4caf50';
    }
}