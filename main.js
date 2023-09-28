const { Plugin, Notice, TFile, PluginSettingTab, Setting,DropdownComponent, ItemView, WorkspaceLeaf , setIcon , setTooltip, Modal, FuzzySuggestModal, Scope, loadPdfJs} = require('obsidian');
const fs = require("fs/promises");
const path = require("path");
// Get the vault absolute path
const vaultBasePath = app.vault.getRoot().vault.adapter.getBasePath();
const pluginBasePath = path.join(vaultBasePath,".obsidian","plugins","obsidian-ai-characters")
const pathToLlama  = path.join(pluginBasePath,"node_modules","llamaindex","dist","index.js")

const {Document,VectorStoreIndex, OpenAI, SimpleChatEngine, serviceContextFromDefaults, serviceContextFromServiceContext, ContextChatEngine, OpenAIEmbedding} = require(pathToLlama)
//const {Document,VectorStoreIndex, OpenAI, SimpleChatEngine, serviceContextFromDefaults, ContextChatEngine} = require("llamaindex")


const CHARACTER_IMAGE_ID = "character-image"
const CHARACTER_PIC_ID = "character-pic"
const CHAT_PANEL_ID = "chat-panel"
const CHAT_MESSAGES_ID = "chat-messages"
const CHARA_NAME_ID = "chara-name"
const THINK_STATE_CLASS = "is-thinking"
const ROBOT_MESSAGE_CLASS = "robot-message"
const USER_MESSAGE_CLASS = "user-message"
const ROBOT_TYPING_ID = "robot-typing"



const BUTTONS_BAR_ID = "buttons-bar-id"
const SAVE_CHAT_ID = "save-chat-id"
const CREATE_MEMORY_BUTTON_ID = "create-memory-button-id"
const LOAD_CHAT_BUTTON_ID = "load-ai-chat-button"


const SAVED_CHATS_FOLDER_NAME = "Saved chats"
const SAVED_PROMPTS_FOLDER_NAME = "Saved prompt"

const WMO_CODE = { 
"0": "Clear sky",
"1" : "Mainly clear",
"2" : "Partly cloudy",
"3" : "Overcast",
"45" : "Fog",
"48" : "Depositing rime fog",
"51" : "Light drizzle",
"53" : "Moderate drizzle",
"55" : "Dense intensity drizzle",
"56" : "Light freezing drizzle",
"57" : "Dense freezing drizzle",
"61" : "Slight rain",
"63" : "Moderate rain ",
"65" : "Heavy rain",
"66" : "Light freezing rain",
"67" : "Heavy freezing rain",
"71" : "Slight snow fall",
"72" : "Moderate snow fall",
"73" : "And heavy snow fall",
"77" : "Snow grains",
"80" : "Slight rain showers: ",
"81" : "Moderate rain showers",
"82" : "And violent rain showers",
"85" : "Slight snow showers  ",
"86" : "Heavy snow showers",
"95" : "Thunderstorm: Slight or moderate",
"96" : "Thunderstorm with slight hail",
"99" : "Heavy hail"
}


async function getCities(searchQuery){
    if (searchQuery.length<3){
        return
    }
    weatherUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${searchQuery}&count=10&language=en&format=json`

    const resp = await fetch(weatherUrl)
    const respJSON = await resp.json() 
    if (!respJSON.results){
        console.log("No results found")
        return
    }
    return respJSON.results.map(f=>{
        return {
            "fullName":`${f.name}, ${f.admin1}, ${f.admin2}, ${f.country}`,
            "latitude": f.latitude,
            "longitude": f.longitude
        }
    })
}

async function getWeatherData(lat,long){
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`
    const resp = await fetch(weatherUrl)
    const respJSON = await resp.json() 
    return respJSON
}



const ALL_AVAILABLE_OPENAI_MODELS = [
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-16k",
    "gpt-4"
    ]
//"gpt-4-32k"


class ObsidianPlugin extends Plugin {
    settings = {
        promptFolder: '',
        apiKey: '',
        loadedcharacters: []
    };

    async onload() {
        await this.loadSettings();
        this.registerView("chat-panel", (leaf) => new ChatPanel(leaf,this));
        //this.loadStylesheet('styles.css');
        this.addRibbonIcon('messages-square', 'Open AI Chat Panel', () => {
            this.openChatPanel();
            //adjustHeight()
        });
        
        if(this.app.workspace.getLeavesOfType("chat-panel").length > 0){
            await app.workspace.revealLeaf(app.workspace.getLeavesOfType('chat-panel')[0])
            //app.workspace.onLayoutReady(adjustHeight);
        }

        this.addSettingTab(new ObsidianSettingTab(this.app, this));

        //app.workspace.onLayoutReady();
        // TODO: Ajouter d'autres fonctionnalités comme le Side Panel, l'interaction avec les prompts, etc.
    }

    async openChatPanel() {
        if (app.workspace.getLeavesOfType('chat-panel').length === 0){
            await this.app.workspace.getRightLeaf(false).setViewState({
                type: "chat-panel",
            });
        }
        await app.workspace.revealLeaf(app.workspace.getLeavesOfType('chat-panel')[0])
        //app.workspace.onLayoutReady(adjustHeight());
    }

