//#set ie.9
//#if ie has 9
alert('ie has 9 from deep {}');
//#end if

//#set ie {7: true, 8: true}
//#if ie has 7
alert('ie has 7 from {}');
//#end if

//#set ie.10 compat
//#if ie.10 = compat
alert('ie has 10 from modified {} with custom value');
//#end if

//#set ie [7, 8]
//#if ie has 8
alert('ie has 8 from []');
//#end if

//#set ie. 9
//#if ie has 9
alert('ie has 9 from modified []');
//#end if

//#set ie /[78]/
//#if ie like 7
alert('ie has 7 from RegExp');
//#end if

//#set ie function (o) { return o.value === 7; }
//#if ie call 7
alert('ie as function');
//#end if

//#set isIe true
//#set ie function (o) { return o.flags.isIe; }
//#if ie
alert('ie as function 2');
//#end if

//#if ie callRight function (o) { return typeof o.value === 'function'; }
alert('ie as function rightCall');
//#end if

//#if ie instanceof (Function)
alert('instanceof');
//#end if

//#if ie typeof function
alert('typeof');
//#end if
