//****************** VARIABLES GLOBALES ******************//
const glo = {
    username   : 'Hopf',
    url        : 'https://api.thingiverse.com/things/id?access_token=9f71490b6e8be82562c62c6387298f36',
    userUrl    : 'https://api.thingiverse.com/users/username/requestKind?access_token=9f71490b6e8be82562c62c6387298f36',
    catsUrl    : 'https://api.thingiverse.com/things/id/categories?access_token=9f71490b6e8be82562c62c6387298f36',
    ids        : [6351873, 6350389, 6349629, 6348005, 6347845, 6347726, 6347433, 6343923,
                  6343874, 6343835, 6343502, 6343477, 6343458, 6343453, 6343440, 6343361,
                  6343353, 6339762, 6339767, 6352714, 6354542, 6354594, 6356656, 6356673,
                  6359424, 6366276, 6368457, 6370511, 6370771, 6376904, 6383902, 6384490,
                  6386074, 6388308, 6389108, 6391145, 6393716, 6393826, 6393893, 6395838,
                  6397564, 6398300, 6398371, 6403971, 6405779, 6406330, 6406333, 6407766,
                  6414571, 6414905, 6416636, 6418259, 6423574, 6423741, 6425262, 6428378,
                  6428384, 6430518, 6433384, 6433441, 6434057, 6435467, 6447439, 6447463,
                  6462962, 6462978, 6462982, 6462991, 6463002, 6463148, 6471696, 6471701,
                  6487071, 6487076, 6487077, 6487082, 6487085, 6497823, 6498162, 6501217,
                  6502631, 6510888, 6511378, 6515907, 6515909, 6515924, 6525381, 6530822,
                  6533863, 6559688, 6599120, 6600868, 6637512, 6642483, 6646145, 6650526,
                  6650529, 6650534, 6661888, 6665052, 6677009, 6688318, 6709761, 6719987,
                  6722302, 6731681, 6746539, 6748553, 6749990, 6753653, 6755971, 6756788,
                  6757903, 6758016, 6760584, 6771030, 6779728, 6779732, 6779736, 6779741,
                  6779974, 6791319, 6801498, 6891255, 6892337, 6892365, 6895034, 6901276,
                  6949930, 6967359, 6978056, 6981204, 7001449, 7034321, 7054230],
    res        : [],   
    userRes    : {},   
    datasStats : [],
    tags       : [],
    categories : {},
    img        : {},
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

const thumbnails = [];

const getById         = function(id){ return document.getElementById(id); };
const round2          = val => Math.round(10000 * (val), 2) / 100;
const nanToZero       = val => !isNaN(val) && isFinite(val) ? val : 0;
const openThingWindow = (url) => window.open(url, '_blank');

let openWindowDyn = false;
let timeout;

let thingThumbnailDialogContainer = getById('thingThumbnailDialogContainer');
let thingThumbnailDialog          = getById('thingThumbnailDialog');
let thingThumbnailImageContainer  = getById('thingThumbnailImageContainer');
let thingThumbnailTitleContainer  = getById('thingThumbnailTitleContainer');
let thingThumbnailTitle           = getById('thingThumbnailTitle');
let statsTableContainer           = getById('statsTableContainer');
let statsBodyTable                = getById('statsBodyTable');
let filterDatasStats              = getById('filterDatasStats');
let generalInfosDialogContainer   = getById('generalInfosDialogContainer');
let generalInfosDialog            = getById('generalInfosDialog');

//****************** ÉVÈNEMENTS ******************//
document.addEventListener('DOMContentLoaded', async function() {
    await refreshDatas();
    await getUserInfos('Hopf', 'followers');
    getTags();
    loadThumbmails();
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
            if(typeof rowData !== 'object'){
                let td = document.createElement("td");

                if(!i){
                    td.classList.add('alignLeft');
                    td.style.cursor = 'pointer';
                    td.addEventListener('click', showThingDetail);
                }

                let tdTxt = document.createTextNode(rowData);
                td.appendChild(tdTxt);
                tr.appendChild(td);
            }
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
        if(val.indexOf('t:') !== -1 && val.length > 2){
            const tag = val.slice(2).trim().toLowerCase();
            datasFiltered = glo.datasStats.filter(data => {
                const tagsInDatas = data[data.length-1];
                if(tagsInDatas.some(tagInDatas => tagInDatas.includes(tag))){ return true; }
                else{ return false; }
            });
        }
        else{ datasFiltered = glo.datasStats.filter(data => data[0].toLowerCase().includes(val.toLowerCase())); }
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

    glo.datasFiltered = datasFiltered;
    
    datasToTable(datasFiltered.length ? datasFiltered : glo.datasStats);
    filterThumbails();
}

function filterThumbails(){
    if(!getById('imagesContainer').style.display){
        [...document.getElementsByClassName('thumbail')].forEach(thumbail => {
            if(glo.datasFiltered.some(dataFiltered => dataFiltered[0] === thumbail.name)){
                thumbail.style.display = '';
                thumbail.parentElement.style.display = '';
            }
            else{
                thumbail.style.display = 'none';
                thumbail.parentElement.style.display = 'none';
            }
        });
    }
    resizeImages();
}

function getTags(){
    glo.res.forEach(res => {
        res.tags.forEach(tag => {
            if(!glo.tags.find(t => t === tag.tag)){ glo.tags.push(tag.tag); } 
        });
    });
    glo.tags.sort((a,b) => {if (a[0] < b[0]) {
        return -1;
    }
    if (a[0] > b[0]) {
        return 1;
    }
    return 0;});
}

function infos(){
    let nbMeshes = 0, nbCollects = 0, nbComments = 0, nbRemixs = 0, nbMakes = 0, nbViews = 0, nbDowns = 0, nbLikes = 0;
    const nbThings = glo.res.length;

    glo.res.forEach(res => {
        nbMeshes   += res.zip_data.files.length;
        nbCollects += res.collect_count;
        nbComments += res.comment_count;
        nbRemixs   += res.remix_count;
        nbMakes    += res.make_count;
        nbViews    += res.view_count;
        nbDowns    += res.download_count;
        nbLikes    += res.like_count;
    });

    const viewMean = Math.round(100* nbViews / nbThings, 2) / 100;
    const downMean = Math.round(100* nbDowns / nbThings, 2) / 100;
    const likeMean = Math.round(100* nbLikes / nbThings, 2) / 100;

    const downsOnViews = Math.round(10000 * nbDowns / nbViews, 2) / 100;
    const likesOnViews = Math.round(10000 * nbLikes / nbViews, 2) / 100;
    const likesOnDowns = Math.round(10000 * nbLikes / nbDowns, 2) / 100;


    return {nbMeshes, nbCollects, nbComments, nbRemixs, nbMakes, viewMean, downMean, likeMean, downsOnViews, likesOnViews, likesOnDowns};
}

async function loadThumbmails(){
    for (const thing of glo.res) {
        await getImg(thing.thumbnail, thing.name, thumbnails);
    }
    getById('toggleTabImages').style.display = '';
}

function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function resizeImages(height = false){
    let imgs             = [...document.getElementsByTagName('img')];
    const standardHeight = !height ? glo.imgsHeight : height;

    imgs.forEach((img, i) => { img.height = standardHeight; });
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
    showNumberTimeByTime(glo.userRes.followers.length + 1, 'generalInfo-followers');
    showNumberTimeByTime(genInfos.viewMean, 'generalInfo-views');
    showNumberTimeByTime(genInfos.downMean, 'generalInfo-downs');
    showNumberTimeByTime(genInfos.likeMean, 'generalInfo-likes');
    showNumberTimeByTime(genInfos.downsOnViews, 'generalInfo-downsOnViews');
    showNumberTimeByTime(genInfos.likesOnViews, 'generalInfo-likesOnViews');
    showNumberTimeByTime(genInfos.likesOnDowns, 'generalInfo-likesOnDowns');


    generalInfosDialog.showModal();
}

function showNumberTimeByTime(number, htmlElemId) {
    for (let i = 0; i <= number; i++) {
        setTimeout(function() {
            if(i !== parseInt(number) || parseInt(number) === number){ getById(htmlElemId).innerText = i; }
            else{
                getById(htmlElemId).innerText = number;
            }
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

function toCamelCase(str) {
    return str.replace(/-./g, match => match.charAt(1).toUpperCase());
}
function toKebabCase(str) {
    return str
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase();
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
                },
                onClick: function(evt, elementsAtEvent, chart) {
                    if (elementsAtEvent.length) {
                        const firstElement = elementsAtEvent[0];
                        const index = firstElement.index;
                        const label = this.data.labels[index];

                        showThingDetail(false, label);
                    }
                }
            }            
        });
        glo.statsGraph.canvas.addEventListener('mouseenter', function() {
            glo.statsGraph.canvas.style.cursor = 'pointer';
        });
        glo.statsGraph.canvas.addEventListener('mouseleave', function() {
            glo.statsGraph.canvas.style.cursor = 'default';
        });
    }
}

//****************** ASYNC FUNCTION ******************//
async function getAllImgs(show = true){
    let imagesContainer = getById('imagesContainer');
    if(imagesContainer.style.display === 'none' || !show){
        if(show){
            imagesContainer.style.display      = '';
            statsTableContainer.style.display  = 'none';
        }

        if(!glo.notFirstShowThumbmails){
            glo.notFirstShowThumbmails = true;
            let n = 0;
            for (const thing of glo.res) {
                //await getImg(thing.thumbnail, thing.name, thumbnails);
                let imageToShow = thumbnails.find(thumbnail => thumbnail.dataset.name === thing.name);
                let divToAppend = document.createElement('div');

                divToAppend.style.cursor = 'pointer';
                imageToShow.style.width  = '100%';
                imageToShow.title        = thing.name + ' : ' + thing.view_count + ' 👁  -  ' + thing.download_count + ' ↓  -  ' + thing.like_count + ' ❤️';
                imageToShow.name         = thing.name;
                imageToShow.className    = 'thumbail';

                if(!n){ imageToShow.id = 'firstThumbail'; }

                const showThingDetailDyn = () => showThingDetail(false, thing.name);
                divToAppend.addEventListener("click", showThingDetailDyn);

                divToAppend.appendChild(imageToShow);
                imagesContainer.appendChild(divToAppend);

                n++;
            }
        }
    }
    else{
        imagesContainer.style.display      = 'none';
        statsTableContainer.style.display  = '';
    }
    glo.imgsHeight = getById('firstThumbail').height;

    filterThumbails();
}

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
        
        const tags = r.tags.map(tag => tag.tag);

        glo.datasStats.push([name, views, downs, likes, DonV, LonV, LonD, VDL, time, VDLT, tags]);
    });
    glo.datasFiltered = glo.datasStats;
}

