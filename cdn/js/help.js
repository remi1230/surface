class Help{
    constructor(url = './js/event.js', objParentProperties = {}, containerId = 'dialogContainer', feed = true){
        this.url                 = url;
        this.containerId         = containerId;
        this.objParentProperties = objParentProperties;

        this.objParentPropertiesBeforeUpdate = objParentProperties;

        this.tuchs 			   = [];
        this.HTags 			   = [];
        this.helpDialogVisible = false;

        if(feed){ this.feedHelp(); }
    }

    getById       = (id) => document.getElementById(id);
    removeAccents = str  => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    async feedHelp(){
        fetch(this.url).then(res => res.text()).then(text => {
            const regex = /\/\/\/(.*?)\/\/\//g;
            this.tuchs = text.match(regex);
            this.tuchs = this.tuchs.map( tuch => {
                let infos = tuch.substring(4, tuch.length - 4).split(' -- ');
        
                let tags     = infos[2] ? infos[2].replace(/\s/g, '').toLowerCase().split(',') : '';
                let property = infos[3] ? infos[3].replace(/\s/g, '') : '';
        
                if(tags){ tags.forEach(tag => { this.HTags.push(tag); }); }
        
                return {ctrl: infos[0].toLowerCase().includes("ctrl"), alt: infos[0].toLowerCase().includes("alt"), tuch: infos[0], action: infos[1], tags: tags, property: property};
            });
        
            if(this.HTags.length){ this.HTags = [...new Set(this.HTags)]; this.HTags.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); }
        
            this.constructHelpDialog(true);
        });
    }
    
    toggleHelpDialog(){
        this.helpDialogVisible = !this.helpDialogVisible;
    
        if(this.helpDialogVisible){ this.helpDialog.showModal(); }
        else{ this.helpDialog.close(); }
    }
    
    constructHelpDialog(start = false){
        if(start){
            const htmlToInsert = 
            `<dialog id="helpDialog" style="width: 85%; height: 85%; position: absolute; top: -10px; border: none; border-radius: 5px; overflow-x: hidden; "
            oninput="event.stopPropagation(); " onchange="event.stopPropagation(); " onclick="event.stopPropagation(); ">
                <div style="text-align: center; margin-top: 10px; display: grid; grid-template-columns: 210px 210px 210px; justify-content: space-between; "
                    oninput="event.stopPropagation(); " onchange="event.stopPropagation(); " onclick="event.stopPropagation(); ">
                    <div>
                        <label for="searchInHelp">🔍</label>
                        <input style="margin-top: 10px; " type="text" id="searchInHelp" class="stopWindowEvents" name="searchInHelp" value=""
                                onchange="event.stopPropagation(); " onclick="event.stopPropagation(); ">
                    </div>
                    <div>
                        <kbd id="helpTuch_On" class="keys"
                            style="text-align: center; cursor: pointer;">ON</kbd>
                    </div>
                    <div>
                        <label for="helpDialogOpacity">Opacité</label>
                        <input type="range" id="helpDialogOpacity" name="helpDialogOpacity" class='input_help'
                                onchange="event.stopPropagation(); " onclick="event.stopPropagation(); "
                                min="0.01" max="1" value="1" step=".01">
                    </div>
                </div>
                <div id="HelpTags" style="min-height: 35px; margin-bottom: 7px; " onclick="event.stopPropagation(); "></div>
                <div id="helpDialogGrid" style="display: grid; grid-template-columns: repeat(3, 33%); column-gap: 10px; row-gap: 10px; " onclick="event.stopPropagation(); "></div>
            </dialog>`;

            this.getById(this.containerId).innerHTML += htmlToInsert;
            this.helpDialog     = this.getById('helpDialog');
            this.helpDialogGrid = this.getById('helpDialogGrid');
            this.getById('searchInHelp').blur();
        }
        let tuchs_save = this.tuchs.slice();
        if(!start){
            this.helpDialogGrid.innerHTML = "";
            this.filterHelpArray();
        }
        else{
            this.getById('searchInHelp').value = "";
        }
    
        this.tuchs.forEach((tuch, i) => {
            let divContainer = document.createElement("div");
            let kbdTuch      = document.createElement("kbd");
            let divAction    = document.createElement("div");
        
            let tuchId = 'helpTuch_' + i;
        
            tuch.id             = tuchId;
            kbdTuch.id          = tuchId;
            kbdTuch.className   = 'keys';
            divAction.className = 'helpTxt';
        
            let txtTuch   = document.createTextNode(tuch.tuch);
            let txtAction = document.createTextNode(tuch.action);
        
            kbdTuch.appendChild(txtTuch);
            divAction.appendChild(txtAction);
        
            let tuchToTrigger = tuch.ctrl || tuch.alt ? tuch.tuch.substr(-1) : tuch.tuch;
        
            tuchToTrigger = tuchToTrigger.replace('←', 'ArrowLeft');
            tuchToTrigger = tuchToTrigger.replace('→', 'ArrowRight');
            tuchToTrigger = tuchToTrigger.replace('↑', 'ArrowUp');
            tuchToTrigger = tuchToTrigger.replace('↓', 'ArrowDown');
        
            kbdTuch.title = tuch.property;

            kbdTuch.addEventListener('click', () => {
                window.dispatchEvent(new KeyboardEvent('keydown', {
                    'key'     : tuchToTrigger,
                    'ctrlKey' : tuch.ctrl,
                    'altKey'  : tuch.alt
                }));
            
                this.checkHelpProp(kbdTuch.id, tuch.property);
            });
        
            if(this.objParentProperties[tuch.property]){ this.addClasses(kbdTuch, 'on'); }
            
            kbdTuch.style.textAlign      = 'center';
            divAction.style.paddingRight = '30px';
        
            divContainer.style.display             = 'grid';
            divContainer.style.gridTemplateColumns = '50px 100%';
            divContainer.style.columnGap           = '5px';
            divContainer.dataset.tags              = '';
        
            divContainer.appendChild(kbdTuch);
            divContainer.appendChild(divAction);
        
            if(Array.isArray(tuch.tags)){ divContainer.dataset.tags = tuch.tags.join(','); }
        
            this.helpDialogGrid.appendChild(divContainer);
        });
    
        if(start){ 
            this.HTags.forEach(HTag => {
                let spanTag = document.createElement("span");
                let txtTag  = document.createTextNode(HTag);
        
                spanTag.className  = 'helpTag';
                spanTag.dataset.on = 'false';
                spanTag.appendChild(txtTag);
                
                spanTag.addEventListener('click', () => {
                    spanTag.dataset.on = spanTag.dataset.on === 'false' ? 'true' : 'false';
                    spanTag.classList.toggle('helpTagOn');
                    this.constructHelpDialog();
                });

                this.getById('HelpTags').appendChild(spanTag);
            });
        }
    
        [...document.getElementsByClassName('keys')].forEach(key => {
            key.addEventListener(
                "mouseenter",
                (event) => {
                event.target.style.color  = "purple";
                event.target.style.cursor = "pointer";
                },
                false
            );
            key.addEventListener(
                "mouseleave",
                (event) => {
                event.target.style.color  = "";
                },
                false
            );
        });

        if(start){
            this.getById('searchInHelp').addEventListener('input', (e) => { e.stopPropagation(); this.constructHelpDialog(false); });
            this.getById('helpTuch_On').addEventListener('click', () => { this.toggleHelpOnTuch(this.getById('helpTuch_On')); });
            this.getById('helpDialogOpacity').addEventListener('input', (e) => { this.helpDialogOpacityChange(e); });
            this.helpDialog.addEventListener('click', () => {
                this.helpDialogVisible = !this.helpDialogVisible;
                this.getById('searchInHelp').blur();
                this.helpDialog.close();
            });
            this.helpDialogGrid.addEventListener('click', (event) => event.stopPropagation());
        }

        this.getById('helpDialogOpacity').value = 1;
        this.helpDialog.style.opacity           = 1;
    
        this.tuchs = tuchs_save.slice();
    }
    
    filterHelpArray(){
        let searchTxt = this.getById('searchInHelp').value;
    
        if(searchTxt){
        this.tuchs = this.tuchs.filter(tuch => this.removeAccents(tuch.action.toLowerCase()).includes(this.removeAccents(searchTxt.toLowerCase()))); 
        }
    
        let onTags   = [];
        let spanTags = [...document.getElementsByClassName('helpTag')];
        spanTags.forEach(spanTag => {
        if(spanTag.dataset.on === 'true'){ onTags.push(spanTag.textContent); }
        });
        
        if(onTags.length){
        this.tuchs = this.tuchs.filter( tuch => {
            let on = true;
            onTags.forEach(onTag => {
                if(!tuch.tags.map(tag => this.removeAccents(tag)).includes(this.removeAccents(onTag.toLowerCase())) ){ on = false; }
            });
            return on;
            });
        }
        if([...this.getById('helpTuch_On').classList].includes('helpOn')){
            this.tuchs = this.tuchs.filter( tuch => tuch.property && this.objParentProperties[tuch.property]);
        }
    }
    
    toggleHelpOnTuch(domHelpTuch){
        [...domHelpTuch.classList].includes('helpOn') ? this.removeClasses(domHelpTuch, 'helpOn') : this.addClasses(domHelpTuch, 'helpOn');
        this.constructHelpDialog();
    }
    
    checkHelpProp(tuchId, property){
        if(property){
            this.objParentProperties[property] ? this.addClasses(this.getById(tuchId), 'on') : this.removeClasses(this.getById(tuchId), 'on');
        } 
    }

    helpDialogOpacityChange(event){
        event.stopPropagation();
        event.preventDefault();
        this.helpDialog.style.opacity = event.target.value; 
    }
    
    addClasses(domElem, ...args){
        if(domElem){
        args.forEach(arg => {
            domElem.classList.add(arg);
        });
        }
    }
    removeClasses(domElem, ...args){
        if(domElem){
        args.forEach(arg => {
            domElem.classList.remove(arg);
        });
        }
    }

    tuchOnAfterPropUpdate(objPropBeforeUpd = this.objParentPropertiesBeforeUpdate){
        let objPropAfterUpd = this.objParentProperties;

        for(let prop in objPropAfterUpd){
            if(typeof objPropAfterUpd[prop] === 'boolean' && objPropAfterUpd[prop] !== objPropBeforeUpd[prop]){
                let tuch = this.tuchs.find(tuch => tuch.property === prop);
                if(tuch){
                    objPropAfterUpd[prop] ? this.addClasses(this.getById(tuch.id), 'on') : this.removeClasses(this.getById(tuch.id), 'on');
                }
            }
        }
        objPropBeforeUpd = null;
    }

    saveObjParent(){ this.objParentPropertiesBeforeUpdate = {...this.objParentProperties}; }
}