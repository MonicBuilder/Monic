//#include ::
//#unless foo
alert(4);
//#end unless
//#label bar
alert(5);
//#end label
//#include test-1.js
alert(2);
//#if foo
alert(3);
//#end if
//#unless foo
alert(4);
//#end unless
//#label car
alert(6);
//#end label