async function getImg(url, name = '', dest = glo) {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let imgBlob = await response.blob();

        let imgUrlObject = URL.createObjectURL(imgBlob);
        if (!Array.isArray(dest)) {
            dest.img = document.createElement("img");
            dest.img.src = imgUrlObject;
            dest.img.dataset.name = name;
            dest.img.onload = () => {
                URL.revokeObjectURL(imgUrlObject);
            };
        } else {
            let image = document.createElement("img");
            image.src = imgUrlObject;
            image.dataset.name = name;
            image.onload = () => {
                URL.revokeObjectURL(imgUrlObject);
            };
            dest.push(image);
        }
    } catch (error) {
        console.error('Fetching image failed:', error);
    }
    return dest;
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

async function getThingCateories(id) {
    try {
        const response = await fetch(glo.catsUrl.replace('id', id));
        const result   = await response.json();
        glo.categories[id] = result;
    } catch (error) {
        console.log('error', error);
    }
}

async function getUserInfos(username, ...requestsKinds){
    const promises = requestsKinds.map(requestKind => getUserStat(requestKind, username));
    await Promise.all(promises);
}

async function getUserStat(requestKind = 'things', username = glo.username) {
    requestKind = toCamelCase(requestKind);

    try {
        const response           = await fetch(glo.userUrl.replace('username', username).replace('requestKind', requestKind), { cache: 'no-cache' });
        glo.userRes[requestKind] = await response.json();
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

async function showAllImages(){
    await getAllImgs();
    resizeImages(); 
}

async function showThingDetail(event, thingName = false){
    let tdClicked = event.target;

    let name = !thingName ? tdClicked.innerText : thingName;
    const thing = glo.res.find(r => r.name === name);

    const thumbnailURL = thing.thumbnail;

    await getImg(thumbnailURL, thing.name);
    if(!glo.categories[thing.id]){ await getThingCateories(thing.id); }

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
    getById('thingInfo-categorie').innerText   = glo.categories[thing.id][0].name;

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

        await getImg(zipData.images[numChevron].url, thing.name);
        
        if(thingThumbnailImageContainer.firstChild){ thingThumbnailImageContainer.firstChild.remove(); }
        glo.img.style.height = '500px';
        thingThumbnailImageContainer.appendChild(glo.img);
    }
}