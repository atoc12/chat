
io.on('connection',(cliente)=>{
    cliente.on('message',(message)=>{
        console.log(message);
        cliente.broadcast.emit("message",message);
    })
    cliente.on("usuario",(user)=>{
        console.log(user);
        cliente.broadcast.emit("usuario",user._id)
    })
})