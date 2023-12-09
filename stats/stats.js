const glo = {
    url        : 'https://api.thingiverse.com/things/id?access_token=9f71490b6e8be82562c62c6387298f36',
    ids        : [6351873, 6350389, 6349629, 6348005, 6347845, 6347726, 6347433, 6343923,
                  6343874, 6343835, 6343502, 6343477, 6343458, 6343453, 6343440, 6343361,
                  6343353, 6339762, 6339767, 6352714, 6354542, 6354594, 6356656, 6356673, 6359424],
    res        : [],   
    datasStats : [],   
};

const round2 = val => Math.round(10000 * (val), 2) / 100;

let statsBodyTable = document.getElementById('statsBodyTable');

const nanToZero = val => !isNaN(val) && isFinite(val) ? val : 0;

document.addEventListener('DOMContentLoaded', async function() {
    await getDatas();
    sortDatasStats();
    datasToTable();
});

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

function datasToTable(){
    removeAllChildren(statsBodyTable);

    glo.datasStats.forEach((rowDatas, n) => {
        let tr = document.createElement("tr");
        rowDatas.forEach((rowData, i) => {
            let td = document.createElement("td");

            if(!i){ td.classList.add('alignLeft'); }

            let tdTxt = document.createTextNode(rowData);
            td.appendChild(tdTxt);
            tr.appendChild(td);
        });
        tr.classList.add(n%2==0 ? 'oddTr': 'evenTr');
        statsBodyTable.appendChild(tr);
    });

    //**************** TOTAUX ****************//
    const totaux = totauxStats();
    let tr       = document.createElement("tr");
    let td       = document.createElement("td");
    let tdTxt    = document.createTextNode('Total');

    let statsFootTable = document.getElementById('statsFootTable');

    statsFootTable.firstChild.remove();

    td.appendChild(tdTxt);
    td.style.fontWeight = 900;
    tr.appendChild(td);
    totaux.forEach(totalCol => {
        let td    = document.createElement("td");
        let tdTxt = document.createTextNode(totalCol);

        td.style.fontWeight = 900;

        td.appendChild(tdTxt);
        tr.appendChild(td);
    });
    tr.id = "totauxStatsTable";
    statsFootTable.appendChild(tr);
}

function totauxStats(){
    const datasLength = glo.datasStats.length;

    let totV = 0, totD = 0, totL = 0, totDV = 0, totLV = 0, totLD = 0, totVDL = 0, totTime = 0, totVDLT = 0;
    glo.datasStats.forEach(rowDatas => {
        totV    += rowDatas[1];
        totD    += rowDatas[2];
        totL    += rowDatas[3];
        totDV   += rowDatas[4];
        totLV   += rowDatas[5];
        totLD   += rowDatas[6];
        totVDL  += rowDatas[7];
        totTime += rowDatas[8];
        totVDLT += rowDatas[9];
    });

    return [totV, totD, totL, Math.round(100 * totDV/datasLength, 2) / 100, Math.round(100 * totLV/datasLength, 2)/100,
            Math.round(100 * totLD/datasLength, 2)/100, Math.round(100 * totVDL/datasLength, 2)/100,
            Math.round(100 * totTime/datasLength, 2)/100, , Math.round(100 * totVDLT/datasLength, 2)/100];
}

function sortDatasStats(numOrder = 1, desc = 'true'){
    desc = desc === 'true' ? true : false;
    numOrder = parseInt(numOrder);
    if(numOrder){ desc ? glo.datasStats.sort((a,b) => b[numOrder] - a[numOrder]) : glo.datasStats.sort((a,b) => a[numOrder] - b[numOrder]); }
    else{ desc ?
        glo.datasStats.sort((a,b) => {if (a[0] < b[0]) {
            return -1;
        }
        if (a[0] > b[0]) {
            return 1;
        }
        return 0;}) :
        glo.datasStats.sort((a,b) => {if (a[0] > b[0]) {
            return -1;
        }
        if (a[0] < b[0]) {
            return 1;
        }
        return 0;});
    }
}

function sortDatasStatsOnClick(e){
    const desc = e.target.dataset.desc === 'true' ? true : false;

    [...document.getElementById('trTheadStatsTable').children].forEach(th => {
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

    datasToTable();
}

async function getStats() {
    const promises = glo.ids.map(id => getStat(id));
    await Promise.all(promises);
}

async function getStat(id) {
    try {
        const response = await fetch(glo.url.replace('id', id), { cache: 'no-cache' });
        const result = await response.json();
        glo.res.push(result);
    } catch (error) {
        console.log('error', error);
    }
}

function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

async function refreshDatas(){
    glo.res        = [];
    glo.datasStats = [];
    await getDatas();
    sortDatasStats(...glo.sortNumber);
    datasToTable();
}