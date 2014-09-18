[[start]]
Sonic the Hedgehog: You are<color: rgb(0, 150, 0)> too slow.<br><wait: 1000><color: rgb(0,0,0)>And that's no good<runScript: test2("A comma, in the string?", 23)><scrollSpeed: 700>...

Bill: My dialog is second.

{"Which option should I pick?", start: "Back to start", part2: "Go to part 2"}

[[part2]]
<runScript: test!>
Bill: This is a new block.
<to: start>
