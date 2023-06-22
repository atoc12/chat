require("../db/conexion.js");
require('dotenv').config();
const cors = require("cors");
const express =require('express');
const bdRouter = require("../db/api.js");
const http = require("http");
const {Server} = require("socket.io");
const { ActualizarUsuario, ObtenerContacto, ObtenerUsuarios, opcionSolicitud, enviarSolicitud } = require("../db/schema/user/usuario.js");
const { AgregarMensaje, ObtenerChat } = require("../db/schema/chat/chat.js");
const path = require("path");
const app = express();
const servidor = http.createServer(app);
// se crea el servidor de socket.io 
const io = new Server(servidor,{    
    cors:{
        origin:'*',
    }
});
//---------------------------------------------------------------Midelwares---------------------------------------------------------
app.use(cors());//politicas del cors, permite el acceso a la api de desistintas url o de una en especifico
app.use(express.json());//convierte los datos recibidos en formato JSON 
app.use("/",bdRouter);// conectá las rutas de la api con el servidor express
//--------------------------------------------------------------Socket--------------------------------------------------------------
//esta area es para el socket.io un framework que trabaja con websockets ,permite crear eventos desde el bakckend

io.on('connection',async (cliente)=>{
    var usuario=null;
    var chatJoin=null;
    cliente.on("user_connect",async (data)=>{
        console.log("user connect");
        usuario = data;
        await ActualizarUsuario({body:{search:{_id:await data._id},update:{conexion:true,socket_id:cliente.id}}})
        let datos =await ObtenerUsuarios({body:{search:{_id:await data._id}}},null,true);
        usuario=datos[0];
        cliente.emit("solicitudList",datos[0].solicitud);
        cliente.emit('contactos',datos[0].contactos)
    })


    cliente.on("sendMessage",async (message,room)=>{
        let msj ={
            content:message,
            sender:usuario._id,
            name:usuario.name
        }
        console.log(room);
        await AgregarMensaje(null,room,msj)
        io.to(room).emit("recive-message",msj);

    })
    cliente.on("setChat",async (chat)=>{
        const currentRooms = cliente.rooms // Obtener las salas actuales del cliente
        console.log(currentRooms);
        if(!chatJoin){
            chatJoin=chat;
        }else if(chat != chatJoin){
            cliente.leave(chatJoin);
        }
        chatJoin=chat;
        console.log(chatJoin);
        // Dejar las salas actuales (excepto la sala predeterminada)
        // currentRooms.slice(1).forEach((room) => {
        //     console.log(room);
        //     cliente.leave(room);
        // });

        cliente.join(chat);

        let infochat = await ObtenerChat(null,chat);
        cliente.emit("chatinfo",infochat[0]);
        
    })
    cliente.on("leaveChat",async(chat)=>{
        cliente.leave(chat);
    })





    cliente.on("addContact",async(user)=>{
        let data = await enviarSolicitud({body:{search:{name:user},value:{_id:usuario._id,name:usuario.name}}});
    })

    cliente.on("optionSolicitud",async (opcion)=>{
      let data = await opcionSolicitud({body:
        {
            search:{
                _id:usuario._id
            },
            value:{
                _id:opcion._id
            },
            option:opcion.opcion
        }
    });      
    })

    
    cliente.on("disconnect",async(data)=>{
        console.log("usuario desconectado");
        if(usuario){
            await ActualizarUsuario({body:{search:{_id:await usuario._id},update:{conexion:false}}})
        }
    })
})
const publicPath = path.resolve(__dirname, '../../dist');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

//-------------------------------------------------------------Servidor-----------------------------------------------------------------
servidor.listen(process.env.PORT,()=>console.log("servidor encendido en http://localhost:"+process.env.PORT));