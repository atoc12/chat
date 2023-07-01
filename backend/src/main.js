require("../db/conexion.js");
require('dotenv').config();
const cors = require("cors");
const express =require('express');
const bdRouter = require("../db/api.js");
const http = require("http");
const {Server} = require("socket.io");
const { ActualizarUsuario, ObtenerContacto, ObtenerUsuarios, opcionSolicitud, enviarSolicitud, AgregarContacto, ObtenerNotifiaciones } = require("../db/schema/user/usuario.js");
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








//----------------------------------------------Socket.io-------------------------------------------------------------------



io.on('connection',async (cliente)=>{
    var usuario=null;
    var chatJoin=null;
    var testBtn = [];
    await cliente.on("user_connect",async (data)=>{// detecta cuando un usuario se conecta
        try{
            console.log("user connect");
            cliente.join(data._id)
            cliente.emit("recive-id",cliente.id);
            await ActualizarUsuario({
                body:{
                    search:{
                        _id:data._id,
                    },
                    update:{
                        socket_id:cliente.id,
                        conexion:true
                    }
                }
            },null);
            let datos = await ObtenerUsuarios({body:{search:data}},null,true);
            cliente.emit("contacts-recive",await ObtenerContacto({body:{
                search:{_id:data._id}
            }}));
            usuario=datos;
            cliente.emit("recive-noti",datos.notificaciones);
            if(data.name == "carlos"){
                cliente.join(2);
            }
            datos.contactos.map((a)=>{
                cliente.join(a._id.toString());
                cliente.to(a._id.toString()).emit("contact-connected",`${usuario.name} está conectado`);
            })
        }catch(err){
            console.log(err);
        }
    });
    cliente.on("recive-change",data=>{

    });
    cliente.on("send-chat",async (data)=>{// envia el identificador del chat en el que se encuentra
        try{
            let chat = await ObtenerChat(null,data.chat_id);
            if(chatJoin){
                cliente.leave(chatJoin);
            }
            cliente.join(data.chat_id);
            chatJoin=data.chat_id;
            cliente.emit("recive-chat-info",chat.messages);
        }catch(err){
            console.log(err);
        }        
    });
    cliente.on("recive-solicitud",async (data)=>{// envia las solicitudes de amistad
        try{
            let a = await ObtenerUsuarios({
                body:{
                    search:{
                        _id:usuario._id.toString()
                    },
                    value:["solicitud"]
                }
            },null,true)
            console.log(a);
            if(a.solicitud.length >0){
                cliente.emit("solicitudes",a.solicitud);
            }
        }catch(err){
            console.log(err);
        }
    });
    cliente.on("send-message",async (msj)=>{//enviar mensajes a los chats
        console.log(chatJoin);
        await AgregarMensaje(null,chatJoin,msj);
        cliente.emit("recive-message",msj);
        cliente.to(chatJoin).emit("recive-message",msj);
    });
    cliente.on("obtener-contactos",async(data)=>{
        try{
            console.log(await usuario);
            let a = await ObtenerContacto({body:{_id:usuario._id}},null);
            console.log(a.contactos);
            if(a.contactos.length > 0 ){
                cliente.emit("contacts-recive",a);
            }
        }catch(err){
            console.log(err);
        }
    });
    cliente.on("add-contact",async (data)=>{//envia solicitudes de amistad
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
            // let info = await ObtenerUsuarios (datos,null);
            // if(soli.socket){
                // console.log(info);
                io.to(soli.socket).emit("recive-noti",soli.body);
            // }
        }catch(err){
            console.log(err);
        }
    });
    cliente.on("solicitud-option",async(data)=>{//confirmacion de las solicitudes
        try{
            console.log(data);
            let a = await opcionSolicitud({
                body:{
                    value:{_id:data.data._id},
                    search:{_id:usuario._id.toString()},
                    option:data.value
                }
            },null);
            if(data.value){
                console.log(a);
                cliente.emit("change-contacts",true);
                cliente.to(data.data._id.toString()).emit("change-contacts",true);
            }
        }catch(err){
            console.log(err);
        }
    });
    cliente.on("test-btn",data=>{
        try{
            console.log("a");
            testBtn.push({chat_id:2,name:"lol"});
            cliente.emit("test-contactos",{contactos:testBtn});
        }catch(err){
            console.log(err);
        }
    })
    cliente.on("disconnect",async(data)=>{
        console.log("usuario desconectado");
        // if(usuario){
        //     await ActualizarUsuario({body:{search:{_id:await usuario._id},update:{conexion:false}}})
        // }
        delete usuario;
    });
})




//----------------------------------------------------------------------------------------------------------------------

















const publicPath = path.resolve(__dirname, '../../dist');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

//-------------------------------------------------------------Servidor-----------------------------------------------------------------
servidor.listen(process.env.PORT,()=>console.log("servidor encendido en http://"+process.env.IP+":"+process.env.PORT));