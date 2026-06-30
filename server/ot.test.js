const { transform } = require('./ot');

let passed = 0, failed = 0;

function check(label, got, expected) {
  const ok = got.position === expected.position &&
             got.text === expected.text &&
             got.length === expected.length;
  if (ok) {
    passed++;
    console.log(`✅ ${label}`);
  } else {
    failed++;
    console.log(`❌ ${label}`);
    console.log(`   expected:`, expected);
    console.log(`   got:     `, got);
  }
}

// Case 1: Insert vs Insert — both at pos 5, opA shifts right by len of opB text
check('InsIns same pos',
  transform({position:5,text:"X",length:0}, {position:5,text:"Y",length:0}),
  {position:6,text:"X",length:0});

// Insert vs Insert — opB after opA → unchanged
check('InsIns B after A',
  transform({position:2,text:"X",length:0}, {position:5,text:"Y",length:0}),
  {position:2,text:"X",length:0});

// Case 2: Insert vs Delete — opA inside deleted region → clamp to bStart
// "hello world", opB del 6 @5, opA ins @8 → pos 5
check('InsDel inside',
  transform({position:8,text:"X",length:0}, {position:5,text:"",length:6}),
  {position:5,text:"X",length:0});

// Case 3: Delete vs Insert — "hello", opB ins "XYZ" @2, opA del 2 @2 → pos 5
check('DelIns shift',
  transform({position:2,text:"",length:2}, {position:2,text:"XYZ",length:0}),
  {position:5,text:"",length:2});

// DelDel Case 1: A before B → unchanged
check('DelDel A before B',
  transform({position:0,text:"",length:2}, {position:4,text:"",length:2}),
  {position:0,text:"",length:2});

// DelDel Case 2: A after B → shift left. "abcdefgh" opB del2@0, opA del2@4 → pos2
check('DelDel A after B',
  transform({position:4,text:"",length:2}, {position:0,text:"",length:2}),
  {position:2,text:"",length:2});

// DelDel Case 3: partial, B first. "abcdefgh" opB del4@2, opA del4@4 → pos2 len2
check('DelDel partial B-first',
  transform({position:4,text:"",length:4}, {position:2,text:"",length:4}),
  {position:2,text:"",length:2});

// DelDel Case 4: partial, A first. "abcdefgh" opB del4@4, opA del4@2 → pos2 len2
check('DelDel partial A-first',
  transform({position:2,text:"",length:4}, {position:4,text:"",length:4}),
  {position:2,text:"",length:2});

// DelDel Case 5: B contains A → length 0
check('DelDel B contains A',
  transform({position:2,text:"",length:3}, {position:1,text:"",length:6}),
  {position:1,text:"",length:0});

// DelDel Case 6: A contains B. opA del6@1, opB del2@3 → pos1 len4
check('DelDel A contains B',
  transform({position:1,text:"",length:6}, {position:3,text:"",length:2}),
  {position:1,text:"",length:4});

console.log(`\n${passed} passed, ${failed} failed`);