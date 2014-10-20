import plume

print "This runs on initial startup."
plume.getElement("test_elem_3").setProperty("value", "I am a label!<br>woooo")

print plume.getElement("test_elem_3").getProperty("visible")

testVar = 20

def test():
	print "Test method called."
	global testVar
	testVar += 10
	print "Test var is now " + str(testVar)
	
def test2(data, num):
	total = int(num) + 20
	print data + " The number passed in plus 20 is " + str(total)
	print plume.getCurrentLine() + " :("
	
def groupClickTest():
	print "Clicked!"
	