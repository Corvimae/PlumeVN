Plume
=====

An in-browser visual novel engine written in Javascript.

Setting Up Plume
----
Include the plume.js, skulpt.min.js, and skulpt-stdlib.js files in your webpage.

    <script src="js/skulpt.min.js"></script>
    <script src="js/skulpt-stdlib.js"></script>
    <script src="js/plume.js"></script>

Plume uses a canvas element to display content. This content needs the id `plumeCanvas`. If no `plumeCanvas` element is found, Plume will fail with an error.

If you would like to see debug output, create a div with the id `console`. Similarly, creating a div with the id `fps` will display the frames-per-second.

Elements of a Plume File
----
A .plume file is nothing more than a folder containing any number of .scene folders, as well as a configuration file. No specific editor is needed to create a Plume file as long as the format is correct.

###Scenes
Within the root level of the plume file you can place as many .scene files as you which, which are simply a directy containing a `.story` Story file, a `.interface` Interface file, a `.py` script file, and a `.config` configuration file. You may also make a directy titled `assets`,  which contains any image files you wish to use in your story.

###Stories
A story file contains the dialog that makes up most of the novel's content. A story is divided up into **blocks**, which you can think of as anchor points for the story. A block can contain as few or as many lines of dialog as you want, and blocks are the only points in the story that can be directly jumped to.

####Format
A story file is defined in `[myNovel].plume/[myScene].scene/[myScene].story`. Note that the name of the story  must match the name of the scene. 

#####Defining a block

A block can be created using the format `[[blockName]]`. If two blocks have the same name, the later one will overwrite the earlier one. There must be a `[[start]]` block somewhere in the story, or else Plume will not know where to begin.

#####Adding Dialog

Within your block, dialog can be written as if it were a screenplay, in the format
_actor_: _line_. For example, if the character May wanted to say "Hello, world!", the story file might look like this:

```
[[start]]
May: Hello, world!
```

#####Inline Tags

Plume has a variety of modifiers that can be written in a line of dialog which change the way Plume processes the line. Most tags follow the format `<key:value>`, but some tags that do not take values look like `<key>`. Unlike other tag-based markup languages, Plume tags do not need to be closed. The effect of the tag applies until another rule overrides it.

Tag | Format | Arguments | Example
----|--------|-----------|---------
br | &lt;br> | -- | First line&lt;br>Second Line
color | &lt;color: code>|"rgb(int, int int)"|&lt;color: rgb(255,0,0)>This text is red.
scrollSpeed | &lt;scrollSpeed: rate> | milliseconds | &lt;scrollSpeed: 500>Dot dot dot.
runScript | &lt;runScript: method> | method name | &lt;runScript:shakeScreen>Whoaaaa
to | &lt;to: blockName> | block name | Now back to the start. &lt;to: start>
wait | &lt;wait: delay> | milliseconds | Hold on.&lt;wait: 3000> Got it!
apply<sup>1</sup> | &lt; apply: anim, elem> | animation id, element id | &lt; apply: myFirstAnim, myElem>
<br>

Note: A runScript tag may provide arguments if the function would take them, such as `<runScript: setColor(0, 255, 0)>`. A function that takes no arguments does not need to have parentheses after it, but adding them will not cause any issues.

If the function specified in an out-of-line action tag is preceeded by an exclaimation point, such as `<!runScript: displayNumber(3)>`, Plume will immediately process the line after it as soon as it can. Otherwise, Plume will wait for the user to press Space.

<sup>1</sup> An easy way to remember the order for the `apply` tag is _animation applies to element_

#####Command Tags

Some tags can be used outside of a line of dialog. These tags will run when they are stepped to; that is, when the user finishes reading the line before it, the command tag will fire. 

Currently, the `runScript` tag and the `to` tag are the only tags that may be used as commands. We reccomend using the `to` tag only as a command, as the inline version will fire as soon as it is reached, regardless of how much the user has read.

#####Decisions

An important aspect of any interactive novel is the interaction itself. In Plume, this is achieved through a decision line. A decision line can be defined with the format `{header, block: string, block: string...}`. The user will be presented with a list of options, and Plume will proceed to the block assigned to the selection they choose.

For example, if at the end of a tutorial we wanted to make sure the user understood everything, we could use the following line:

```
{"Do you need me to go over it again?", startOfTutorial: "Yes", moveOn: "No"}
```
If the user selects "Yes", Plume will return to the startOfTutorial block and display the whole thing again. If they select "No", Plume will proceed to the moveOn block.

A user-specified decisions UIElement can be defined in the interface by creating a UIGroup with the id `main_option_display`, unless the configuration key `mainOptionDisplay` is set. This UIGroup should contain five UIString items with the ids `[prefix]_selection_0`, `[prefix]_selection_1`, `[prefix]_selection_2`, `[prefix]_selection_3`, and `[prefix]_dialog`. By default, these will be `main_option_display_selection_0`, and so forth.

