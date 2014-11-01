//#include ::
//#if not foo
alert(4);
//#endif
//#label bar
alert(5);
//#endlabel
//#include test-1.js
alert(2);
//#if foo
alert(3);
//#endif
//#if not foo
alert(4);
//#endif
//#label car
alert(6);
//#endlabel
