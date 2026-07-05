const express=require('express');
const http=require('http');
const {Server} = require('socket.io');
const path=require('path');
const {v4:uuidv4}=require('uuid');
const {spawn} = require('child_process');
const app=express();
const server=http.createServer(app);
const io=new Server(server);
const rooms ={};
const {transform} = require('./ot');
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
function randomName(){
    const names= ['Fox', 'Owl', 'Bear', 'Wolf', 'Hawk', 'Deer'];
    return names[Math.floor(Math.random()*names.length)] + Math.floor(Math.random()*100);
}
app.use(express.static(path.join(__dirname,'../public')));

function applyOperation(code,operation){
    const {position,text,length}=operation;

    const before = code.slice(0,position);
    const after = code.slice(position+length);

    return before + text + after;
}

io.on('connection',(socket)=>{
    console.log('A user connected: ',socket.id);

    socket.on('create-room',()=>{
        const roomId=uuidv4();
        rooms[roomId]={
            users:{},// initially it added socket 
            code:'',
            history:[],
            version:0
        };// and we also joined the socket to the room
        socket.emit('room-created',roomId);
        console.log(`Room created: ${roomId}`);
    });

    socket.on('check-room',(roomId,callback)=>{
        callback(rooms[roomId]!==undefined);
    });


    socket.on('join-room',(roomId)=>{
        if(!rooms[roomId]){
            socket.emit('error','Room does not exist');
            return;
        }
        const room = rooms[roomId];
        const colorIndex=Object.keys(room.users).length % COLORS.length;
        room.users[socket.id]={
            name:randomName(),
            color:COLORS[colorIndex]
        };
        socket.join(roomId);
        socket.emit('room-joined',{
            roomId:roomId,
            self:room.users[socket.id],
            users:room.users,
            code: room.code,
            version: room.version
        });
        console.log(`${socket.id} joined : ${roomId}`);
    });
    socket.on('cursor-move',({roomId,position})=>{
        const room=rooms[roomId];
        if(!room) return;
        socket.to(roomId).emit('cursor-update',{
            socketId:socket.id,
            position:position,
            name:room.users[socket.id].name,
            color:room.users[socket.id].color
        });
    })
    socket.on('operation',({roomId,operation,version})=>{
       const room = rooms[roomId];
       if(!room) return ;

       // transform the incoming operation against every operation it hasn't seen
       let transformedOperation = operation;
       for(let i=version;i<room.history.length;i++){
        transformedOperation = transform(transformedOperation,room.history[i]);
       }

       // apply the transformed operation to the room's code
       room.code = applyOperation(room.code,transformedOperation);
       // store it in history and increment the version
       room.history.push(transformedOperation);
        room.version++;

       // telling sender its operation's version
       socket.emit('ack',{version : room.version});
       
        // broadcast the transformed operation+new version to everyone else
        socket.to(roomId).emit('operation',{
            operation : transformedOperation,
            version : room.version
        });
    });


    socket.on('disconnect',()=>{
        console.log('A user disconnected: ',socket.id);
        for(const roomId in rooms){
            const room=rooms[roomId];
            
            if(room.users[socket.id]){
                delete room.users[socket.id];
                socket.to(roomId).emit('cursor-remove',socket.id);
                if(Object.keys(room.users).length===0){
                    delete rooms[roomId];
                    console.log(`Room deleted : ${roomId}`);
                }
            }
        }
    });

    socket.on('execute-code', ({ code }, callback) => {
        console.log('EXECUTE REQUEST RECEIVED, code length:', code.length);
        const fs = require('fs');
        const os = require('os');
        const tmpFile = path.join(os.tmpdir(), `collabcode-${socket.id}-${Date.now()}.js`);

        fs.writeFileSync(tmpFile, code);

        const child = spawn('node', [tmpFile], { timeout: 3000 });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        child.on('close', (exitCode) => {
            console.log('CHILD CLOSED, exitCode:', exitCode);
            fs.unlink(tmpFile, () => {});

            let output = stdout + stderr;

            const MAX_OUTPUT = 10000;   // ~10KB cap
            if (output.length > MAX_OUTPUT) {
                output = output.slice(0, MAX_OUTPUT) + '\n...[output truncated]';
            }

            if (exitCode === null) {
                output += '\n[Process killed: 5 second time limit exceeded]';
            }
            callback({ output: output || 'No output' });
        });

        child.on('error', (err) => {
            fs.unlink(tmpFile, () => {});
            callback({ output: 'Execution error: ' + err.message });
        });
  });
});

const PORT = process.env.PORT || 3000; 

server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});