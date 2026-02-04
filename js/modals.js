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
function importModal(){
	glo.modalOpen = true;
	event.stopPropagation();
	event.preventDefault();
	if(glo.fullScreen){ glo.engine.switchFullscreen(); }
	$('#importModal').modal('open', {
		onCloseEnd: function() {
			if(glo.fullScreen){ glo.engine.switchFullscreen(); }
			glo.modalOpen = false;
		},
	});
}

function download_JSON_mesh(event){
	$('#importModal').modal('close');
	var file_to_read = document.getElementById("jsonFileUpload").files[0];

	const fileName      = file_to_read.name;
	const fileExtension = fileName.slice(fileName.lastIndexOf('.') + 1); 

	var fileread = new FileReader();
	fileread.onload = function(e) {
		var fileContent = e.target.result;
		$("#jsonFileUpload").val("");

		switch(fileExtension){
			case 'json':
				var contentJsonFile = JSON.parse(fileContent);
				for(var prop in contentJsonFile){ glo.params[prop] = contentJsonFile[prop]; }

				if(typeof(glo.playWithColMode) == "undefined"){ glo.playWithColMode = playWithColNextMode(); }
				var playWithColorMode = glo.params.playWithColorMode;
				while(playWithColorMode != glo.playWithColMode.next().value){}

				paramsToControls();
				var sameAsRadioCheck = isInputsEquationsSameAsRadioCheck();
				var formName = glo.params.formName;
				if(glo.coordsType != glo.params.coordsType){
				glo.coordsType = glo.params.coordsType;
				glo.histo.setGoodCoords(glo.coordsType);
				}
				glo.fromHisto = !sameAsRadioCheck;
				glo.radios_formes.setCheckByName("Radio " + formName);
				glo.formes.setFormeSelect(formName, glo.coordsType, sameAsRadioCheck);
				glo.fromHisto = false;
				if(!sameAsRadioCheck){
					make_curves();
					glo.histo.save();
				}
			break;
			case 'obj':
				ribbonDispose();
				glo.curves.lineSystem.dispose();

				var blob = new Blob([fileContent], { type: "text/plain" });
				var url  = URL.createObjectURL(blob);
				var dataUrl = e.target.result;
				var base64String = dataUrl.split(',')[1];
            	var dataString = base64String;
				BABYLON.SceneLoader.ImportMesh("", "data:;base64,", dataString, glo.scene, function (meshes) {
					// Les meshs sont chargés
					meshes.forEach((mesh, i) => {
						if(!i){
							console.log(mesh.name);
						}
					});

					let meshImport = meshes[1];

					glo.ribbon = meshImport;
					giveMaterialToMesh();

					glo.curves.path = turnVerticesDatasToPaths();
					glo.curves.lineSystem.dispose();

				}, null, function (scene, message, exception) {
					console.error(message, exception);
				}, ".obj");

			break;
		}
	};

	switch(fileExtension){
		case 'json':
			fileread.readAsText(file_to_read);
		break;
		case 'obj':
			fileread.readAsDataURL(file_to_read);
		break;
	}
}

var objectUrl;
async function exportMesh(exportFormat) {
    if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
    }

    await glo.ribbon.bakeCurrentTransformIntoVertices();

    let strMesh;
    if (exportFormat !== "json") {
        if (exportFormat === "babylon") {
            strMesh = JSON.stringify(BABYLON.SceneSerializer.SerializeMesh(glo.ribbon));
        } else if (exportFormat === "obj") {
            if (!glo.lineSystem) {
                strMesh = BABYLON.OBJExport.OBJ([glo.ribbon]);
            } else {
                let meshesToExport = [];
                glo.lines.forEach(line => {
                    if (Array.isArray(line) && line.length > 0 && line.every(point => point instanceof BABYLON.Vector3)) {
                        let tube = BABYLON.MeshBuilder.CreateTube("tube", { path: line, radius: 0.1 }, glo.scene);
                        if (tube) {
                            meshesToExport.push(tube);
                        } else {
                            console.log("Tube creation failed for line:", line);
                        }
                    }
                });

                if (meshesToExport.length > 0) {
                    let meshToExport = await BABYLON.Mesh.MergeMeshes(meshesToExport, true, true);
                    if (meshToExport) {
                        strMesh = BABYLON.OBJExport.OBJ([meshToExport]);
                        glo.ribbon = await BABYLON.Mesh.MergeMeshes([glo.ribbon, meshToExport], true, true);
                    } else {
                        console.log("Mesh fusion failed");
                    }
                } else {
                    console.log("No meshes to export");
                }
            }
        }

        var filename = $("#filename").val();
        if (filename.toLowerCase().lastIndexOf("." + exportFormat) !== filename.length - exportFormat.length || filename.length < exportFormat.length + 1) {
            filename += "." + exportFormat;
        }
    } else {
        var filename = $("#filename").val();
        var exportFormat = 'json';
        if (filename.toLowerCase().lastIndexOf("." + exportFormat) !== filename.length - exportFormat.length || filename.length < exportFormat.length + 1) {
            filename += "." + exportFormat;
        }

        glo.params.coordsType = glo.coordsType;
        var objForm = glo.formes.getFormSelect();
        var form = !objForm ? "" : objForm.form.text;
        glo.params.formName = form;
        strMesh = JSON.stringify(glo.params);
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
    $('#exportModal').modal('close');

    return false;
}

require.config({ 
    paths: { 
        vs: './cdn/js/monaco/vs'
    } 
});

function openShaderWindow(target = glo, key = 'editor', editWindow = glo.editorWindow, shaderFragmentSource = fragmentShader, editorContainer = getById('editor-container')){
	editWindow.style.display = 'flex';
        
	if (!target[key]) {
		initMonacoEditor(editorContainer, target, key, shaderFragmentSource);
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
function makeResizable(editWindow = glo.editorWindow) {
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
    
    function resize(e, target = glo, key = 'editor', editWindow = glo.editorWindow) {
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

// Rendre redimensionnable
makeResizable();

function initMonacoEditor(container = document.getElementById('editor-container'), target = glo, key = 'editor', shaderFragmentSource = fragmentShader) {
    require(['vs/editor/editor.main'], function() {
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
                document.getElementById('compileBtn')?.click();
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
        
        updateStatus('Prêt');
    });
}

function updateStatus(message, isError = false, status = document.getElementById('editorStatus')) {
    if (status) {
        status.textContent = message;
        status.style.color = isError ? '#ef5350' : '#4caf50';
    }
}