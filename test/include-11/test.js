//#set val 1
//#include test-${val}.js
//#set val 2
//#label foo
//#set val 1
//#end label
//#include test-${val}.js
//#set val 3
//#set fn function (o) { return o.flags.val; }
//#include test-${fn}.js
