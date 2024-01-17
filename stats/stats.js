//****************** VARIABLES GLOBALES ******************//
const glo = {
    url        : 'https://api.thingiverse.com/things/id?access_token=9f71490b6e8be82562c62c6387298f36',
    ids        : [6351873, 6350389, 6349629, 6348005, 6347845, 6347726, 6347433, 6343923,
                  6343874, 6343835, 6343502, 6343477, 6343458, 6343453, 6343440, 6343361,
                  6343353, 6339762, 6339767, 6352714, 6354542, 6354594, 6356656, 6356673,
                  6359424, 6366276, 6368457, 6370511, 6370771, 6376904, 6383902, 6384490,
                  6386074, 6388308, 6389108, 6391145, 6393716, 6393826, 6393893, 6395838,
                  6397564, 6398300, 6398371, 6403971, 6405779, 6406330, 6406333, 6407766,
                  6414571, 6414905, 6416636, 6418259, 6423574, 6423741, 6425262, 6428378,
                  6428384, 6430518, 6433384, 6433441, 6434057, 6435467],
    res        : [],   
    datasStats : [],
    sortNumber : ['1', 'true'],
    heartType  : 'all',
	heartTypes : function* (){
		const hTypes = ['heart', 'noHeart', 'all'];
		while (true) {
			for (const hType of hTypes) {
				this.heartType = hType;
				yield hType;
			}
		}
	},
    nbThingsOnGraphs : 10,
    barGraph         : false,
};
glo.heartTypes = glo.heartTypes();  

const getById         = function(id){ return document.getElementById(id); };
const round2          = val => Math.round(10000 * (val), 2) / 100;
const nanToZero       = val => !isNaN(val) && isFinite(val) ? val : 0;
const openThingWindow = (url) => window.open(url, '_blank');

let openWindowDyn = false;

let thingThumbnailDialogContainer = getById('thingThumbnailDialogContainer');
let thingThumbnailDialog          = getById('thingThumbnailDialog');
let thingThumbnailImageContainer  = getById('thingThumbnailImageContainer');
let thingThumbnailTitleContainer  = getById('thingThumbnailTitleContainer');
let thingThumbnailTitle           = getById('thingThumbnailTitle');
let statsBodyTable                = getById('statsBodyTable');
let filterDatasStats              = getById('filterDatasStats');
let generalInfosDialogContainer   = getById('generalInfosDialogContainer');
let generalInfosDialog            = getById('generalInfosDialog');

//****************** ÉVÈNEMENTS ******************//
document.addEventListener('DOMContentLoaded', async function() {
    refreshDatas();
});
document.addEventListener('click', function() {
    if(thingThumbnailDialog.open){ thingThumbnailDialog.close(); }
    if(generalInfosDialog.open){ generalInfosDialog.close(); }
});
thingThumbnailDialogContainer.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
});
generalInfosDialogContainer.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
});

//****************** MAIN FUNCTIONS ******************//
function datasToTable(datas = glo.datasStats){
    removeAllChildren(statsBodyTable);

    datas.forEach((rowDatas, n) => {
        let tr = document.createElement("tr");
        rowDatas.forEach((rowData, i) => {
            let td = document.createElement("td");

            if(!i){
                td.classList.add('alignLeft');
                td.style.cursor = 'pointer';
                td.addEventListener('click', showThingDetail);
            }

            let tdTxt = document.createTextNode(rowData);
            td.appendChild(tdTxt);
            tr.appendChild(td);
        });
        tr.classList.add(n%2==0 ? 'oddTr': 'evenTr');
        statsBodyTable.appendChild(tr);
    });

    insertTotals(datas);

    getById('nbThings').innerHTML = datas.length + " / " + glo.res.length;
}