    async loadSettings() {
        this.settings = Object.assign({}, this.settings, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    getPrompts() {
        // Charger tous les fichiers du dossier
        // Lire chaque fichier et le traiter comme un prompt
        // Retourner une liste de prompts
    }

    async loadCharacters(){
        let charaFiles =  app.vault.getFiles().filter(f=>{return f.path.includes(this.settings.promptFolder) && f.extension === "md"})

        if (this.settings.loadedcharacters.length !== charaFiles.length){
            // check which of the characters are not loaded and if not loaded try to load them
            const loadedCharactersName = this.settings.loadedcharacters.map(f=>{return f.name})
            const toLoad = charaFiles.filter(f=>{

                return !loadedCharactersName.includes(f.basename)
            })

            let loadedChara = this.settings.loadedcharacters
            const createCharacterPromises = toLoad.map(async (chara)=>{
                const newChar = new AICharacter(chara,this)
                await newChar.init()
                if (newChar.basesystemPrompt && newChar.imgSrc){
                    loadedChara.push(newChar)
                    return newChar

                }else{
                    return null
                }
            })


            const initialisedcharacters = await Promise.all(createCharacterPromises)

            this.settings.loadedcharacters.concat(initialisedcharacters.filter((char) => char !== null))

            /*toLoad.forEach(aiCharacter => {
                
                let newChar
                
                new Notice(`Invalid template Format for ${aiCharacter.basename}`)
                
                if (newChar){
                    this.plugin.settings.loadedcharacters.push(newChar)
                }
            })*/



            this.saveSettings()

        }
    }

    async parseChatHistory(chatHistoryfile){
        const fileContent = await app.vault.read(chatHistoryfile)

        let stringBeingRead = fileContent

        //Find all the occurences of formatted messages 
        const allMessageHeaders = [...fileContent.matchAll(/\*\*(.*)\*\*:/g)].filter(f=> {
            return this.settings.loadedcharacters.map(g=>g.name).includes(f[1]) || f[1] === this.settings.userName
        })


        let chatHistory = []

        
        for (let i = 0; i < allMessageHeaders.length;i++){

            let newMessage = ""
            if (allMessageHeaders[i+1]){
                newMessage = fileContent.slice(allMessageHeaders[i].index + allMessageHeaders[i][0].length,allMessageHeaders[i+1].index)
            } else {
                newMessage = fileContent.slice(allMessageHeaders[i].index + allMessageHeaders[i][0].length)
            }

            if (allMessageHeaders[i][1] === this.settings.userName){
                chatHistory.push({
                    "role":"user",
                    "content": newMessage.trim()
                })
            }else {
                chatHistory.push({
                    "role":"assistant",
                    "content": newMessage.trim()
                })
            }


        }

        return {"messages": chatHistory, "file":chatHistoryfile}


    }
  // TODO: Ajouter d'autres méthodes pour gérer les interactions, le Side Panel, etc.
}

function adjustHeight() {
      const container = document.querySelector(`#${CHARACTER_IMAGE_ID}`);
      if (container){
        const height = container.offsetHeight;
        container.style.width = `${height}px`;
      }
}


class RobotMessage {
    constructor(){
        this.htmlEl = document.getElementById(CHAT_MESSAGES_ID)
        this.robotMessage = document.createElement('div')
        this.robotMessage.className =  ROBOT_MESSAGE_CLASS
        
        this.isTypingEl = document.createElement('div')
        this.isTypingEl.className =  ROBOT_TYPING_ID
        
        const div1 = document.createElement('div');
        div1.id = "divdot1";

        const div2 = document.createElement('div');
        div2.id = "divdot2";

        const div3 = document.createElement('div');
        div3.id = "divdot3";

        this.isTypingEl.appendChild(div1)
        this.isTypingEl.appendChild(div2)
        this.isTypingEl.appendChild(div3)

        this.robotMessage.appendChild(this.isTypingEl)

        this.htmlEl.appendChild(this.robotMessage)
        this.htmlEl.scrollTop = this.htmlEl.scrollHeight;

        //add a div with the class robot


    }
    
    addRobotMessage(message){
        this.isTypingEl = null;
        document.getElementsByClassName(ROBOT_TYPING_ID)[0].innerHTML = ''
        this.robotMessage.innerText = message
        this.htmlEl.scrollTop = this.htmlEl.scrollHeight;
    }

}


async function sendUserMessage(){
    const textarea = document.getElementById("user-input")
    const message = textarea.value
    if (message === ""){
        new Notice("Please write a message before sending!")
        return
    } 
    addUserMessage(message)
    

    //reset elements
    buttonHeight = document.getElementById("send-button").offsetHeight
    textarea.style.height = buttonHeight + "px"
    textarea.value = ""

    const curChar = app.plugins.plugins['ai-characters'].settings.defaultCharacter

    curChar.isTyping = true;

    const newRobotMessage = new RobotMessage()

    newRobotMessage.addRobotMessage(await curChar.processMessage(message))

    //addRobotMessage(await curChar.processMessage(message))

}


function addUserMessage(message){

    const chatMessages = document.getElementById(CHAT_MESSAGES_ID);
    const userMessage = document.createElement('div');
    userMessage.className = USER_MESSAGE_CLASS;
    userMessage.innerText = message;
    chatMessages.appendChild(userMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function scrollToEnd() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}



// Fonction pour ajouter un message robot (dummy)
function addRobotMessage(message){
    const chatMessages = document.getElementById('chat-messages');
    const robotMessage = document.createElement('div');
    robotMessage.className = 'robot-message';
    robotMessage.innerText = message
    chatMessages.appendChild(robotMessage);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

class ObsidianSettingTab extends PluginSettingTab {

  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.defaultCharacter;
    this.loadedcharacters;
  }

  display(){
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'AI Characters in Obsidian' });

    const allFolders = this.app.vault.getAllLoadedFiles().filter(f=>{return f.children}).filter(f=>{return f.children.length > 0 }).map(f=>{return f.path})

    new Setting(containerEl)
      .setName('Characters Prompt Folder')
      .setDesc('Please choose the folder in which you want to save your system prompts')
      .addDropdown(dd => {
        dd.addOptions(allFolders)
        dd.setValue(this.plugin.settings.promptFolderIndex)
        dd.onChange(async (value) => {
            this.plugin.settings.promptFolderIndex = value;
            this.plugin.settings.promptFolder = allFolders[parseInt(value)]
            await this.plugin.saveSettings();
        });
    })



    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Please copy-paste your OpenAI API key here')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }));
      

    /*new Setting(containerEl)
        .setName('DefaultModel')
        .setDesc("Please select the OpenAI model you want to use by default")
        .addDropdown(dd=>{
            dd.addOptions(ALL_AVAILABLE_OPENAI_MODELS)
            dd.setValue(this.plugin.settings.chat_model)
            dd.onChange(async (value,display) => {
                this.plugin.settings.chat_model = value;
                await this.plugin.saveSettings();
            });
        })*/

    new Setting(containerEl)
        .setName('DefaultModel')
        .setDesc("Please select the OpenAI model you want to use by default")
        .addDropdown(dd=>{
            dd.addOptions(ALL_AVAILABLE_OPENAI_MODELS)
            dd.setValue(this.plugin.settings.chat_model_index)
            dd.onChange(async (value) => {
                this.plugin.settings.chat_model_index = value;
                this.plugin.settings.chat_model = ALL_AVAILABLE_OPENAI_MODELS[parseInt(value)];

                await this.plugin.saveSettings();
            });
        })

    new Setting(containerEl)
      .setName('Your name')
      .setDesc('Please input the name you want to be called by')
      .addText(text => text
        .setPlaceholder('ex: Pierre')
        .setValue(this.plugin.settings.userName)
        .onChange(async (value) => {
          this.plugin.settings.userName = value;
          await this.plugin.saveSettings();
        }));
    
    
    new Setting(containerEl)
        .setName('Your city')
        .setDesc('Name of the city you want the AI to get the weather forecast from')
        .addSearch(src => {
            const citySuggester = new CitySuggest(src.inputEl)
            src.setPlaceholder("ex. Paris").setValue(this.plugin.settings.userCity)
            src.onChange((new_city)=>{

                const cityInfo = citySuggester.allCities.filter(f=>{
                    return f.fullName === new_city;
                })
                if (!cityInfo){
                    return;
                }

                this.plugin.settings.userLatitude = cityInfo[0].latitude;
                this.plugin.settings.userLongitude = cityInfo[0].longitude;

                this.plugin.settings.userCity = new_city;
                this.plugin.saveSettings();
            })
            src.containerEl.addClass("city-search")
        })

    new Setting(containerEl)
      .setName('Custom Prompts Folder')
      .setDesc('Please choose the folder in which you want to save your custom prompts')
      .addDropdown(dd => {
        dd.addOptions(allFolders)
        dd.setValue(this.plugin.settings.customPromptsFolder)
        dd.onChange(async (value) => {
            //this.plugin.settings.promptFolderIndex = value;
            this.plugin.settings.customPromptsFolder = allFolders[parseInt(value)]
            await this.plugin.saveSettings();
        });
    })

    
    /*
    new Setting(containerEl)
      .setName('Select the level of access for the characters')
      .setDesc('Please select the level of access to your notes that the character can have access to')
      .addDropdown(dd => {
        dd.addOptions([
            "Full Access with Vectorisation",
            "Access on user-defined documents, without anonymisation"
            "Partial access, automatic anonymisation",
            "Partial access, custom anonymisation",
            "No access"
        ])
      })
      .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
      });
    */
  }

}

class Suggest {
  constructor(owner, containerEl, scope) {
    this.owner = owner;
    this.containerEl = containerEl;
    containerEl.on("click", ".suggestion-item", this.onSuggestionClick.bind(this));
    containerEl.on("mousemove", ".suggestion-item", this.onSuggestionMouseover.bind(this));
    scope.register([], "ArrowUp", (event) => {
      if (!event.isComposing) {
        this.setSelectedItem(this.selectedItem - 1, true);
        return false;
      }
    });
    scope.register([], "ArrowDown", (event) => {
      if (!event.isComposing) {
        this.setSelectedItem(this.selectedItem + 1, true);
        return false;
      }
    });
    scope.register([], "Enter", (event) => {
      if (!event.isComposing) {
        this.useSelectedItem(event);
        return false;
      }
    });
  }
  onSuggestionClick(event, el) {
    event.preventDefault();
    const item = this.suggestions.indexOf(el);
    this.setSelectedItem(item, false);
    this.useSelectedItem(event);
  }
  onSuggestionMouseover(_event, el) {
    const item = this.suggestions.indexOf(el);
    this.setSelectedItem(item, false);
  }
  setSuggestions(values) {
    this.containerEl.empty();
    const suggestionEls = [];
    values.forEach((value) => {
      const suggestionEl = this.containerEl.createDiv("suggestion-item");
      this.owner.renderSuggestion(value, suggestionEl);
      suggestionEls.push(suggestionEl);
    });
    this.values = values;
    this.suggestions = suggestionEls;
    this.setSelectedItem(0, false);
  }
  useSelectedItem(event) {
    const currentValue = this.values[this.selectedItem];
    if (currentValue) {
      this.owner.selectSuggestion(currentValue, event);
    }
  }
  setSelectedItem(selectedIndex, scrollIntoView) {
    const normalizedIndex = wrapAround(selectedIndex, this.suggestions.length);
    const prevSelectedSuggestion = this.suggestions[this.selectedItem];
    const selectedSuggestion = this.suggestions[normalizedIndex];
    prevSelectedSuggestion?.removeClass("is-selected");
    selectedSuggestion?.addClass("is-selected");
    this.selectedItem = normalizedIndex;
    if (scrollIntoView) {
      selectedSuggestion.scrollIntoView(false);
    }
  }
};

class TextInputSuggest {
  constructor(inputEl) {
    this.inputEl = inputEl;
    this.scope = new Scope();
    this.suggestEl = createDiv("suggestion-container");
    const suggestion = this.suggestEl.createDiv("suggestion");
    this.suggest = new Suggest(this, suggestion, this.scope);
    this.scope.register([], "Escape", this.close.bind(this));
    this.inputEl.addEventListener("input", this.onInputChanged.bind(this));
    this.inputEl.addEventListener("focus", this.onInputChanged.bind(this));
    this.inputEl.addEventListener("blur", this.close.bind(this));
    this.suggestEl.on("mousedown", ".suggestion-container", (event) => {
      event.preventDefault();
    });
  }
  async onInputChanged() {
    const inputStr = this.inputEl.value;
    const suggestions = await this.getSuggestions(inputStr);
    if (!suggestions) {
      this.close();
      return;
    }
    if (suggestions.length > 0) {
      this.suggest.setSuggestions(suggestions);
      this.open(app.dom.appContainerEl, this.inputEl);
    } else {
      this.close();
    }
  }
  open(container, inputEl) {
    app.keymap.pushScope(this.scope);
    container.appendChild(this.suggestEl);
    this.popper = createPopper(inputEl, this.suggestEl, {
      placement: "bottom-start",
      modifiers: [
        {
          name: "sameWidth",
          enabled: true,
          fn: ({ state, instance }) => {
            const targetWidth = `${state.rects.reference.width}px`;
            if (state.styles.popper.width === targetWidth) {
              return;
            }
            state.styles.popper.width = targetWidth;
            instance.update();
          },
          phase: "beforeWrite",
          requires: ["computeStyles"]
        }
      ]
    });
  }
  close() {
    app.keymap.popScope(this.scope);
    this.suggest.setSuggestions([]);
    if (this.popper)
      this.popper.destroy();
    this.suggestEl.detach();
  }
};


class CitySuggest extends TextInputSuggest {
    async getSuggestions(inputStr){
        const allCities = await getCities(inputStr);

        if (!allCities){
            return
        }
        this.allCities = allCities

        return allCities.map(f=>f.fullName)
    }

