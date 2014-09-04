function Plume() {
	this.activeScene = undefined;
	this.activeBlock = undefined;
	this.settings = [];
	this.basePath = "";
	this.blockLine = 0;
}

function Scene(name) {
	this.blockList = [];
	this.settings = [];
	this.scriptModule = undefined;
}

function Block(name) {
	this.name = name;
	this.nextBlock = undefined;
	this.dialogList = [];
}

function Dialog(speaker, text) {
	this.character = speaker === undefined ? "" : speaker;
	this.text = text === undefined ? "" : text;
}

function DialogOption(text, options) {
	this.text = text;
	this.options = options;
}

function OptionItem(block, text) {
	this.block = block;
	this.text = text;
}

function ScriptCall(func) {
	this.func = func;
}

function GotoItem(target) {
	this.target = target;
}

function UIElement(id) {
	this.class = "UIElement";
	this.id = id;
	this.properties = {
		x: 0,
		y: 0,
		z: 0,
		visible: true
	}
	this.events = {
		
	}
	
	this.draw = function(ctx) { 
		ctx.font = "14px Helvetica";
		ctx.fillStyle = "rgb(0, 0, 0)";
		ctx.fillText(this.id, this.properties.x, this.properties.y);
	}
	
	this.getProperty = function(key) {
		return this.properties[key];
	}
}

function UIString(id) {
	var base = new UIElement(id);
	
	base.draw = function(ctx) {
		var dx = this.getProperty("x"), dy = this.getProperty("y");
		ctx.font = this.getProperty("font") || "14px Helvetica";
		ctx.fillStyle = this.getProperty("color");
		//Draw character by character, applying line formatting.
		var line = this.properties.value;
		for(var i = 0; i < this.getProperty("value").length; i++) {
			var nextChar = this.getProperty("value").substring(i, i + 1);
			if(nextChar === "<" && line.substring(i - 1, i) !== "\\") {
				//We're in a tag, so find the whole tag.
				var endTagPosition = line.substring(i, line.length).search(/[^\\]>/);
				if(endTagPosition !== -1) {
					endTagPosition += 1; //Right after the tag.
					var tag = line.substring(i + 1, i + endTagPosition);
					var parts = tag.split(":");
					var key = parts[0].toLowerCase(), val = parts[1];
					switch(key) {
						case "color":
							ctx.fillStyle = val;
							break;
						case "br":
							dy += 20;
							dx = this.properties.x;
							break;
					}
				}
				i += endTagPosition;
			} else {
				ctx.fillText(nextChar, dx, dy);
				dx += ctx.measureText(nextChar).width;
			}
		}
	}
	
	return base;
}

function UIRect(id) {
	var base = new UIElement(id);
	
	base.draw = function(ctx) {
		ctx.beginPath();
		ctx.rect(this.getProperty('x'), this.getProperty('y'), this.getProperty('width'), this.getProperty('height'));
		ctx.fillStyle = this.getProperty('baseColor');
		ctx.fill();
		if(this.getProperty('borderColor')) {
			ctx.strokeStyle = this.getProperty('borderColor');
			ctx.stroke();
		}
		ctx.closePath();
	}
	return base;
}

function UIImage(id) {
	var base = new UIElement(id);
	base.draw = function(ctx) {
		ctx.drawImage(document.getElementById("plume_image_" + this.getProperty("image")), this.getProperty("x"), this.getProperty("y"));
	}
	return base;
}

//Variables
Plume.prototype.elements = [];
Plume.prototype.waitTime = 0; //Delay for a wait element

Plume.prototype.loadProject = function(file) {
	this.debug("Loading project: " + file);
	var self = this;
	Plume.prototype.instance = this; //Allow scripts to hook in
	var rawConfig = this.loadFile(file + "/plume.config");
	this.basePath = file;
	this.settings = this.parseConfig(rawConfig, function(key, value) {
		switch(key) {
			case "title":
				document.title = value; break;
			case "mainScene":
				self.loadScene(value + ".scene"); break;
		}
	});
	
	if(this.settings["mainScene"] === undefined) {
		//Load the default scene
		this.loadScene("scene1.scene");
	}
	return true;
	
}

