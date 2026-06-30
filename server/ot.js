// An operation is always one of these
// insert : {position: N ,text"...",length: 0}
// delete : {position: N ,text:"",length: M}
// replace divided into delete + insert before reaching here

function isInsert(op){
    return op.length === 0;
}
// opB happened already
function transformInsertInsert(opA, opB){
    if(opB.position <= opA.position){
        return {
            position : opA.position + opB.text.length,
            text : opA.text,
            length : 0
        };
    }
    // opB inserted after opA's position , so no change
    return opA;
}

function transformInsertDelete(opA, opB){
    const bStart=opB.position;
    const bEnd=opB.position + opB.length;

    if(bEnd <= opA.position){
        // opA is entirely after the deletion -> shift left
        return {
            position : opA.position-opB.length,
            text : opA.text,
            length : 0
        };
    }
    
    if(bStart < opA.position){
        //opA is inside deleted region -> move to deletion start
        return {
            position : bStart,
            text : opA.text,
            length : 0
        };
    }
    
    // opA is before deletion -> no change
    return opA;

}

function transformDeleteInsert(opA, opB){
    if(opB.position <= opA.position){
        // insert happened at/before delete start -> shift delete to right
        return {
            position : opA.position + opB.text.length,
            text : "",
            length: opA.length
        };
    }
    //insert happened after delete range 
    return opA;
}

function transformDeleteDelete(opA, opB){
    const aStart=opA.position;
    const aEnd=opA.position + opA.length;
    const bStart=opB.position;
    const bEnd=opB.position + opB.length;

    // opA is entirely before opB -> no change
    if(aEnd <= bStart){
        return opA;
    }

    if(bEnd <= aStart){
        // opA is entirely after opB -> shift left
        return {
            position : aStart-opB.length,
            text :"",
            length : opA.length
        };
    }

    //opA and opB overlap
    
    // opB fully contains opA
    if(bStart <= aStart && aEnd <= bEnd){
        return {
            position : bStart,
            text : "",
            length : 0
        };
    }
    // opA fully contains opB
    if(aStart <= bStart && bEnd <= aEnd){
        return {
            position : aStart,
            text : "",
            length : opA.length - opB.length
        };
    }
    // partial overlap , opB starts first
    if(bStart <= aStart){
        const overlap = bEnd - aStart;
        return {
            position : bStart,
            text : "",
            length : opA.length - overlap
        };
    }

    // partial overlap , opA starts first
    const overlap = aEnd - bStart;
    return {
        position : aStart,
        text :"",
        length : opA.length - overlap
    };
}


function transform(opA, opB){
    const aIns=isInsert(opA);
    const bIns=isInsert(opB);

    if(aIns && bIns){
        return transformInsertInsert(opA, opB);
    }
    if(aIns && !bIns){
        return transformInsertDelete(opA, opB);
    }
    if(!aIns && bIns){
        return transformDeleteInsert(opA, opB);
    }
    return transformDeleteDelete(opA, opB);
}

module.exports = { transform  };