Similarly, a UIGroup with the id `main_text_display` can be set to customize the appearance of the standard dialog box. This group should contain a UIString with the id `main_text_display_text`, which holds the current line of dialog, and an element called `main_text_display_continue`, which is an icon that displays when the user can press Space to continue. If no `main_text_display` is defined, one will be created automatically, and it will include an additional UIRoundedRect with the name `main_text_display_autogen_bg`.

The decisions interface uses a UIElement set by the configuration key `mainOptionCursor` (defaulting to `main_option_cursor`) to designate which option the user has selected. If no valid object is supplied in the interface file, one will be created automatically. You may use any UIElement as your cursor.

#####Formatting Tips

Plume doesn't care about whitespace, so you can leave as many empty lines between dialog, commands, and decisions as you like.

###Interfaces
An interface is a JSON formatted file which contains definitions for all the visual elements that might appear in the scene, as well as a list of any image files that the author wishes to be precached at the load time. An interface file is defined in `[myNovel].plume/[myScene].scene/[myScene].interface`. 

The general structure of an Interface file is as follows:

```
{
    "assets": [],
    "elements": [],
    "animations": []
}
```

An asset represents a media element that Plume should precache at startup. It is a JSON object containing the following fields:
- name: A unique identifier for the asset
- type: The type of asset. Currently, only `image` will be accepted.
- src: The filename of the image. Do not include `assets/`.

An element represents something that should be drawn to the canvas. It is a JSON object containing the following fields:
- id: A unique identifier for the element
- class: The type of element that this definition represents. Depending on the class, some properties may need to be specified.
- propeties: A JSON object of key: value pairs that tell Plume how to display the element.
- events: A JSON object of key: value pairs that define Python functions to call on certain triggers.

The following elements exist in the latest version of Plume:

####UIElement

The basic element that all other elements inherit. It displays it's ID as a string. UIElement should not be used.

**Properties**

x: The x-coordinate of the element<br>
y: The y-coordinate of the element<br>
z: The z-index of the element<br>
visible: Whether or not the element should be drawn<br>
opacity: The alpha value for the element<br>
debug: Whether or not to draw debugging information

####UIRect

Represents a basic rectangle. Extends UIElement.

**Properties**

width: The width of the rectangle<br>
height: The height of the rectangle<br>
fillColor: The background color of the rectangle.<br>
strokeColor: The border color of the rectangle.
####UIRoundedRect

Represents a rectangle with rounded corners. Extends UIRect.

**Properties**
radius: The radius of the edge rounding.

####UIEllipse

Represents a basic ellipse, centered at (x, y). Extends UIElement. 

**Properties**

xRadius: The distance from the center to the left and right-most points on the ellipse.<br>
yRadius: The distance from the center to the top and bottom-most points on the ellipse.<br>
fillColor: The background color of the ellipse.<br>
strokeColor: The border color of the ellipse.

####UIString

Represents a piece of text. Extends UIElement.

**Properties**

color: The color of the text<br>
font: The font the text is drawn in. Must be in a format accepted by Canvas, such as `
"14px Helvetica"`<br>
value: The text to be drawn.

####UIImage

Represents a static image. Extends UIElement. 

**Properties**

image: The name of the asset that should be used. Should not contain any file type extensions.

####UIPoly

Represents a shape drawn from a collection of poitns. Extends UIElement.

**Properties**

points: An array of points in the format [x0, y0, x1, y1 ..., xn, yn]. The points array is converted into a new array of ordered pairs when the UIPoly is created, so new points cannot be added by appending to the end of the points property.<br>
fillColor: The background color of the polygon<br>
strokeColor: The border color of the polygon

####UIGroup

Represents a grouping of object. Children of the group have their x, y, and z values calculated relative to the x, y, and z of their parent UIGroup.

UIGroup has a special array called "children" in it's root level, which can contain any number of UIElements. 

A UIGroup can have click events attached to it. If you want one of your UIGroup's elements to have higher click priority than the UIGroup itself, set it's z property higher than 0.

A UIGroup might look something like:
```
{
	"class": "UIGroup",
	"id":	"test_group",
	"properties": {
		"x": 50,
		"y": 50,
		"z": 3,
		"visible": true,
	},
	"events": {},
	"children: [
		{
			"class":	"UIString"
			...
		},
		{
			"class": "UIImage"
			...
		}	
	]
}
```

####Events
Events can be added in any UIElement's event object. They are defined in the formation `"eventName": "pythonMethod"`.

The following events can be triggered in the current version of Plume. Event names are always case sensitive.

**onClick**: Triggers when the UIElement is clicked on with the cursor.