Plume.prototype.loadInterface = function(file) {
	var rawElems = this.loadFile(file);
	var json = JSON.parse(rawElems);
	
	for(var i = 0; i < json.assets.length; i++) {
		//Load all the assets
		var asset = json.assets[i];
		if(asset.type === "image") {
			var path = file.substring(0, file.lastIndexOf("/"));
			document.body.innerHTML += "<img src='" + path + "/assets/" + asset.src + "' id='plume_image_" + asset.name + "'>";
		}
	}
	
	for(var i = 0; i < json.elements.length; i++) {
		var elem = json.elements[i];
		var newItem;
		switch(elem.class) {
			case "UIElement": 	newItem = new UIElement(elem.id); break;
			case "UIString":	newItem = new UIString(elem.id); break;
			case "UIRect":		newItem = new UIRect(elem.id); break;
			case "UIImage":		newItem = new UIImage(elem.id); break;
		}
		newItem.properties = elem.properties;
		newItem.events = elem.events;
		this.elements.push(newItem);
	}
	//Search for main_text_display
	var doesMainDisplayExist = false;
	for(var i = 0; i < this.elements.length; i++) {
		if(this.elements[i].id === "main_text_display") {
			doesMainDisplayExist = true;
			this.mainDisplay = this.elements[i];
		}
	}
	if(!doesMainDisplayExist) {
		var canvas = document.getElementById('plumeCanvas');
		var mainDisplay = new UIString("main_text_display");
		mainDisplay.properties = {
			"x": 50,
			"y": canvas.height - 50,
			"z": 15,
			"visible": true,
			"color": "rgb(0,0,0)",
			"value": "Test"
		};
		mainDisplay.elements = {};
		this.elements.push(mainDisplay);
		this.mainDisplay = mainDisplay;
	}
}

