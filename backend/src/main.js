require("../db/conexion.js");
require('dotenv').config();
const cors = require("cors");
const express =require('express');
const bdRouter = require("../db/api.js");
const http = require("http");
const {Server} = require("socket.io");
const { ActualizarUsuario, ObtenerContacto, ObtenerUsuarios, opcionSolicitud, enviarSolicitud, AgregarContacto } = require("../db/schema/user/usuario.js");
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
        let datos = await ObtenerUsuarios({body:{search:data}},null,true);
        cliente.emit("contacts-recive",await ObtenerContacto({body:{
            search:{_id:data._id}
        }}));
        usuario=data;
    })


    cliente.on("send-chat",async (data)=>{
        try{
            console.log(data);
            let chat = await ObtenerChat(null,data.chat_id);
            if(!chatJoin){
                cliente.join(data.chat_id);
                chatJoin=data;
            }else if(data.chat_id != chatJoin){
                cliente.leave(data.chat_id);
                cliente.join(data.chat_id);
                chatJoin=data.chat_id;
            }
            cliente.emit("recive-chat-info",chat.messages);
        }catch(err){
            console.log(err);
        }        
    })
    cliente.on("send-message",async (msj)=>{
        console.log(chatJoin);
        await AgregarMensaje(null,chatJoin,msj);
        cliente.emit("recive-message",msj);
        cliente.to(chatJoin).emit("recive-message",msj);
    })
    cliente.on("add-contact",async (data)=>{
        try{
            let datos = {
                body:{
                    search:{
                        name:data
                    },
                    value:{
                        _id:usuario._id.toString(),
                        name:usuario.name
                    }
                }
            }
            let soli = await enviarSolicitud(datos,null);
            cliente.emit("notification",soli);
        }catch(err){
            console.log(err);
        }
    })


    

    
    cliente.on("disconnect",async(data)=>{
        console.log("usuario desconectado");
        // if(usuario){
        //     await ActualizarUsuario({body:{search:{_id:await usuario._id},update:{conexion:false}}})
        // }
    })
})
const publicPath = path.resolve(__dirname, '../../dist');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

//-------------------------------------------------------------Servidor-----------------------------------------------------------------
servidor.listen(process.env.PORT,()=>console.log("servidor encendido en http://"+process.env.IP+":"+process.env.PORT));