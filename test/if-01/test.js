//#set a
//#if a
alert('a');
//#end if

//#unless a
alert('not a');
//#end unless

alert('-');

//#unset a
//#if a
alert('a');
//#end if

//#unless a
alert('not a');
//#end unless

//#set bar 12
//#if bar 12
alert('a 12');
//#end if
//#if bar 13
alert('a 13');
//#end if
//#unless bar 13
alert('not a 13');
//#end unless
