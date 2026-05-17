const express=require('express');
const http=require('http');
const {Server} = require('socket.io');
const path=require('path');
const {v4:uuidv4}=require('uuid');
const app=express();
const server=http.createServer(app);
const io=new Server(server);
const rooms ={};
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
            users:[],// initially it added socket 
            code:''
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
        rooms[roomId].users.push(socket.id);
        socket.join(roomId);
        socket.emit('room-joined',roomId);
        console.log(`${socket.id} joined : ${roomId}`);
    });

    socket.on('operation',({roomId,operation})=>{
        if(!rooms[roomId])return;
        
        rooms[roomId].code=applyOperation(rooms[roomId].code,operation);
        
        socket.to(roomId).emit('operation',operation);
    });


    socket.on('disconnect',()=>{
        console.log('A user disconnected: ',socket.id);
        for(const roomId in rooms){
            const room=rooms[roomId];
            const index=room.users.indexOf(socket.id);
            if(index!==-1){
                room.users.splice(index,1);

                if(room.users.length===0){
                    delete rooms[roomId];
                    console.log(`Room deleted : ${roomId}`);
                }
            }
        }
    });
});

const PORT=3000;

server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});