function insertTotals(datas){
    const totaux = totauxStats(datas);
    let tr       = document.createElement("tr");
    let td       = document.createElement("td");
    let tdTxt    = document.createTextNode('Total');

    td.style.width      = "190px";
    td.style.borderLeft = "none";

    let statsFootTable = getById('statsFootTable');

    statsFootTable.firstChild.remove();

    td.appendChild(tdTxt);
    td.style.fontWeight = 900;
    tr.appendChild(td);
    totaux.forEach((totalCol, i) => {
        let td    = document.createElement("td");
        let tdTxt = document.createTextNode(totalCol);

        td.style.fontWeight = 900;

        td.appendChild(tdTxt);
        tr.appendChild(td);
    });
    tr.id = "totauxStatsTable";
    statsFootTable.appendChild(tr);
}

function filterDatasStatsOnLike(){
    const filterType = glo.heartTypes.next().value;

    switch(filterType){
        case 'heart':
            getById('filterOnLikeSymbol').textContent = "💘";
        break;
        case 'noHeart':
            getById('filterOnLikeSymbol').textContent = " 💞";
        break;
        case 'all':
            getById('filterOnLikeSymbol').textContent = "❤️";
        break;
    }
    filterStatsTable(filterDatasStats.value);
}

function filterStatsTable(val){
    let datasFiltered = [];
    if(isNaN(parseInt(val))){
        datasFiltered = glo.datasStats.filter(data => data[0].toLowerCase().includes(val.toLowerCase()));
    }
    else{
        const valNum = parseInt(val);
        datasFiltered = glo.datasStats.filter(data => 
            data[1] >= valNum || data[2] >= valNum || data[3] >= valNum 
        );
    }

    switch(glo.heartType){
        case 'heart':
            datasFiltered = datasFiltered.filter(data => data[3]);
        break;
        case 'noHeart':
            datasFiltered = datasFiltered.filter(data => !data[3]);
        break;
    }
    
    datasToTable(datasFiltered.length ? datasFiltered : glo.datasStats);
}

function infos(){
    let nbMeshes = 0, nbCollects = 0, nbComments = 0, nbRemixs = 0, nbMakes = 0;
    glo.res.forEach(res => {
        nbMeshes   += res.zip_data.files.length;
        nbCollects += res.collect_count;
        nbComments += res.comment_count;
        nbRemixs   += res.remix_count;
        nbMakes    += res.make_count;
    });
    return {nbMeshes, nbCollects, nbComments, nbRemixs, nbMakes};
}

function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function showGeneralInfos(e){
    e.preventDefault(); 
    e.stopPropagation();

    const genInfos = infos();

    showNumberTimeByTime(genInfos.nbMeshes, 'generalInfo-meshes');
    showNumberTimeByTime(genInfos.nbCollects, 'generalInfo-collections');
    showNumberTimeByTime(genInfos.nbComments, 'generalInfo-commentaires');
    showNumberTimeByTime(genInfos.nbMakes, 'generalInfo-makes');
    showNumberTimeByTime(genInfos.nbRemixs, 'generalInfo-remixs');


    generalInfosDialog.showModal();
}

function showNumberTimeByTime(number, htmlElemId) {
    for (let i = 0; i <= number; i++) {
        setTimeout(function() {
            getById(htmlElemId).innerText = i;
        }, i * 5);
    }
}

function sortDatasStats(numOrder = 1, desc = 'true', datas = glo.datasStats){
    desc = desc === 'true' ? true : false;
    numOrder = parseInt(numOrder);
    if(numOrder){ desc ? datas.sort((a,b) => b[numOrder] - a[numOrder]) : glo.datasStats.sort((a,b) => a[numOrder] - b[numOrder]); }
    else{ desc ?
        datas.sort((a,b) => {if (a[0] < b[0]) {
            return -1;
        }
        if (a[0] > b[0]) {
            return 1;
        }
        return 0;}) :
        datas.sort((a,b) => {if (a[0] > b[0]) {
            return -1;
        }
        if (a[0] < b[0]) {
            return 1;
        }
        return 0;});
    }
    filterStatsTable(filterDatasStats.value);
}