    renderSuggestion(city, el){
        el.setText(city)
    }
    selectSuggestion(city){
        this.inputEl.value = city;
        this.inputEl.trigger("input");
        this.close()
    }
}

function wrapAround(value,size){
  return (value % size + size) % size;
};


class ChatPanel extends ItemView {
  constructor(leaf,plugin){
    super(leaf);
    this.plugin = plugin
    this.isCharacterLoaded = false;
  }

  getViewType() {
    return "chat-panel";
  }

  getDisplayText() {
    return "Chat Panel";
  }

  getIcon() {
    return "messages-square"; 
  }


  async onResize(){
    //adjustHeight() 
  }

  async onLayoutReady(){
    //adjustHeight()
  }
    

  getLoadedCharacter(){
    if (this.plugin.settings.defaultCharacter){
        this.isCharacterLoaded = true;
        return this.plugin.settings.defaultCharacter;
    }else{
        new Notice("No character loaded")
        this.isCharacterLoaded = false;
    }
  };

  openFileSuggester() {
    // open file suggestion modal
    if(!this.fileSelector) this.fileSelector = new FileSelectionModal(app, this);
    this.fileSelector.open();
  }

  async openFolderSuggester() {
    // open folder suggestion modal
    if(!this.folderSelector){
      this.folderSelector = new FolderSelectionModal(app, this);
    }
    this.folderSelector.open();
  }

  async openPromptSuggester() {
    if (!this.promptSelector){
        if(!this.plugin.settings.customPromptsFolder){
            return;
        }

        const allPrompts = app.vault.getMarkdownFiles().filter(f=>{return f.path.includes(this.plugin.settings.customPromptsFolder)})

        if (!allPrompts || allPrompts.length === 0){
            return
        }

        this.promptSelector = new PromptSelectionModal(app,this);
    }
    this.promptSelector.open();
  }

    adjustScrollHeight(el,view){

        const maxHeight = el.parentElement.parentElement.offsetHeight * 0.4

        if (el.scrollHeight > maxHeight) {
            el.parentElement.style.height = maxHeight + "px";
            el.style.overflowY = "auto";// active le scroll vertical
        }
        else{
            el.parentElement.style.height = view.initHeight + 'px';
            //el.style.height = el.scrollHeight + "px";
            el.parentElement.style.height = el.scrollHeight + "px"
        }
    }

  async onOpen(){
    this.loadChat()
  }

  // insert_selection from file suggestion modal
  insert_selection(insert_text) {
    // get caret position
    let caret_pos = this.textarea.selectionStart;
    // get text before caret
    let text_before = this.textarea.value.substring(0, caret_pos);
    // get text after caret
    let text_after = this.textarea.value.substring(caret_pos, this.textarea.value.length);
    // insert text
    this.textarea.value = text_before + insert_text + text_after;
    // set caret position
    this.textarea.selectionStart = caret_pos + insert_text.length;
    this.textarea.selectionEnd = caret_pos + insert_text.length;
    // focus on textarea
    this.textarea.focus();
  }