Plume.prototype.parseConfig = function(data, processLine) {
	var out = [];
	var lines = data.replace("\r","").split("\n");
	for(var i = 0; i < lines.length; i++) {
		var line = lines[i];
		if(line.length == 0) continue; //Ignore blank lines
		var parts = line.split("=");
		if(parts.length !== 2) {
			this.error("Invalid config line: " + line, i + 1);
		}
		var key = parts[0].trim();
		var value = parts[1].replace(/"/g,"").trim();
		out[key] = value;
		if(processLine) processLine(key, value);
	}
	return out;
}

Plume.prototype.loadScene = function(scene) {
	this.debug("Loading scene: " + scene);
	var baseUrl = this.basePath + "/" + scene + "/"
	var sceneName = scene.split(".")[0];
	var rawStory = this.loadFile(baseUrl + sceneName + ".story");

	this.activeScene = new Scene();
	this.activeScene.settings = this.parseConfig(this.loadFile(baseUrl + sceneName + ".config"));
	
	if(!this.parseStory(rawStory)) {
		this.error("Unable to parse story. Aborting load.");
		return false;
	}
	
	this.loadInterface(baseUrl + sceneName + ".interface");
	
	if(this.activeScene.settings['scriptFile'] !== undefined) {
		this.setupPython(this.loadFile(baseUrl + this.activeScene.settings['scriptFile']));
	}
	
	this.scrollSpeed = this.getSceneSettingsValue("scrollSpeed", 60);
	
	return true;
}

Plume.prototype.loadFile = function(fileName) {
	var request = new XMLHttpRequest();
	request.open('GET', fileName, false);
	request.send();	
	if(request.status === 200 || request.status === 0) {
		return request.responseText;
	} else {
		this.error("Failed to load file " + fileName);	
	}
}

Plume.prototype.parseStory = function(data) {
	//Define regexes
	var blockHeaderRegex = new RegExp("\\\[\\\[([a-zA-Z0-9_-]+)\\\]\\\]");
	var speechRegex = new RegExp("(.+?): (.+)?")
	var optionRegex = new RegExp("\{(.*?)\}");
	var runScriptRegex = new RegExp("( |^)<runScript: (.+)>", "m");
	var gotoRegex = new RegExp("( |^)<to: (.+)>", "m");
	//Parse each line
	var lines = data.replace("\r", "").split("\n");
	var activeBlock = undefined;
	for(var i = 0; i < lines.length; i++) {
		var line = lines[i];
		//If the line is blank, ignore it.
		if(line.length == 0) continue;
		if(blockHeaderRegex.test(line)) {
			//We found a block header
			var header = blockHeaderRegex.exec(line)[1];
			this.debug("Block found: " + header);
			var newBlock = new Block(header);
			if(activeBlock !== undefined) {
				//Add the previous active block to the scene
				activeBlock.nextBlock = newBlock;
				this.activeScene.blockList[activeBlock.name] = activeBlock;
				this.debug("Registering block " + activeBlock.name);
			}
			activeBlock = newBlock;
		} else if (runScriptRegex.test(line)) {
			var parsedLine = runScriptRegex.exec(line)[2];
			activeBlock.dialogList.push(new ScriptCall(parsedLine));
		} else if (gotoRegex.test(line)) {
			var parsedLine = gotoRegex.exec(line)[2];
			activeBlock.dialogList.push(new GotoItem(parsedLine));
		} else if (optionRegex.test(line)) {
			var parsedLine = optionRegex.exec(line)[1];
			this.debug("Option found: " + parsedLine);
			var parts = parsedLine.split(",");
			var text = parts[0].replace(/"/g, "").trim();
			var options = [];
			if(parts.length == 1) {
				this.error("No options specified for choice element.", i + 1);
				return false;
			}
			for(var j = 1; j < parts.length; j++) {
				var option = parts[j];
				var optSplit = option.split(":");
				if(optSplit.length !== 2) {
					this.error("Invalid syntax for choice element option.", i + 1);
					return false;
				}
				options.push(new OptionItem(optSplit[0].trim(), optSplit[1].replace(/"/g, "").trim()));
			}
			activeBlock.dialogList.push(new DialogOption(text, options));
		} else if (speechRegex.test(line)) {
			var parsedLine = speechRegex.exec(line);
			this.debug("Dialog found (Actor: " + parsedLine[1] + ", Text: " + parsedLine[2] + ")");
			if(activeBlock != null) {
				activeBlock.dialogList.push(new Dialog(parsedLine[1], parsedLine[2]));
			} else {
				this.error("Speech found before a header was defined.", i + 1)	;
				return false;
			}
		} else {
			this.error("Unable to parse line.", i + 1);
			return false;
		}
	}
	
	//Add the last block
	this.activeScene.blockList[activeBlock.name] = activeBlock;
	this.debug("Registering block " + activeBlock.name);

	return true;
}

Plume.prototype.start = function() {
	var self = this;
	this.debug("Starting.");	
	//Find the block named start and use it
	this.activeBlock = this.activeScene.blockList["start"];
	if(this.activeBlock === undefined) {
		this.error("Unable to find start block.");
		return false;
	}
	
	
	//Set up canvas
	var canvas = document.getElementById('plumeCanvas');
	canvas.width = canvas.getAttribute("width");
	canvas.height = canvas.getAttribute("height");
	canvas.style.width = canvas.width;
	canvas.style.height = canvas.height;
	this.canvas = canvas;
	this.drawContext = canvas.getContext('2d');
	
	//Set up keybinds
	this.initializeKeyBindings();
	
	//Start the story!
	this.displayNextDialogLine();
	requestAnimationFrame(function() { self.draw() });
}

Plume.prototype.initializeKeyBindings = function() {
	var self = this;
	document.onkeypress = function(event) {
		var val = event.keyCode;
		if(val === 32) { //space
			self.finishLine();
		}
		
		return false;
	}
}

Plume.prototype.getSceneSettingsValue = function(key, def) {
	return this.activeScene.settings[key] !== undefined ? this.activeScene.settings[key] : def;
}

Plume.prototype.getConfigValue = function(key, def) {
	return this.settings[key] !== undefined ? this.settings[key] : def;
}

Plume.prototype.displayNextDialogLine = function() {
	if(this.activeBlock === undefined) {
		this.error("The current block is not defined.");
		return false;
	}
	if(this.blockLine == this.activeBlock.dialogList.length) {
		//Try and move to the next block.
		this.activeBlock = this.activeBlock.nextBlock;
		this.blockLine = 0;
		if(this.activeBlock === undefined) {
			this.debug("Reached the end of the block, but no new blocks were found.");
			return;
		}
	}
	
	this.scrollSpeed = this.getSceneSettingsValue("scrollSpeed", 60);
	
	var list = this.activeBlock.dialogList;
	var line = list[this.blockLine++];
	if(line instanceof DialogOption) {
		//Display a dialog option
		this.print(line.text);
		for(var i = 0; i < line.options.length; i++) {
			var option = line.options[i];
			this.print("<button class='optionButton' onclick='javascript:Plume.goToBlock(\"" + option.block + "\")'>> " + option.text + "</button>");
		}
	} else if(line instanceof ScriptCall) {
		var func = line.func;
		if(func.substr(func.length - 1, 1) === "!") {
			//Autoproceed
			this.runScriptMethod(line.func.substr(0, func.length - 1));
			this.displayNextDialogLine();
		} else {
			this.runScriptMethod(line.func);
		}
	} else if (line instanceof GotoItem) {
		this.goToBlock(line.target);
	} else {
		this.currentLine = line.text;
		this.currentLinePosition = 0;
		this.mainDisplay.properties.value = line.character + ": ";
		this.writeTicks = 0;
	}
}

Plume.prototype.finishLine = function() {
	//Skip the typewriter effect if there's still text to display, otherwise move on to the next line.
	if(this.currentLinePosition < this.currentLine.length) {
		while(this.currentLinePosition < this.currentLine.length) {
			this.drawNextCharacter();
		}
	} else {
		this.displayNextDialogLine();	
	}
}
Plume.prototype.goToBlock = function(blockName) {
	this.activeBlock = this.activeScene.blockList[blockName];
	this.blockLine = 0;
	//Remove this eventually
	var buttons = document.getElementsByClassName("optionButton");
	while(buttons[0]) buttons[0].parentNode.removeChild(buttons[0]);
	//end remove
	this.displayNextDialogLine();
}

function builtinRead(x) {
    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
            throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
}

Plume.prototype.setupPython = function(script) {
	this.debug('Setting up Python scripts.');
	Sk.configure({output: this.debug, read: builtinRead});
    try {
      this.activeScene.scriptModule = Sk.importMainWithBody("<stdin>", false, script); 
    }
    catch(e) {
       alert(e.toString())
    }
}

Plume.prototype.runScriptMethod = function(method, args) {
	if(args === undefined) {
		Sk.misceval.callsim(this.activeScene.scriptModule.tp$getattr(method));	
	} else {
		args.unshift(this.activeScene.scriptModule.tp$getattr(method));
		for(var i = 1; i < args.length; i++) args[i] = Sk.builtin.str(args[i]);
		Sk.misceval["callsim"].apply(this, args);
	}
}

Plume.prototype.processTag = function(line) {
	var parts = line.replace("<", "").replace(">", "").split(":");
	var key = parts[0].toLowerCase(), value = parts[1];
	switch(key) {
		case "runscript":
			try {
				if(value.indexOf("(") !== -1) {
					var argLoc = value.indexOf("(");
					var args = value.substring(argLoc + 1, value.length - 1).match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
					for(var i = 0; i < args.length; i++) args[i] = args[i].trim().replace(/"(.+)"/, "$1"); //Trim all values, remove quotes
					this.runScriptMethod(value.substring(0, argLoc).trim(), args);
				} else {
					this.runScriptMethod(value.trim());
				}
			} catch (exception) {
				this.error("Failed to run script.", exception);
			}
			return "";
		case "to":
			this.goToBlock(value.trim());
			return "-skip-";
		case "scrollspeed":
			this.scrollSpeed = parseInt(value, 10);
			return "";
		case "wait":
			this.waitTime = parseInt(value, 10);
	}
	return line;
}

Plume.prototype.drawNextCharacter = function() {
	var nextChar = this.currentLine.substring(this.currentLinePosition, this.currentLinePosition + 1);
	if(nextChar === "<" && this.currentLine.substring(this.currentLinePosition - 1, this.currentLinePosition) !== "\\") {
		//Start of a tag.
		var endTagPosition = this.currentLine.substring(this.currentLinePosition, this.currentLine.length).search(/[^\\]>/);
		if(endTagPosition !== -1) {
			endTagPosition += 2; //Right after the tag.
			var tag = this.processTag(this.currentLine.substring(this.currentLinePosition, this.currentLinePosition + endTagPosition));
			if(tag !== "-skip-") {
				this.mainDisplay.properties.value += tag;
				this.currentLinePosition += endTagPosition;
			}
			return;
		}
	}
	this.mainDisplay.properties.value += this.currentLine.substring(this.currentLinePosition, ++this.currentLinePosition);
	
}

Plume.prototype.draw = function() {
	var self = this;
	requestAnimationFrame(function() { self.draw() });

	now = Date.now();
    delta = now - then;
    this.writeTicks += delta;
    document.getElementById("fps").innerHTML = Math.round(1000 / delta) + " FPS";
	if (delta > interval) {
		then = now - (delta % interval);
	    this.waitTime -= delta;
	    if(this.waitTime <= 0) {
	    	this.waitTime = 0;
			self.drawContext.clearRect(0, 0, self.canvas.width, self.canvas.height);
			
			this.elements.sort(function(a, b) {
				return a.properties.z - b.properties.z;
			});
			
			if(this.currentLinePosition < this.currentLine.length && this.writeTicks > this.scrollSpeed) { 
				this.drawNextCharacter();
				this.writeTicks = 0;
			}
			for(var i = 0; i < this.elements.length; i++) {
				if(this.elements[i].properties.visible) this.elements[i].draw(self.drawContext);
			}
		}
	}
}

//FPS setters
var fps = 60;
var now;
var then = Date.now();
var interval = 1000/fps;
var delta;

Plume.prototype.error = function(error, lineNumber, file) {
	if(lineNumber !== undefined) {
		console.error((file ? file + " - " : "") + "Plume error on line " + lineNumber + ": " + error);
		document.getElementById('console').innerHTML = document.getElementById('console').innerHTML + "<font color='#990000'>Error on line " + lineNumber + ": " + error + "</font><br>";
	} else {
		console.error("Plume: " + error);
		document.getElementById('console').innerHTML = document.getElementById('console').innerHTML + "<font color='#990000'>Error: " + error + "</font><br>";
	}
}

Plume.prototype.debug = function(line) {
	if(typeof line === "string" && line.trim().length === 0) return;
	console.log(line);
	document.getElementById('console').innerHTML = document.getElementById('console').innerHTML + "<font color='#009900'>" + line + "</font><br>";
	document.getElementById('console').scrollTop = document.getElementById('console').scrollHeight;

}

Plume.prototype.print = function(line) {
	console.log(line);
	document.getElementById('console').innerHTML = document.getElementById('console').innerHTML + line + "<br>";
}

var plume = new Plume();

if(plume.loadProject("test1.plume")) plume.start();