function sortDatasStatsOnClick(e){
    const desc = e.target.dataset.desc === 'true' ? true : false;

    [...getById('trTheadStatsTable').children].forEach(th => {
        if(e.target !== th){
            th.classList.remove('sort_asc');
            th.classList.remove('sort_desc');
            th.dataset.desc = 'true';
        }
        else{
            th.classList.remove(desc ? 'sort_asc' : 'sort_desc');
            th.classList.add(desc ? 'sort_desc' : 'sort_asc');
        }
    });

    glo.sortNumber = [e.target.dataset.order, e.target.dataset.desc];

    sortDatasStats(e.target.dataset.order, e.target.dataset.desc);
    e.target.dataset.desc = desc ? 'false' : 'true';
}

function totauxStats(datas = glo.datasStats){
    const datasLength = datas.length;

    let totV = 0, totD = 0, totL = 0, totDV = 0, totLV = 0, totLD = 0, totVDL = 0, totTime = 0, totVDLT = 0;
    datas.forEach(rowDatas => {
        totV    += rowDatas[1];
        totD    += rowDatas[2];
        totL    += rowDatas[3];
        totDV   += rowDatas[4];
        totLV   += rowDatas[5];
        totLD   += rowDatas[6];
        totVDL  += rowDatas[7];
        totTime  = rowDatas[8] > totTime ? rowDatas[8] : totTime;
        totVDLT += rowDatas[9];
    });

    return [totV, totD, totL, Math.round(100 * totDV/datasLength, 2) / 100, Math.round(100 * totLV/datasLength, 2)/100,
            Math.round(100 * totLD/datasLength, 2)/100, Math.round(100 * totVDL/datasLength, 2)/100,
            Math.round(100 * totTime, 2)/100, , Math.round(100 * totVDLT/datasLength, 2)/100];
}

function toggleTabGraph(){
    let statsTable     = getById('statsTable');
    let statsGraph     = getById('statsGraph');
    let toggleTabGraph = getById('toggleTabGraph');

    const colors = ['Tomato', 'DarkSalmon', 'HotPink', 'DarkKhaki', 'Plum', 'Maroon', 'RebeccaPurple', 'MediumAquamarine', 'DarkTurquoise', 'RoyalBlue'];

    if(statsTable.style.display === 'none'){
        statsTable.style.display = '';
        statsGraph.style.display = 'none';
        toggleTabGraph.innerText = '📊';
    }
    else{
        statsTable.style.display = 'none';
        statsGraph.style.display = '';
        toggleTabGraph.innerText = '📋';

        const label = [...getById('trTheadStatsTable').children][glo.sortNumber[0]].innerText;

        let labels = [], datas = [], total = 0;
        for(let i = 0; i < glo.nbThingsOnGraphs; i++){
            labels.push(glo.datasStats[i][0]);
            const val = parseInt(glo.datasStats[i][glo.sortNumber[0]]);
            total+=val;
            datas.push(val);
        }

        if(glo.statsGraph){ glo.statsGraph.destroy(); }

        const ctx = getById('statsGraph');
        glo.statsGraph = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label           : 'Nombre de ' + label,
                    backgroundColor : colors,
                    data            : datas,
                    borderWidth     : 1,
                }]
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            color: '#eee'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label;
                                let value = context.parsed;

                                const percent = Math.round(10000 * value / total, 2) / 100;
                                
                                return label + ': ' + percent + ' %';
                            },
                        }
                    },
                    title: {
                        display: true,
                        text: 'Statistiques sur les ' + label + ' - ' + 'pourcentage par rapport aux 10 premiers',
                        font: {
                            size: 18
                        },
                        color: '#eee',
                        position: 'top'
                    }
                }
            }            
        });
    }
}