  async loadChat() {

    //returns the AICharacter object containing all the relevant chat functions
    const loadedCharacter = this.getLoadedCharacter()

    // Creat the chat panel and attach it to the view
    let chatPanel = document.createElement('div');
    chatPanel.id = 'chat-panel';
    this.contentEl.appendChild(chatPanel); 

    let characterWrapper = document.createElement('div');
    characterWrapper.id = "chara-wrapper"

    // Character image
    let characterImage = document.createElement('div');
    characterImage.id = CHARACTER_IMAGE_ID;
    //characterImage.style.height = "50%"
    let img = document.createElement('img');
    img.id = CHARACTER_PIC_ID;

    if ( this.isCharacterLoaded ){
        img.src = loadedCharacter.imgSRC
    }

    let optionsBar = document.createElement('div');
    optionsBar.id = BUTTONS_BAR_ID

    let saveChatButton  = document.createElement('div');
    saveChatButton.id = SAVE_CHAT_ID
    setIcon(saveChatButton,"save")
    setTooltip(saveChatButton,"Save chat")

    let createMemoryButton  = document.createElement('div');
    createMemoryButton.id = CREATE_MEMORY_BUTTON_ID
    setIcon(createMemoryButton,"cloud-cog")
    setTooltip(createMemoryButton,"Create memory")


    let loadChatButton  = document.createElement('div');
    loadChatButton.id = LOAD_CHAT_BUTTON_ID
    setIcon(loadChatButton,"vertical-three-dots")
    setTooltip(loadChatButton,"Load a saved chat")


    let characterName = document.createElement('div');
    characterName.id = CHARA_NAME_ID;

    if ( this.isCharacterLoaded ){
        characterName.textContent = loadedCharacter.name
    }


    optionsBar.appendChild(saveChatButton)
    optionsBar.appendChild(createMemoryButton)


    characterWrapper.appendChild(characterImage)
    characterWrapper.appendChild(characterName)
    characterWrapper.appendChild(optionsBar)
    characterWrapper.appendChild(loadChatButton)
    characterImage.appendChild(img);
    
    chatPanel.appendChild(characterWrapper)



    // Conteneur des messages
    let chatMessages = document.createElement('div');
    chatMessages.id = CHAT_MESSAGES_ID;
    chatPanel.appendChild(chatMessages);

    // Barre d'entrée de texte
    let chatInput = document.createElement('div');
    chatInput.id = 'chat-input';
    this.textarea = document.createElement('textarea');
    this.textarea.placeholder = "Shortcuts: type [[ + file, / + folder, :: + prompt, Ctrl + Enter = send"
    this.textarea.id = 'user-input';
    let sendButton = document.createElement('button');
    sendButton.id = 'send-button';
    let sendImg = document.createElement('img')
    sendImg.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXNlbmQtaG9yaXpvbnRhbCI+PHBhdGggZD0ibTMgMyAzIDktMyA5IDE5LTlaIi8+PHBhdGggZD0iTTYgMTJoMTYiLz48L3N2Zz4="

    sendButton.appendChild(sendImg)
    //setIcon(sendButton,"send-horizontal")


    chatInput.appendChild(this.textarea);
    chatInput.appendChild(sendButton);
    chatPanel.appendChild(chatInput);

    
    // LOGIC

    //adjustHeight()

    // Character selection modal
    const thisEl = this
    characterImage.onclick = async function() {
        const selectCharacter = new CharacterChoiceModal(thisEl.plugin.app,thisEl.plugin)
        selectCharacter.open()

        await selectCharacter.awaitTillChosen
        if (selectCharacter.submitted) {

            selectCharacter.plugin.settings.defaultCharacter.loadCharacterInExistingPanel()
        }

    };
   

    saveChatButton.onclick = async function() {
        const resp = await app.plugins.plugins['ai-characters'].settings.defaultCharacter.saveOngoingChat()
        console.log(resp)
        new Notice("Chat saved.")
    }

    createMemoryButton.onclick = async function() {
        const resp = await app.plugins.plugins['ai-characters'].settings.defaultCharacter.rememberChat()
        console.log(resp)
        new Notice("Memory saved!")
    }
    
    loadChatButton.onclick = async function() {
        const selectChat = new ChatSelectionModal(app,thisEl.plugin)
        selectChat.open() 
        const selectedChat = await selectChat.awaitTillChosen

        const chatHistory = await thisEl.plugin.parseChatHistory(selectedChat)
        selectChat.plugin.settings.defaultCharacter.loadCharacterInExistingPanel(chatHistory) 
    }

    //const previousMessages = loadedCharacter.loadChat(loadedCharacter.lastOpenedChatID)

    
    // Capture le textarea
    this.textarea = document.getElementById("user-input");
    this.initHeight = document.getElementById("send-button").scrollHeight
    let previousScrollHeight = this.initHeight;

    this.textarea.parentElement.style.height = this.initHeight + 'px';


    // Écouteur d'événements pour le changement de taille
    const view = this
    
    this.textarea.addEventListener("input", function(event) {
        view.adjustScrollHeight(view.textarea,view);
    });

    function keyboardEventHandler(event){
        if(!["[", "/",":","Enter"].includes(event.key) ) return; // skip if key is not [ or /
        const caret_pos = view.textarea.selectionStart;
        
        if (event.key === "Enter" && event.ctrlKey === true) {
            event.preventDefault();
            sendUserMessage();
            return;
        }
        // if key is open square bracket
        if (event.key === "[") {
            // if previous char is [
            if(view.textarea.value[caret_pos - 2] === "["){
                // open file suggestion modal
                view.openFileSuggester();
                return;
            }
        }
        else if (event.key === "/"){
            // get caret position
            // if this is first char or previous char is space
            if (view.textarea.value.length === 1 || view.textarea.value[caret_pos - 2] === " ") {
                // open folder suggestion modal
                view.openFolderSuggester();
                return;
            }
        }
        else if (event.key === ":"){
            if (view.textarea.value[caret_pos -2] === ":"){
                view.openPromptSuggester();
                return;
            }
        }
        else{
            view.brackets_ct = 0;
        }

    }

    this.textarea.addEventListener("keyup", function(event) {
        keyboardEventHandler(event)
    });

    sendButton = document.getElementById("send-button");


    sendButton.addEventListener("click",sendUserMessage)




  }
}



async function loadPDFData(file) {
    if (!app.plugins.plugins['text-extractor']){
        console.log('The text extractor plugin is required to load pdf text into context!')
        return
    }

    const pd = app.plugins.plugins['text-extractor'].api

    const pdfText = await pd.extractText(file)

    if (pdfText === ""){
        console.log("Text in the following PDF couldn't be parsed: "+file.basename)
        return;
    } 

    return [new Document({ text: pdfText, id_: file.path })];
};


class AICharacter {
    constructor (template,plugin){
        this.template = template
        this.name = template.basename;
        //this.History = History;
        this.messageSentToday = 0;
        this.plugin = plugin
        this.savedChats = []
        //this.messages = loadmessageContext(History) -- will be saved in the settings on a per character basis
        this.ongoingChat;
        this.documentsProvidedbyUser = new Set([])
        this.chatEmbedding = new OpenAIEmbedding({
            "additionalSessionOptions":{
                "apiKey": this.plugin.settings.apiKey,
                "dangerouslyAllowBrowser": true
            }})
        this.chatModel = new OpenAI({
            "additionalSessionOptions":{
                "apiKey": this.plugin.settings.apiKey,
                "dangerouslyAllowBrowser": true
            },
            "additionalChatOptions":{
                "model":this.plugin.settings.chat_model
            }
        })
        this.functionLibrary = {
            "get_tasks": {
                "args": "null",
                "function": this.readTasksAndAddTheMostUrgentToContext
            },
            "add_current_date": {
                "args": "null",
                "function": this.addSystemPromptDate
            },
            "do_nothing": {
                "args":"null",
                "function": this.doNothing
            }
        }
        
    }
    async init(){
        this.templateText = await app.vault.read(this.template)
        this.basesystemPrompt = await this.loadSystemPrompt();
        this.documentsProvidedbyUser = await this.parseForDocuments(this.basesystemPrompt,0)
        this.imgSrc = this.getImageLink()
        this.description = this.getDescription()
    }

