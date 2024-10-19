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

function stopPropagationEvent(event) {
    event.stopPropagation();
}

function exportModal(){
	glo.modalOpen = true;
	if(glo.fullScreen){ glo.engine.switchFullscreen(); }
	var instance = M.Modal.getInstance(document.querySelector('#exportModal'));
    instance.open();
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
					glo.histoColo.save();
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

function toggleDataTable(){
	dataTableBody.innerHTML = '';

	const coeff = (glo.params.symmetrizeX ? glo.params.symmetrizeX : 1) *
	              (glo.params.symmetrizeY ? glo.params.symmetrizeY : 1) * (glo.params.symmetrizeZ ? glo.params.symmetrizeZ : 1);


	let vertices = glo.ribbon.getVerticesData(BABYLON.VertexBuffer.PositionKind);

	const uStep   = (glo.params.u*2) / glo.params.steps_u;
	const vStep   = (glo.params.v*2) / glo.params.steps_v;

	const uFirst = -round(0.5 * uStep * glo.params.steps_u, 2);
	const vFirst = -round(0.5 * vStep * glo.params.steps_v, 2);

	const maxStepU = (glo.params.steps_u + 1 ) * coeff;

	const UV = isUV();

	const datas = [];
	let n       = 0;
	if(UV.isU && UV.isV){
		for(let stepU = 0; stepU < maxStepU; stepU++){
			const u = round(uFirst + (stepU*uStep), 2);
			for(let stepV = 0; stepV <= glo.params.steps_v; stepV++){
				const v = round(vFirst + (stepV*vStep), 2);
				const x = round(vertices[n*3], 2);
				const y = round(vertices[n*3 + 1], 2);
				const z = round(vertices[n*3 + 2], 2);

				datas.push([stepU, stepV, n, u, v, x, y, z]);
				n++;
			}
		}
	}
	else if(UV.isU){
		for(let stepU = 0; stepU < maxStepU; stepU++){
			const u = round(uFirst + (stepU*uStep), 2);
			const v = 'none';
			const x = round(vertices[n*3], 2);
			const y = round(vertices[n*3 + 1], 2);
			const z = round(vertices[n*3 + 2], 2);

			datas.push([stepU, n, 'none', u, v, x, y, z]);
			n++;
		}
	}
	else if(UV.isV){
		for(let stepV = 0; stepV <= glo.params.steps_v * coeff; stepV++){
			const u = 'none';
			const v = round(vFirst + (stepV*vStep), 2);
			const x = round(vertices[n*3], 2);
			const y = round(vertices[n*3 + 1], 2);
			const z = round(vertices[n*3 + 2], 2);

			datas.push(['none', n, stepV, u, v, x, y, z]);
			n++;
		}
	}
	else{
		datas.push([stepU, stepV, n, 'none', 'none', 'none', 'none', 'none']);
	}

	datas.forEach(datasTr => {
		let tr = document.createElement('tr');
		datasTr.forEach(dataTd => {
			let td 		= document.createElement('td');
			const tdTxt = document.createTextNode(dataTd);

			td.appendChild(tdTxt);
			tr.appendChild(td);
		});
		dataTableBody.appendChild(tr);
	});
	$('#dataModal').modal('open');
}

function filterTable() {
	const inputs = document.querySelectorAll('thead input');
	const table  = document.getElementById("dataTable");
	const rows   = table.querySelectorAll("tbody tr");

	rows.forEach(row => {
		let shouldShow = true;

		// Loop through each input filter and check the corresponding cell
		inputs.forEach((input, index) => {
		const filter = input.value.trim();  // Exact match, don't change case
		const cell = row.getElementsByTagName("td")[index];

		if (cell) {
			const cellValue = cell.textContent.trim() || cell.innerText.trim();

			// If a filter is present, check for exact match
			if (filter !== "" && cellValue !== filter) {
				shouldShow = false;
			}
		}
		});

		// Show or hide the row based on whether all filters match
		row.style.display = shouldShow ? "" : "none";
	});
}

function initDataModal(){
	$('#dataModal').modal({
		onCloseEnd: function() {
			if(glo.sphereToShowVertex){ 
				glo.sphereToShowVertex.dispose(); 
				glo.sphereToShowVertex = null; 
			} 
		},
		onOpenEnd: function() {
			$('#dataModal').css('opacity', $('#dataModalOpacity').val());
		}
	 });
}