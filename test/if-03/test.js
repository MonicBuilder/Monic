//#set ie {7: true, 8: true}
//#if ie has 7
alert('ie has 7 from {}');
//#end if

//#set ie [7, 8]
//#if ie has 8
alert('ie has 8 from []');
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