####Transformations
Each UIElement can have an array of strings titled `transformations` which Plume interpret as a series of 2D transformations to be performed on the element. Each transformation has the format `"action(value)"`, such as `"rotate(45)"`, and the transformations will be run in the order they are specified. All transformations are based at the element's center.

The following transformations can be run in the current version of Plume. Transformation names are not case sensitive, but we reccomend using camel case for easy readability. Transformations cannot be run accurately on UIGroups, but elements within a UIGroup transform correctly.

**rotate**: Rotates the element a specified number of degrees.<br>
**scaleX**: Extends an element outward in both x-directions by a specified multiplier, such that the new total width is [multipler] * the previous width.
**scaleY**: Same as scaleX, except in the y-direction.


####Animations
Animations are defined in the `animations` array of an interface file. They define the final state an element should be in after the animation is completed, as well as various properties of the animation itself. An animation can affect any number of element properties.

Animations have the class `AnimTween`, and requires an ID and properties, just like a UIElement. Additionally, they require an additional array `values`, which is similar to a UIElement `properties` array, except holding the final positions an element should be in after the animation is completed.

Animations do not do anything until they are applied with the `apply` tag.

Currently, position-based properties do not animate correctly if the element is transformed. This is a bug.

**Properties**

duration: How long the animation runs for, in seconds.

An Animation definition might look something like this:
```
{
	"class": "AnimTween",
	"id": "MyFirstAnimation",
	"properties": {
		"duration": 1.0
	},
	"values": {
		"x": 0,
		"y": 0
	}
}
```

####Example .interface File
```
{
	"assets": [
		{
			"name": "myImage",
			"type":	"image",
			"src": 	"myImage.png"
		}
	],
    "elements": [
        {
            "class": "UIImage",
            "id": "test_elem",
            "properties": {
                "x": 240,
                "y": 200,
                "z": 9,
                "visible": true,
                "image": "myImage"
            },
            "events": {},
            "transformations": [
            		"rotate(45)"
            ]
        },
        {
        	"class": "UIRect",
        	"id":	"test_elem_2",
        	"properties": {
        		"x": 0,
        		"y": 0,
        		"z": 0,
        		"width": "1000",
        		"height": "500",
        		"baseColor":	"rgb(225, 225, 255)",
        		"borderColor":	"rgb(90, 0, 0)",
        		"visible": true
        	},
        	"events": {}
        },
        {
        	"class":	"UIString",
        	"id":		"test_elem_3",
        	"properties": {
        		"x": 50,
        		"y": 50,
        		"z": 7,
        		"visible": true,
        		"value": "I am a test string.",
        		"color": "rgb(90, 0, 0)"
        	},
        	"events": {}
        }
    ],
    "animations": [
	    {
			"class": "AnimTween",
			"id": "MyFirstAnimation",
			"properties": {
				"duration": 1.0
			},
			"values": {
				"x": 0,
				"y": 0
			}
		}
	]
}
```
###Scripting
Plume uses the Skulpt library to provide a limited version of Python in which the author can create more advanced functionality. Plume will only accept valid `.py` files. A script file is defined in `[myNovel].plume/[myScene].scene/[scriptFileName].py`. Note that the Python file name does not need to match the scene name, unlike interface and story files.

####Plume Extension
In order to use the Plume Python extension, the plume library must be imported using `import plume`. 

The Plume library provides the following classes and methods.

#####Global
`getElement(id) -> UIElement` - Returns the `UIElement` object with the provided ID.

`getCurrentLine(id) -> String` - Returns the current line of dialog.

#####UIElement

Represents one of the elements being drawn to the canvas.

`getProperty(key) -> (dynamic)` - Returns a specific property from the element, such as visible.

`setProperty(key, value) -> void` - Assigns the specified value to the specified property.

`setPosition(x, y) -> void` - Sets the x and y property of the element.

`hide() -> void` - Sets the visible property to false.

`show() -> void` - Sets the visible property to true.

####Example
```
import plume

print "I will be printed to the debug console at startup."

def myFirstScript():
    plume.getElement('myElement').setPosition(0, 0)
    plume.getElement('myElement').show()
```

###Configuration
Each scene may have a configuration file, which may be defined within `[myNovel].plume/[myScene].scene/[myScene].config`. The following values may be defined within the scene configuration file:

`scriptFile="fileName"` - Defines the script file that this scene uses.

`scrollSpeed=50` - Defines the default speed that the typewriter effect occurs at.

###Global Configuration
A `plume.config` file must be specified in the root directory of the plume file. The following values may be defined within the global configuration file:

`title="Title Name"` - Defines the name of the visual novel

`mainScene="sceneName"` - Tells Plume which scene should be loaded first. Should not include .scene






