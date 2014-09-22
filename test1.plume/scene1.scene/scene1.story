[[start]]
May: This is the<color: rgb(0, 150, 0)> starting point of the story.<br><wait: 1000><color: rgb(0,0,0)>A script will be run now.<runScript: test2(""Hello there"", 23)><scrollSpeed: 700>...

Bill: My dialog is second.

{"Which option should I pick?", start: "Back to start", part2: "Go to part 2"}

[[part2]]
<runScript: test!>
Bill: This is a new block.
<to: start>
