Plume
=====

A Javascript and Python-based visual novel engine.

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
to | &lt; to: blockName> | block name | Now back to the start. &lt;to: start>
wait | &lt; wait: delay> | milliseconds | Hold on.&lt;wait: 3000> Got it!
<br>

Note: A runScript tag may provide arguments if the function would take them, such as `<runScript: setColor(0, 255, 0)>`. A function that takes no arguments does not need to have parentheses after it, but adding them will not cause any issues.

If the function specified in runScript is proceeded by an exclaimation point, such as `<runScript: displayNumber(3)!>`, Plume will display the next line of dialog as soon as the command is over. Otherwise, Plume will wait for the user to press Space.

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

#####Formatting Tips

Plume doesn't care about whitespace, so you can leave as many empty lines between dialog, commands, and decisions as you like.

###Interfaces
An interface is a JSON formatted file which contains definitions for all the visual elements that might appear in the scene, as well as a list of any image files that the author wishes to be precached at the load time.

The general structure of an Interface file is as follows:

```
{
    "assets": {},
    "elements": {}
}
```


