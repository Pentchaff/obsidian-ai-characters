# Inviting AI Characters in Obsidian
  
This plugin for Obsidian allows you to save AI character system prompts directly within the application.
You will have a chat panel in which you can load any character that you have created using a system prompt template, and this character will greet you each day, helping you address your tasks, being your chat buddy, reading your documents for you etc. 

This is still a bit clunky but it works and I hope people will be interested in contributing !

# Prerequisites
Required plugins:
- The plugin is pretty much standalone for basic usage ( storing characters and interacting with them)
- Tasks is recommended for the assistant to be able to help you with your tasks
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
3. Activate the plugin in the Obsidian settings
4. Load an OpenAI API key in the settings (key will be stored in the settings on your local machine) 
  
## Usage  
  
1. Open Obsidian and create a new folder to store your templates
2. In the Settings, point to this folder so the program knows where to find the files 
4. Create a character template based on the example provided
5. Open the chat panel , and click on the green circle to load the character you just created!
  
## Contributions  
  
Contributions are welcome! If you would like to contribute to this project, please refer to the CONTRIBUTING.md file for detailed instructions.  
  
## License  
  
This project is licensed under the MIT License. Please see the LICENSE file for more information.
