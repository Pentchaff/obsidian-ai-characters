# Inviting AI Characters in Obsidian
  
This plugin for Obsidian allows you to save AI character system prompts directly within the application.
You will have a chat panel in which you can load any character that you have created using a system prompt template, and this character will greet you each day, helping you address your tasks, being your chat buddy, reading your documents for you etc. 

This is still a bit clunky but it works and I hope people will be interested in contributing !

# Prerequisites
Required plugins:
- The plugin is pretty much standalone for basic usage ( storing characters and interacting with them)
- [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) is recommended for the assistant to be able to help you with your tasks
- [Text Extractor](https://github.com/scambier/obsidian-text-extractor) plugin is required if you want to feed the Ai with pdf documents
## Key Features  

🤖**System prompt saving**

- You can save characters personas including:
	- Personality
	- Picture
	 - Chat saving
	- [BETA] Memory : I integrated a memory feature that is loaded on each of the discussions. You always have access to the memory and are able to modify it as you please

🌦**Weather forecast**
- The character can greet you using the latest meteorological data ( TODO: Add more settings for this feature including week ahead etc)

📁**File loading**
- Feed the discussion with files from your vault , adding them to the context of the discussion

📑**Prompt saving**
- Save your favorite prompts with variables that you can populate using [QuickAdd](https://github.com/chhoumann/quickadd) or [Templater](https://github.com/SilentVoid13/Templater)
  
## Installation  

I will make an official obsidian plugin request soon, once I am more confident in the value-add of the plugin and I look into several cosmetics. 

1. Download the plugin ZIP file from the [GitHub repository](https://github.com/Pentchaff/obsidian-ai-characters/).  (arrow to the right of the green button "Code" > download zip)
2. Unzip the file and place it in the Obsidian plugins folder ( final path should look like this:  **path_to_your_obsidian_vault/.obsidian/Plugins/obsidian-ai-characters** )
3. Activate the plugin in Obsidian settings
4. Load an OpenAI API key in the settings (key will be stored in the settings on your local machine). For this go to [platform.openai](https://platform.openai.com/account/api-keys), login if needed and create a new secret key
   [NOTE] You will have access to GPT-4 once you will have done your 1st paid transaction on OpenAi API. 
  
## Usage  
  
1. Open Obsidian and create a new folder to store your templates
2. In the Settings, point to this folder so the program knows where to find the files 
4. Create a character template based on the example provided
5. Open the chat panel , and click on the green circle to load the character you just created!
  
## Contributions  
  
Contributions are welcome! If you would like to contribute to this project, please refer to the CONTRIBUTING.md file for detailed instructions.  
  
## License  
  
This project is licensed under the MIT License. Please see the LICENSE file for more information.
