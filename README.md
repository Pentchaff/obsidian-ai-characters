

# AI Character Prompt System Backup Plugin for Obsidian  
  
This plugin for Obsidian allows you to save AI character prompt systems directly within the application. It simplifies the creation and management of prompts for training artificial intelligence models.  

This is still a bit clunky but it works and I hope people will be interested in contributing !

# Prerequisites
Required plugins:
- The plugin is pretty much standalone for basic usage ( storing characters and interacting with them)
- QuickAdd is required for advanced prompt templates
- Text Extractor plugin is required if you want to feed the Ai with pdf documents
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

📑**Prompt saving** (TODO)
- Save your favorite prompts with variables that you can populate using quickAdd 
  
## Installation  

I will make an official obsidian plugin request soon, once I am more confident in the value-add of the plugin and I look into several cosmetics. 

1. Download the plugin ZIP file from the [GitHub repository](link_to_repo).  
2. Unzip the file and place it in the Obsidian plugins folder.  
3. Activate the plugin in the Obsidian settings.
  
## Usage  
  
1. Open Obsidian and create a new file 
2. Create a character template based on the example provided
3. Use the `prompt-save` command to save a prompt system.  
4. Organize your prompts into folders and subfolders according to your preference.  
5. Use the `prompt-export` command to export your prompts as text files.  
  
## Contributions  
  
Contributions are welcome! If you would like to contribute to this project, please refer to the CONTRIBUTING.md file for detailed instructions.  
  
## License  
  
This project is licensed under the MIT License. Please see the LICENSE file for more information.