//****************** ASYNC FUNCTION ******************//
async function getDatas(){
    await getStats();
    glo.res.forEach(r => {
        const name  = r.name;
        const views = r.view_count;
        const downs = r.download_count;
        const likes = r.like_count;

        let DonV = round2(downs/views);
        let LonV = round2(likes/views);
        let LonD = round2(likes/downs);
        let VDL  = views + (downs*5) + (likes*50);
        let time = Math.round((new Date() - new Date(r.modified)) / 1000 / 3600 / .24, 1) / 100;
        let VDLT = Math.round(100 * VDL/(time > 1 ? time : 1), 2) / 100;

        DonV = nanToZero(DonV); 
        LonV = nanToZero(LonV); 
        LonD = nanToZero(LonD); 
        VDL  = nanToZero(VDL); 
        time = nanToZero(time); 
        VDLT = nanToZero(VDLT); 

        glo.datasStats.push([name, views, downs, likes, DonV, LonV, LonD, VDL, time, VDLT]);
    });
}

async function getImg(url) {
    try {
        const response = await fetch(url);
        let img        = await response.blob();

        let imgUrlObject = URL.createObjectURL(img);
        glo.img          = document.createElement("img");
        glo.img.src      = imgUrlObject;

        URL.revokeObjectURL(imgUrlObject);

    } catch (error) {
        console.log('error', error);
    }
}

async function getStat(id) {
    try {
        const response = await fetch(glo.url.replace('id', id), { cache: 'no-cache' });
        const result   = await response.json();
        glo.res.push(result);
    } catch (error) {
        console.log('error', error);
    }
}

async function getStats() {
    const promises = glo.ids.map(id => getStat(id));
    await Promise.all(promises);
}

async function refreshDatas(){
    glo.res        = [];
    glo.datasStats = [];
    await getDatas();
    sortDatasStats(...glo.sortNumber);
}

async function showThingDetail(event){
    let tdClicked = event.target;

    let name = tdClicked.innerText;
    const thing = glo.res.find(r => r.name === name);

    const thumbnailURL = thing.thumbnail;

    await getImg(thumbnailURL);

    if(thingThumbnailImageContainer.firstChild){ thingThumbnailImageContainer.firstChild.remove(); }

    glo.img.style.height = '500px';
    thingThumbnailImageContainer.appendChild(glo.img);

    thingThumbnailTitle.innerText    = thing.name;
    thingThumbnailTitle.style.cursor = 'pointer';

    if(openWindowDyn){ thingThumbnailTitle.removeEventListener("click", openWindowDyn); }
    openWindowDyn = () => openThingWindow(thing.public_url);
    thingThumbnailTitle.addEventListener("click", openWindowDyn);

    getById('thingInfo-date').innerText        = (new Date(thing.added)).toLocaleDateString();
    getById('thingInfo-id').innerText          = thing.id;
    getById('thingInfo-tags').innerText        = thing.tags.map(tag => " " + tag.name).toString();
    getById('thingInfo-collections').innerText = thing.collect_count;
    getById('thingInfo-files').innerText       = thing.file_count;
    getById('thingInfo-comments').innerText    = thing.comment_count;

    getById('thingThumbnailTitle').dataset.numchevron = '0';

    thingThumbnailDialog.showModal();
}

async function updThingImg(e, direction){
    const thing = glo.res.find(r => r.id === parseInt(getById('thingInfo-id').innerText));

    const zipData         = thing.zip_data;
    const imagesLastIndex = zipData.images.length - 1;

    let numChevron = parseInt(getById('thingThumbnailTitle').dataset.numchevron);
    if(imagesLastIndex){
        if(direction === 1){
            if(numChevron < imagesLastIndex){ numChevron++; }
            else{ numChevron = 0; }
        }
        else{
            if(numChevron > 0){ numChevron--; }
            else{ numChevron = imagesLastIndex; }
        }
        getById('thingThumbnailTitle').dataset.numchevron = numChevron.toString();

        await getImg(zipData.images[numChevron].url);
        
        if(thingThumbnailImageContainer.firstChild){ thingThumbnailImageContainer.firstChild.remove(); }
        glo.img.style.height = '500px';
        thingThumbnailImageContainer.appendChild(glo.img);
    }
}