    doNothing(){
        return
    }

    
    /*
    Template would look like this, with a system prompt and an image:

    ```
    # AI Assistant

    You are a helpful and cheery AI assistant living inside the Obsidian software, always eager to help your user with his notes, helping him to bring his projects to life etc.
    You are always pro-active, gently pushing the user towards his goals.

    # Image
    ![[Pasted image 20230828081911.png]]

    ```
    */

    async parseForDocuments(text,depth){
        // depth represents to what extent the documents must be found 
        //depth of 0 means docs links will be searched only on the input text
        //depth of 1 means links are searched on input-text, + on the markdown files that link to it 
        //etc...

        depth = depth || 0

        // Check for links [[]]

        if (!text){
            return
        }
        const allLinks = [...text.matchAll(/\[\[(.*?)\]\]/g)]
        
        let alldocLinks
        let docPromises

        if (allLinks.length > 0){
            docPromises = allLinks.map(async (f) =>{
                let docName =  f[1]

                //Clear the alt text, keep only the base name
                docName = docName.split("|")[0]
                docName = docName.split("/").slice(-1)[0]


                //check if extension in the document name
                const checkifExt = docName.match(/\.\p{Ll}{2,3}$/u)
                if (!checkifExt){
                    const doc = await app.vault.getMarkdownFiles().filter(f=> {return f.basename === (docName)})
                    if (!doc || doc.length === 0){
                        console.log(`Couldn't find the file ${docName} in the vault`)
                        return
                    }

                    if (depth > 0){
                        const docText = await app.vault.read(doc[0])
                        const subdocDocs = await this.parseForDocuments(docText,depth-1)
                        if (alldocLinks){
                            if (subdocDocs){
                                alldocLinks = alldocLinks.concat(subdocDocs)
                            }
                        } else {
                            if (subdocDocs){
                                alldocLinks = subdocDocs
                            }
                        }
                    }

                    return doc[0]
                }
                else if (checkifExt[0] === ".md"){
                    const doc = await app.vault.getMarkdownFiles().filter(f=> {return f.path.includes(docName)})
                    if (!doc){
                        return
                    }

                    if (depth > 0){
                        const docText = await app.vault.read(doc[0])
                        const subdocDocs = await this.parseForDocuments(docText,depth-1)
                        if (alldocLinks){
                            if (subdocDocs){
                                alldocLinks = alldocLinks.concat(subdocDocs)
                            }
                        } else {
                            if (subdocDocs){
                                alldocLinks = subdocDocs
                            }
                        }
                    }
                }
                else if (checkifExt[0] === ".pdf"){
                    const doc = await app.vault.getAllLoadedFiles().filter(f=>{return f.path.includes(docName)})
                    if (!doc){
                        return
                    }
                    return doc[0]
                }
                else {
                    return
                }
            })

            const newDoc = await Promise.all(docPromises)
            if (alldocLinks){
                if (newDoc){
                    alldocLinks = alldocLinks.concat(newDoc)
                }
            } else {
                if (newDoc){
                    alldocLinks = newDoc
                }
            }
            //alldocLinks = new Set([...alldocLinks,...newDoc])

        }




        //Check for hyperlinks []()


        if (alldocLinks){
            return alldocLinks.filter(f=>f)
        }

    }

    parseForFolders(text){
        if (!text){
            return
        }

        const FileFinder = new RegExp(/(?: \/|^\/)([\s\S]*?)\/ /g)

        const allFolders = [...text.matchAll(FileFinder)]

        if (!allFolders || allFolders.length === 0){
            return
        }
        

        const allFolderNames = allFolders.map(m=>m[1])

        let allDocs = []

        allFolderNames.forEach(folderName => {
            let allVaultFolders = app.vault.getAllLoadedFiles().filter(f=>{
                const folderRegexp = new RegExp(`^${folderName}`)
                return f.path.match(folderRegexp)
            })
            allDocs = [...allDocs,...allVaultFolders]
        })

        if (allDocs.length === 0){
            return
        }

        return new Set(allDocs)


    }

    async applyThinkState(messageContainer){
        document.querySelector(`${CHARACTER_IMAGE_ID}`)
    }

    async processMessage(message){
        //Check what type of message this is, and selects the right completion approach to complete.

        let answerMessage = ""

        this.checkIfUserProvidedDocuments(message)

        answerMessage = await this.ongoingChat.chat(message)



        return answerMessage
    }


    async checkIfUserProvidedDocuments(message){
        
        //Check if provided documents links
        const regex = /\[\[([^\]]+)\]\]/g;
        let matches = message.match(regex);


        //Check if provided depth parameter
        const findDepth = /{{d[\s]*?=[\s]*?([0-9]+)[\s]*?}}/
        let depthParameter = message.match(findDepth)

        let depth = 0
        if (depthParameter){
            depth = parseInt(depthParameter[1])
        }



        let docLinks = await this.parseForDocuments(message,depth) || []
        let fileDocs = this.parseForFolders(message, depth) || []

        let docsFound = new Set([...docLinks,...fileDocs])

        if (docsFound){
            docsFound = [...docsFound]
            docsFound = docsFound.map(async doc=>{
                return new Document({text: await app.vault.read(doc)})
            })
        }
        const docsLoaded = await Promise.all(docsFound)        

        this.addDocumentsToChatIndex(docsLoaded,this.ongoingChat)
        

        return 
        
        if (matches) {
            matches = matches.map(f=> f.replace("[[","").replace("]]","") )
            const validLinks = matches.filter(link => {
                
                return this.plugin.app.vault.getAbstractFileByPath(link)
            });

            if (validLinks){
                validLinks.forEach(lnk=>{
                    this.documentsProvidedbyUser.add(lnk)
                })
            }
            return true;

        } else {
            return false;
        }


    }



    async answerWithDocument(message){
        if (this.documentsProvidedbyUser.length > 0){
            //Documents are a list of paths - parse through those and put them in memory. then, answer with the documents context.



            let allDocsBeingRead = this.documentsProvidedbyUser.map(docPath => {
                let docContent = this.plugin.app.vault.read(this.plugin.app.vault.getAbstractFileByPath(docPath))

                return "#" + docPath + "\n" + docContent

            })

            allDocsBeingRead = await Promise.all(allDocsBeingRead)


            const docForAI = allDocsBeingRead.map(docContent => {
                return new Document({text:docContent});
            })


            console.log(docForAI)

            this.ongoingChat = this.addDocumentsToChatIndex(docForAI,this.ongoingChat)


            return this.simpleAnswerUser(message)



        } else {
            return this.simpleAnswerUser("Please say in your words with your personality: 'I did not detect the documents your vault'")
        }
    }

