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

// ----------- START OF CLASS DEFINITIONS ----------- 

function UIElement(id) {
	this.class = "UIElement";
	this.id = id;
	this.boundingBox = null;
	this.parent = null;
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
	
	this.setProperty = function(key, value) {
		this.properties[key] = value;
	}
	
	this.hasEvents = function() {
		return Object.size(this.events) > 0;
	}
	
	this.recalculateBoundingBox = function() {
		var ctx = Plume.prototype.instance.drawContext;
		var basePos = this.getParentBasePosition();
		this.boundingBox = {
			x1: basePos.x + this.properties.x,
			y1: basePos.y + this.properties.y - 14,
			x2: basePos.x + this.properties.x + ctx.measureText(this.id).width,
			y2: basePos.y + this.properties.y
		}
	}
	
	this.getParentBasePosition = function() {
		var x = 0;
		var y = 0;
		var parent = this.parent;
		while(parent) {
			x += parent.properties.x;
			y += parent.properties.y;
			parent = parent.parent;
		}
		return {x: x, y: y};
	}
}

function UIString(id) {
	var base = new UIElement(id);
	base.class = "UIString";
	var dx = 0, dy = 0;
	base.draw = function(ctx) {
		dx = this.getProperty("x"), dy = this.getProperty("y");
		ctx.font = this.getProperty("font") || "14px Helvetica";
		ctx.fillStyle = this.getProperty("color");
		//Draw character by character, applying line formatting.
		var line = this.properties.value;
		for(var i = 0; i < line.length; i++) {
			var nextChar = line.substring(i, i + 1);
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
	
	base.recalculateBoundingBox = function() {	
		var ctx = Plume.prototype.instance.drawContext;	
		var basePos = this.getParentBasePosition();
		ctx.font = this.getProperty("font") || "14px Helvetica"
		//Get the font size
		var fontSize = new RegExp("([0-9]+)[Pp][Xx]").exec(ctx.font)[1];
		this.boundingBox =  {
			x1: basePos.x + this.properties.x,
			y1: basePos.y + this.properties.y - fontSize,
			x2: basePos.x + this.properties.x + dx,
			y2: basePos.y + dy
		}
	}
	
	return base;
}

function UIRect(id) {
	var base = new UIElement(id);
	base.class = "UIRect";
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
	
	base.recalculateBoundingBox = function() {
		var basePos = this.getParentBasePosition();
		this.boundingBox =  {
			x1: basePos.x + this.properties.x,
			y1: basePos.y + this.properties.y,
			x2: basePos.x + this.properties.x + parseInt(this.properties.width, 10),
			y2: basePos.y + this.properties.y + parseInt(this.properties.height, 10)
		}
	}
	return base;
}

function UIImage(id) {
	var base = new UIElement(id);
	base.class = "UIImage";
	var img = document.getElementById("plume_image_" + this.getProperty("image"));
	this.width = img.width;
	this.height = img.height;
	
	base.draw = function(ctx) {
		var img = document.getElementById("plume_image_" + this.getProperty("image"));
		ctx.drawImage(img, this.getProperty("x"), this.getProperty("y"));
	}
	
	base.recalculateBoundingBox = function() {
		var basePos = this.getParentBasePosition();
		this.boundingBox =  {
			x1: basePos.x + this.properties.x,
			y1: basePos.y + this.properties.y,
			x2: basePos.x + this.properties.x + this.width,
			y2: basePos.y + this.properties.y + this.height
		}
	}
	return base;
}

function UIGroup(data) {
	var base = new UIElement(data.id);
	base.class = "UIGroup";
	var elems = [];
	var minX = 0, minY = 0, maxX = 0, maxY = 0;

	for(i = 0; i < data.children.length; i++) {
		var newElem = Plume.prototype.processElementFromDefinition(data.children[i]);
		elems.push(newElem);
		newElem.parent = base;
		Plume.prototype.instance.elementLookupTable.push(newElem);
	}
	
	base.draw = function(ctx) {
		elems.sort(function(a, b) {
			return a.properties.z - b.properties.z;
		});
		ctx.save();
		ctx.translate(this.getProperty('x'), this.getProperty('y'));
		for(var i = 0; i < elems.length; i++) {
			var elem = elems[i];
			ctx.save();
			if(elem.properties.visible) Plume.prototype.instance.drawSpecificElement(ctx, elem);
			ctx.restore();
		}
		ctx.restore();
	}
	
	base.recalculateBoundingBox = function() {
		var basePos = this.getParentBasePosition();
		minX = this.properties.x, minY = this.properties.y, maxX = -99999, maxY = -99999
		for(var i = 0; i < elems.length; i++) {
			var elem = elems[i];
			var box = elem.boundingBox;
			if(box !== null) {
				if(box.x2 > maxX) maxX = box.x2;
				if(box.y2 > maxY) maxY = box.y2;
				if(box.x1 < minX) minX = box.x1;
				if(box.y1 < minY) minY = box.y1;
			}
		}
		this.boundingBox = {
			x1: minX,
			y1: minY,
			x2: maxX,
			y2: maxY
		}
	}
	return base;
}

// ----------- END OF CLASS DEFINITIONS ----------- 


//Variables
Plume.prototype.elements = [];
Plume.prototype.elementLookupTable = [];
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
		var newItem = this.processElementFromDefinition(elem);
		this.elements.push(newItem);
		this.elementLookupTable.push(newItem);
	}
	//Search for main_text_display
	var doesMainDisplayExist = false, doesMainOptionDisplayExist = false;
	for(var i = 0; i < this.elementLookupTable.length; i++) {
		if(this.elementLookupTable[i].id === "main_text_display") {
			doesMainDisplayExist = true;
			this.mainDisplay = this.elementLookupTable[i];
		}
		if(this.elementLookupTable[i].id === "main_option_display") {
			doesMainOptionDisplayExist = true;
			this.mainOptionDisplay = this.elementLookupTable[i];
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
		mainDisplay.events = {};
		this.elements.push(mainDisplay);
		this.elementLookupTable.push(mainDisplay);
		this.mainDisplay = mainDisplay;
	}
	
	if(!doesMainOptionDisplayExist) {
		var canvas = document.getElementById('plumeCanvas');
		var elementList = [];
		for(var i = 0; i < 4; i++) {
			var newOption = new UIString('main_option_display_selection_' + (3 - i));
			newOption.properties = {
				"x": 0,
				"y": -40*i,
				"z": 0,
				"visible": true,
				"color": "rgb(0,0,0)",
				"value": "Option " + (3 - i)
			}
			newOption.events = {};
			elementList.push(newOption);
		}
		var mainText = new UIString('main_option_display_dialog');
		mainText.properties = {
			"x": 0,
			"y": -160,
			"z": 0,
			"visible": true,
			"color": "rgb(0,0,0)",
			"value": "Dialog"
		}
		mainText.events = {};
		elementList.push(mainText);
		var data = {
			"id": "main_option_display",
			"properties": {
				"x": 50,
				"y": canvas.height - 50,
				"z": 15,
				"visible": false
			},
			"children": elementList
		}
		var mainGroup = new UIGroup(data);
		mainGroup.properties = data.properties;
		this.elements.push(mainGroup);
		this.elementLookupTable.push(mainGroup);
		this.mainOptionDisplay = mainGroup;
	}
}

Plume.prototype.processElementFromDefinition = function(elem) {
	var newItem;
	switch(elem.class) {
		case "UIElement": 	newItem = new UIElement(elem.id); break;
		case "UIString":	newItem = new UIString(elem.id); break;
		case "UIRect":		newItem = new UIRect(elem.id); break;
		case "UIImage":		newItem = new UIImage(elem.id); break;
		case "UIGroup":		newItem = new UIGroup(elem); break;
	}
	newItem.properties = elem.properties;
	newItem.events = this.processElementEvents(elem.events);
	return newItem;
}

Plume.prototype.processElementEvents = function(events) {
	var self = this;
	var out = {};
	for(var event in events) {
		out[event] = typeof events[event] === "string" ? (function() { 
			var eventName = events[event]; 
			return function() { self.runScriptMethod(eventName); }
		})() : events[event];
	}
	return out;
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
	
	//Register events
	
	document.onclick = function(ev) {
		var mx = ev.pageX;
		var my = ev.pageY;
		var elem = self.getElementAtPosition(mx, my);
		if(elem && elem.events.onClick) elem.events.onClick(ev);
	}

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
	var self = this;
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
	
	this.lookupElementById('main_option_display').properties.visible = false;
	this.lookupElementById('main_text_display').properties.visible = true;
	
	var list = this.activeBlock.dialogList;
	var line = list[this.blockLine++];
	if(line instanceof DialogOption) {
		//Display a dialog option
		this.print(line.text);
		for(var i = 0; i < 4; i++) {
			var option = line.options[i];
			if(option) {
				var elem = this.lookupElementById('main_option_display_selection_' + i)
				elem.properties.visible = true;
				elem.setProperty("value", option.text);
				elem.events.onClick = (function() {
					var currOption = option;
					return function() { 
						self.goToBlock(currOption.block);
					}
				})();
			} else {
				this.lookupElementById('main_option_display_selection_' + i).properties.visible = false;

			}
		}
		this.lookupElementById('main_option_display_dialog').setProperty("value", line.text);
		this.lookupElementById('main_option_display').properties.visible = true;
		this.lookupElementById('main_text_display').properties.visible = false;
		
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
		this.mainDisplay.setProperty("value", line.character + ": ");
		this.writeTicks = 0;
	}
}

Plume.prototype.lookupElementById = function(id) {
	for(var i = 0; i < this.elementLookupTable.length; i++) {
	    if(this.elementLookupTable[i].id === id) return this.elementLookupTable[i];
	}
	return null;
}

Plume.prototype.finishLine = function() {
	//Skip the typewriter effect if there's still text to display, otherwise move on to the next line.
	if(this.currentLinePosition < this.currentLine.length) {
		while(this.currentLinePosition < this.currentLine.length) {
			this.drawNextCharacter(true);
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

Plume.prototype.getElementAtPosition = function(x, y) {
	var self = this;
	var elems = this.elementLookupTable.slice(0);
	elems = elems.sort(function(a, b) {
		return self.getElementTotalZIndex(b) - self.getElementTotalZIndex(a);
	})
	for(var i = 0; i < elems.length; i++) {
		var elem = elems[i];
		if(elem.boundingBox && elem.properties.visible) {
			var box = elem.boundingBox;
			if(box.x1 <= x && box.x2 >= x && box.y1 <= y && box.y2 >= y && elem.hasEvents()) return elem;
		}
	}
	return null;
}

Plume.prototype.getElementTotalZIndex = function(elem) {
	var z = elem.properties.z;
	var parent = elem.parent;
	while(parent) {
		z += parent.properties.z;
		parent = parent.parent;
	}
	return z;
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
    } catch(e) {
       console.log(e.toString())
    }
}

Plume.prototype.runScriptMethod = function(method, args) {
	if(args === undefined) {
		//Have to use the instance or else the activeScene might not be set in the saved event environment
		Sk.misceval.callsim(Plume.prototype.instance.activeScene.scriptModule.tp$getattr(method)); 	
	} else {
		args.unshift(Plume.prototype.instance.activeScene.scriptModule.tp$getattr(method));
		for(var i = 1; i < args.length; i++) args[i] = Sk.builtin.str(args[i]);
		Sk.misceval["callsim"].apply(this, args);
	}
}

Plume.prototype.processTag = function(line, ignoreWait) {
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
			if(ignoreWait !== undefined && !ignoreWait) this.waitTime = parseInt(value, 10);
	}
	return line;
}

Plume.prototype.drawNextCharacter = function(ignoreWait) {
	var nextChar = this.currentLine.substring(this.currentLinePosition, this.currentLinePosition + 1);
	if(nextChar === "<" && this.currentLine.substring(this.currentLinePosition - 1, this.currentLinePosition) !== "\\") {
		//Start of a tag.
		var endTagPosition = this.currentLine.substring(this.currentLinePosition, this.currentLine.length).search(/[^\\]>/);
		if(endTagPosition !== -1) {
			endTagPosition += 2; //Right after the tag.
			var tag = this.processTag(this.currentLine.substring(this.currentLinePosition, this.currentLinePosition + endTagPosition), ignoreWait);
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
    if(document.getElementById("fps")) document.getElementById("fps").innerHTML = Math.round(1000 / delta) + " FPS";
	if (delta > interval) {
		frameCount++;
		then = now - (delta % interval);
	    this.waitTime -= delta;
	    if(frameCount % 15 === 0) this.recalculateBoundingBoxes();
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
				this.drawSpecificElement(self.drawContext, this.elements[i])
			}
		}
	}
}

Plume.prototype.drawSpecificElement = function(context, element) {
	if(element.properties.visible) {
		element.draw(context);
		if(element.properties.debug && element.boundingBox) {
			var box = element.boundingBox;
			context.setTransform(1, 0, 0, 1, 0, 0); //Reset transformations
			context.beginPath();
			context.rect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
			context.stroke();
			context.closePath();
		}	
	}
}

Plume.prototype.recalculateBoundingBoxes = function() {
	var elems = this.elementLookupTable.slice(0);
	elems.sort(function(a, b) {
		return a.class === "UIGroup" ? 1 : -1
	});
	for(i = 0; i < elems.length; i++) elems[i].recalculateBoundingBox();
}

//FPS setters
var fps = 60;
var now;
var then = Date.now();
var interval = 1000/fps;
var delta;
var frameCount = 0;

Plume.prototype.error = function(error, lineNumber, file) {
	if(lineNumber !== undefined) {
		console.error((file ? file + " - " : "") + "Plume error on line " + lineNumber + ": " + error);
		console.error("Plume: " + error);
		if(document.getElementById('console')) document.getElementById('console').innerHTML = document.getElementById('console').innerHTML + "<font color='#990000'>Error on line " + lineNumber + ": " + error + "</font><br>";
	} else {
		if(document.getElementById('console')) document.getElementById('console').innerHTML = document.getElementById('console').innerHTML + "<font color='#990000'>Error: " + error + "</font><br>";
	}
}

Plume.prototype.debug = function(line) {
	if(typeof line === "string" && line.trim().length === 0) return;
	console.log(line);
	if(document.getElementById('console')) {
		document.getElementById('console').innerHTML = document.getElementById('console').innerHTML + "<font color='#009900'>" + line + "</font><br>";
		document.getElementById('console').scrollTop = document.getElementById('console').scrollHeight;
	}

}

Plume.prototype.print = function(line) {
	console.log(line);
	if(document.getElementById('console')) 
		document.getElementById('console').innerHTML = document.getElementById('console').innerHTML + line + "<br>";
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var plume = new Plume();

if(plume.loadProject("test1.plume")) plume.start();