    async addDocumentsToChatIndex(docsToAdd,chatObject){
        //Check if there is already a document context, and if not create one from scratch

        if (!chatObject || !chatObject.chatHistory){


            new Notice("Error! No chat loaded")
            return;
        }


        if (chatObject.retriever){

            const allDocsToAdd = docsToAdd.map(doc=>{

                chatObject.retriever.index.insert(doc)

            })

            const addedDocs = await Promise.all(allDocsToAdd)



        } else{
            let serviceContext = serviceContextFromDefaults({chunkSize: 512, llm: this.chatModel,embedModel:this.chatEmbedding})
            //serviceContext = serviceContextFromServiceContext(serviceContext,{llm: this.chatModel})
            const index = await VectorStoreIndex.fromDocuments(docsToAdd,{serviceContext})

            const retriever = index.asRetriever();
            retriever.similarityTopK = 5;

            //Transforms the ongoing chat into a new chatEngine with Docs
            chatObject = new ContextChatEngine({retriever: retriever,chatModel:this.chatModel,chatHistory:chatObject.chatHistory})
        }
        
        return chatObject

    }

    async readDoc(document){
        const doc = await app.vault.read(Template)
        return doc
    }

    async loadSystemPrompt(){
        try{
            let res = this.templateText.match(/(?:# System prompt\s(?:([\s\S]*?)))\s#|(?:# System prompt\s([\s\S]*))/)[1]
            return res
        }catch{
            return
        }
    }

    
    getDescription(){

        try{
            let res = this.templateText.match(/(?:# Description\s(?:([\s\S]*?)))\s#|(?:# Description\s([\s\S]*))/)[1]
            return res
        }catch{
            return
        }
        
    }

    async readTasksAndAddTheMostUrgentToContext(){
        const basePrompt = "User has created the following tasks in his obsidian vault (➕ is the creation date and 📅 is the due date):"

        const tasksPlugin = this.plugin.app.plugins.plugins['obsidian-tasks-plugin']

        if (tasksPlugin && tasksPlugin.cache.tasks){
            const allTasks = tasksPlugin.cache.tasks
            
            const onlyUrgentwithDueDateNotDone = allTasks.sort((a,b) => b._urgency - a._urgency).filter(f=>f.status.configuration.name != "Done")

            const tasklist = onlyUrgentwithDueDateNotDone.map(f=>{
                let urgent = "";
                if (f._urgency){
                    urgent = " - urgency: " + f._urgency.toFixed(1);
                };
                return `${f.originalMarkdown}${urgent}`
            })
            

            let forsystem = ""
            if (tasklist){

                tasklist.forEach(f=>{
                    forsystem += f.replace("- [ ]","")
                })

                const tasksText = basePrompt+ "\n" + forsystem
                const taskDoc = new Document({"text":tasksText})
                this.ongoingChat = await this.addDocumentsToChatIndex([taskDoc],this.ongoingChat)
            }


        }

    }


    getImageLink(){

        try{
            let res = this.templateText.match(/\[\[(.*?\.png|.*?\.jpg)\]\]/g)[0].replace("\[\[","").replace("\]\]","")
            const basePath= this.template.path
            const imagePath = path.join(basePath, "..",res)


            let vaultname = this.template.vault.getName()

            //const picUrl = `obsidian://open?vault=${vaultname}&file=${encodeURI(imagePath).replace("/","%2F")}`

            //const picUrl = `app://6cbcd443c39ac15a0ad932226bd5639b93bf/${path.join(vaultBasePath,imagePath).replace("\\","/")}?1693471063233`

            const picUrl = this.template.vault.adapter.getResourcePath(imagePath)

            return picUrl
        }catch{
            return
        }
        
    }

    async buildSystemPrompt(){
        const DateSystem = `\n ${this.returnSysDate()}`

        let sys_prompt = await this.basesystemPrompt + DateSystem
        //console.log(sys_prompt)

        return sys_prompt
    }
    returnSysDate() {

        const currentDate = new Date()
        
        return `Current date is ${currentDate}`
    }
    
    readNote(NotePath){

    }

    async getWeatherForecast() {

        const lat = this.plugin.settings.userLatitude
        const long = this.plugin.settings.userLongitude

        if (!lat || !long){
            new Notice("No city selected for Weather forecast")
            return;
        }



        const WeatherResponse = await getWeatherData(lat,long)

        if (WeatherResponse && WeatherResponse.current_weather){
            const tempUnit = WeatherResponse.daily_units.temperature_2m_max
            return `
            Weather forecast in ${this.plugin.settings.userCity}
            CURRENT WEATHER: ${WMO_CODE[WeatherResponse.current_weather.weathercode.toString()]}
            Temperature: ${WeatherResponse.current_weather.temperature} ${tempUnit}

            TODAY WEATHER: ${WMO_CODE[WeatherResponse.daily.weathercode[0].toString()]}
            Max temperature: ${WeatherResponse.daily.temperature_2m_max[0]}} ${tempUnit}
            Min temperature: ${WeatherResponse.daily.temperature_2m_min[0]} ${tempUnit}
            TOMORROW: ${WMO_CODE[WeatherResponse.daily.weathercode[1].toString()]}
            Max temperature: ${WeatherResponse.daily.temperature_2m_max[1]} ${tempUnit}
            Min temperature: ${WeatherResponse.daily.temperature_2m_min[1]} ${tempUnit}
            `
        }else {
            console.log("Weather request failed")
        }
    }

    async loadUserDocs(){
        if (!this.documentsProvidedbyUser){
            return;
        }

        const docsPromises = this.documentsProvidedbyUser.map(async (doc)=>{
            if (doc.extension === "md"){
                return new Document({text:await app.vault.read(doc)})
            }else if (doc.extension === "pdf"){
                //const pdfReader = new PDFReader();
                const path = app.vault.adapter.path.join(app.vault.adapter.basePath,doc.path)
                const newDoc = await loadPDFData(doc)
                return newDoc
            }
        })

        const docsToAdd = await Promise.all(docsPromises)

        this.ongoingChat = await this.addDocumentsToChatIndex(docsToAdd.filter(f=>f),this.ongoingChat)
    }

    async greetUserNoDocAccess(){
        let sys_prompt = await this.buildSystemPrompt()
        const weather = await this.getWeatherForecast()  
        if (weather){
            sys_prompt += weather
        }
        sys_prompt += `\nStart off by your first message of the day to your user ${this.plugin.settings.userName}`       


        console.log(sys_prompt)
        this.ongoingChat = new SimpleChatEngine({
            'llm':this.chatModel,
            'chatHistory': [
                {
                    "content" : sys_prompt,
                    "role": "system"
                }
            ]
        })

        //Modules to add more context for the AI
        const matte = await this.readTasksAndAddTheMostUrgentToContext()
        await this.loadMemoriesToContext()
        console.log("Loading docs loaded by the user...")
        await this.loadUserDocs()



        let response = await this.chatModel.chat(this.ongoingChat.chatHistory) 
        
        this.ongoingChat.chatHistory.push(response.message)

        return response.message.content
    }

    addSystemPromptDate(){
        
        this.ongoingChat.chatHistory.push(
            {
                "role":"system",
                "content": this.returnSysDate()
            }
        )
    }

    async simpleAnswerUser(userMessage){

        let response = await this.ongoingChat.chat(userMessage)

        /*this.ongoingChat.chatHistory.push({
            "role": "assistant",
            "content": response.response})*/

        return response.response
    }

    readMessage(userMessage){

    }

    async think(){
        // Return the function to be executed, and call it
        let commandsList = ""

        this.functionLibrary.keys().forEach(func =>{
            commandsList += func.function + ", args: " + func.args + "\n"
        })

        const master_system_Prompt = ```
        You are a supervising AI in charge of helping a chatbot give the best answer possible to its user. 
        Your decisions must always be made independently without seeking user assistance. 
        Play to your strengths as an LLM and pursue simple strategies with no legal complications.
        You will be provided the last messages of a chat history and your goal is to assess which of the available commands has the most potential to help the chatbot provide a good answer.

        Constraints:
        - No user assistance
        - Exclusively use the commands listed in double quotes e.g. "command name"

        Commands:
        ${commandsList}

        You should only respond in JSON format as described below
        Response Format:
        {
            "thoughts": {
                "text": "thought",
                "reasoning": "reasoning",
                "plan": "- short bulleted\n- list that conveys\n- long-term plan",
                "criticism": "constructive self-criticism",
                "speak": "thoughts summary to say to user"
            },
            "commands": [{
                "name": "command name",
                "args": {
                    "arg name": "value"
                }]
            }
        }
        ```

        const brainz = new SimpleChatEngine({
            'llm':this.chatModel,
            'chatHistory': [
                {
                    "content" : master_system_Prompt,
                    "role": "system"
                }
            ]
        })

        //Keep only last 3 messages of the chat 
        const thought = await brainz.chat(this.ongoingChat.chatHistory.slice(-4).map(f=>{return `${f.role}:${f.content}`}))
        console.log(thought)

    }

    async loadCharacterInExistingPanel(chatHistoryProvided){
        chatHistoryProvided = chatHistoryProvided || null;
        //Accepts a chatHistoryObject
        const panel = document.getElementById(CHAT_PANEL_ID)
        if (panel) {

            //Set picture
            const pic = document.getElementById(CHARACTER_PIC_ID)
            if (pic){
                pic.src = this.imgSrc
            }
            //Set Name

            const nameArea = document.getElementById(CHARA_NAME_ID)
            if (nameArea){
                nameArea.textContent = this.name
            }

            //Chat Area operations
            const messageArea = document.getElementById(CHAT_MESSAGES_ID)


            if (messageArea){
                //Reset chat area

                messageArea.innerHTML = ""

                if (chatHistoryProvided){


                    chatHistoryProvided.messages.forEach(message=>{
                        if(message.role === "user"){
                            addUserMessage(message.content)
                        } else if (message.role === "assistant"){
                            addRobotMessage(message.content)
                        }
                    })

                    await this.loadChatProfileFromSavedChat(chatHistoryProvided)

                } else {
                    //Greet User
                    const newMes = new RobotMessage()

                    newMes.addRobotMessage(await this.greetUserNoDocAccess())
                }

            }

        }else{
            new Notice("No character panel found!")
        }
    }

    async loadChatProfileFromSavedChat(chatHistory){
        //ChatHistory should be formatted as follows: {"messages":[{"role":"system/user/assistant","content":"bla bla bla"}],"file": TPfile}

        //Load chat messages = Setup the system prompt + chathistory as the chat model
        //Parse the messages and display them

        //Add system date prompt that initiated the convo 

        //And add a new system prompt that adds today's date 
        //TODO: Mention  in context the memories that were created at the time of the chat vs at time of re-opening the chat

        if (!chatHistory){
            console.log("No chat history found")
            return
        }
        
        const chatCreatedDate = moment(chatHistory.file.stat.ctime).format("YYYY-MM-DD hh:mm a")

        let sys_prompt = await this.basesystemPrompt + "\n Current date: " + chatCreatedDate
        sys_prompt = sys_prompt.trim()


        let loadedChatHistory = [
            {
                "role":"system",
                "content": sys_prompt
            }
        ]

        chatHistory.messages.forEach(mes => {
            loadedChatHistory.push(mes)
        })


        if (this.ongoingChat) {
            this.ongoingChat.chatHistory = loadedChatHistory
        } else {
            this.ongoingChat = new SimpleChatEngine({
                'llm':this.chatModel,
                'chatHistory': loadedChatHistory
            })

            //Modules to add more context for the AI
            const matte = await this.readTasksAndAddTheMostUrgentToContext()
            await this.loadMemoriesToContext()
        }
    }

    async saveOngoingChat(){
        let chat = ""

        const folderPath = this.plugin.settings.promptFolder + "/" + SAVED_CHATS_FOLDER_NAME

        if (!app.vault.getAbstractFileByPath(folderPath)){
            await app.vault.createFolder(folderPath)
        }

        let nowDate = new Date()
        nowDate = nowDate.toISOString().slice(0,10) + " " + nowDate.toTimeString().slice(0,5).replace(":","h") + " " + nowDate.toTimeString().split("(")[1].replace(")", "" )
        const filePath = folderPath + "/" + this.name + " discussion with " + this.plugin.settings.userName + " - " + nowDate + ".md"


        this.ongoingChat.chatHistory.forEach(mes =>{
            if (mes.saved){
                return
            }
            if (mes.role === "user"){
                chat += `\n\n**${this.plugin.settings.userName}**: ${mes.content}`
            }else if (mes.role === "assistant"){
                chat += `\n\n**${this.name}**: ${mes.content}`
            }
        })


        if (chat === ""){
            new Notice("Chat already saved.")
            return
        }

        const existingFile = app.vault.getAbstractFileByPath(filePath)
        if (existingFile){

            await app.vault.append(existingFile,chat)

        }else {
            chat = `---\ncharacter-name: ${this.name}\n---` + chat

            const chatLog = await app.vault.create(filePath,chat)
            this.ongoingChat.chatHistory.map(f=>{
                const newMes = f
                newMes.saved = true;
                return newMes
            })
        }
        return await app.vault.read(app.vault.getAbstractFileByPath(filePath))
    }

    async loadMemoriesToContext(){

        if (this.templateText.match(/# Memories\s+({[\s\S]+})/)){
            const memorySection = this.templateText.match(/# Memories\s+({[\s\S]+})/)[1]
            const memoriesDoc = new Document({"text":memorySection }) 
            this.ongoingChat = await this.addDocumentsToChatIndex([memoriesDoc],this.ongoingChat)
        }
    }

    async rememberChat(){
        //Creates a journal entry to be added to the memories 
        let chat = "";


        let memorySection = "" 
        let memorySectionObj = []
        let existingTags = "" 
        let tagSection = "\n# Tags\n"


        if (this.templateText.match(/# Tags\s+([\s\S]+)/)) {
            existingTags = this.templateText.match(/# Tags\s+([\s\S]+)/)[1]
            tagSection = this.templateText.match(/# Tags\s+([\s\S]+)/)[0]
        } 

        const systemPrompt = `
        Please synthetize the discussion so far as a journal entry, including a brief synthesis of the points discussed and your feelings about it.
        Only output the formatted journal entry, including today's date, the journal entry and the tags about this discussions. 
        It is OK to express all kinds of emotions (not only positive ones) to stay in character.

        Tags rules:
        - no space (_ underscore character instead)
        - 5 per discussion
        - try to use the existing tags if relevant, otherwise create new ones

        Existing tags - please create new relevant tags as needed:
        ${existingTags}

        Expected format (json):
        {
            "date":"YYY-MM-DD",
            "journal_entry": "Journal entry content",
            "tags": "five,comma,separated,tags,no_space_allowed"
        }
        `
        let newText = ""

        let newEntry = await this.ongoingChat.chat(systemPrompt)
        let newEntryObj = JSON.parse(newEntry)

        // Update the tags section

        newEntryObj.tags.split(",").forEach(tag => {
            if (!tagSection.includes(tag)){
                tagSection += "\n"+ tag
            }
        })

        if (this.templateText.match(/# Memories\s+({[\s\S]+})/)) {
            memorySection = this.templateText.match(/# Memories\s+({[\s\S]+})/)[1]
            memorySectionObj = JSON.parse("["+ memorySection + "]")

            memorySectionObj.push(newEntryObj)
            memorySection = JSON.stringify(memorySectionObj)
            memorySection = memorySection.slice(1,memorySection.length - 1)

            newText = this.templateText.replace(/(# Memories\s+)({[\s\S]+})/, `$1${memorySection}`)    
            
            newText = newText.replace(/# Tags([\s\S]+)/,tagSection)

        }else {
            memorySection = "\n# Memories\n\n" + newEntry

            newText = this.templateText + memorySection + "\n" + tagSection
        }




        //Save in the template doc
        this.templateText = newText
        await app.vault.modify(this.template,newText)
        


    }

}



class CharacterChoiceModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.awaitTillChosen = new Promise((resolve, reject)=>{
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
        })
        this.submitted = false;
    };
    async onOpen() {
        let {contentEl} = this;

        await this.plugin.loadCharacters()

        // Création du titre du modal
        contentEl.createEl("h2", { text: "Please select a character" });

        // Création de la liste de personnages
        const listEl = contentEl.createEl("ul");

        this.plugin.settings.loadedcharacters.forEach((character) => {
            // Création d'un élément de liste pour chaque personnage
            const listItemEl = listEl.createEl("li", {
                attr: {
                    class: "character-item"
                }
            });
            

            const picWrapper = listItemEl.createEl("div", {
            attr: {
                id: "character-pic-wrapper"
            }
            })

            // Ajout de l'image
            picWrapper.createEl("img", {
            attr: {
                src: character.imgSrc,
                alt: character.name
            },
            });

            const descWrapper = listItemEl.createEl("div", {
            attr: {
                id: "character-description-wrapper"
            }
            })
            // Ajout du nom et de la description
            descWrapper.createEl("h3", { text: character.name });
            descWrapper.createEl("p", { text: character.description });

            // Événement de clic pour choisir le personnage
            listItemEl.addEventListener("click", () => {
                this.plugin.settings.defaultCharacter = character
                this.plugin.saveSettings()
                this.submitted = true;
                this.close(); 
            });
        });
    };

    onClose(){
        this.containerEl.empty()
        if ( this.submitted ){
            this.resolvePromise();
        } else {
            this.rejectPromise();
        }
    };
}

class ChatSelectionModal extends Modal {
    //Lists all the saved chats and makes it correspond to the right AI character.
    //Then asks the right AI character to load the corresponding Chat


    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.awaitTillChosen = new Promise((resolve, reject)=>{
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
        })
        this.selectedChatFile
        this.submitted = false;
    };
    async onOpen(){
        let {contentEl} = this;
        let chatFiles = app.vault.getMarkdownFiles().filter(f=>{return f.path.includes(this.plugin.settings.promptFolder + "/"+ SAVED_CHATS_FOLDER_NAME)})

        await this.plugin.loadCharacters()

        contentEl.createEl("h2",{text:"Please select a chat to load"})

        const listEl = contentEl.createEl("div", {attr: {
            id: "saved-chat-list"
        }})

        
        chatFiles.forEach(chatfile=> {

            let characterName = app.metadataCache.getFileCache(chatfile).frontmatter["character-name"]

            if (!characterName){
                return;
            }

            const character = this.plugin.settings.loadedcharacters.filter(f=>{return f.name === characterName})[0]
            if (!character){
                return;
            }

            const listItemEl = listEl.createEl("div",{attr:{
                class: "saved-chat-item"
            }})

            const listItemPicWrapper = listItemEl.createEl("div",{attr:{
                id: "character-pic-wrapper"
            }})

            const listItemPic = listItemPicWrapper.createEl("img",{attr:{
                src: character.imgSrc,
                alt: character.name
            }})

            const chatTitleEl = listItemEl.createEl("div",{text:chatfile.basename,attr:{class:"saved-chat-name"}})


            listItemEl.addEventListener("click", () => {
                this.selectedChatFile = chatfile
                this.plugin.settings.defaultCharacter = character
                this.plugin.saveSettings()
                this.submitted = true;
                this.close(); 

            });
            

        })
    }

    onClose(){
        this.containerEl.empty()
        if ( this.submitted ){
            this.resolvePromise(this.selectedChatFile);
        } else {
            this.rejectPromise();
        }
    };
}


class FileSelectionModal extends FuzzySuggestModal{
    constructor(app, view) {
        super(app);
        this.app = app;
        this.view = view;
        this.setPlaceholder("Type the name of a file...");
    }
    getItems() {
        // get all markdown files
        return this.app.vault.getMarkdownFiles().sort((a, b) => a.basename.localeCompare(b.basename));
    }
    getItemText(item) {
        return item.basename;
    }
    onChooseItem(file) {
        this.view.insert_selection(file.path + "]] ");
    }
}

class FolderSelectionModal extends FuzzySuggestModal {
  constructor(app, view) {
    super(app);
    this.app = app;
    this.view = view;
    this.setPlaceholder("Type the name of a folder...");
  }
  getItems() {
    return app.vault.getAllLoadedFiles().filter(f=>{return f.children}).map(m=>{
        return m.path
    });
  }
  getItemText(item) {
    return item;
  }
  onChooseItem(folder) {
    this.view.insert_selection(folder + "/ ");
  }
}

class PromptSelectionModal extends FuzzySuggestModal {
  constructor(app, view) {
    super(app);
    this.app = app;
    this.view = view;
    this.setPlaceholder("Type the name of a prompt...");
    this.options = app.vault.getMarkdownFiles().filter(f=>{
        return f.path.includes(this.view.plugin.settings.customPromptsFolder);
    })
  }
  getItems() {
    return this.options
  }
  getItemText(item) {
    return item.basename;
  }
  async onChooseItem(folder) {
    let newPrompt = await app.vault.read(folder)

    //Use Obsidian Template parser on the prompt
    
    //Check if quickAdd is available and if so parse the prompt to fill it 
    const quickAddPlugin = this.app.plugins.plugins.quickadd
    if (quickAddPlugin){
        newPrompt = await quickAddPlugin.api.format(newPrompt)
    }
    //Check if Templater is available and if so parse the prompt to fill it
    const templaterPlugin = this.app.plugins.plugins["templater-obsidian"];
    if (templaterPlugin){
        const cfg = templaterPlugin.templater.create_running_config(folder,folder,3)
        newPrompt = await templaterPlugin.templater.parse_template(cfg,newPrompt)
    }


    this.view.insert_selection(newPrompt);
    this.view.adjustScrollHeight(document.getElementById("user-input"),this.view)
  }
}


module.exports = ObsidianPlugin;
