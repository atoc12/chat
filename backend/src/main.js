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


const user = {};

io.on('connection',async (cliente)=>{
    user[cliente.id]={
        _id:null,
        name:null,
        conexion:false,
        socket_id:cliente.id,
        chatJoin:null
    };

    cliente.on("conexion-usuario",async (datos)=>{
        try{
            //----------------------Crear room del usuario-----------------------------
            cliente.join(datos._id);
            //---------------------------Actualizar usuario----------------------------
            let usuario_update ={ // estructura necesaria para buscar y actualizar datos
                body:{
                    search:datos._id.toString(),
                    update:{
                        conexion:true,
                        socket_id:cliente.id
                    }
                },
            }
            let post_user = await ActualizarUsuario(usuario_update);
            user[cliente.id] = post_user.update;
            //----------------actualixcacion de token -------------------
            cliente.emit("actualizacion-token",cliente.id);
            //--------------------- notificaciones -----------------------
            cliente.emit("notificaciones",user[cliente.id].notificaciones);

            //--------------------- contactos---------------------------------
            cliente.emit("contactos",user[cliente.id].contactos);
            user[cliente.id].contactos.map(contacto =>{
                cliente.join(contacto._id.toString());
                cliente.to(contacto._id.toString()).emit("contacto-conexion",`${user[cliente.id].name} se ha conectado`);
            })
        }catch(err){console.log(err)}
    })
    //------------------------solicitud-------------------------
    cliente.on("obtener-solicitud",async (datos)=>{
        try{
            let req = {
                body:{
                    search:{
                        _id:user[cliente.id]._id
                    },
                    value:["solicitud"]
                }
            };
            let res = await ObtenerUsuarios(req,null,true);
            cliente.emit("solicitudes",res.solicitud);
        }catch(err){console.log(err)}
    });

    cliente.on("confirmar-solicitud",async (datos)=>{
        try{
            let pre_consulta ={
                body:{
                    value:{_id:datos.data._id},
                    search:{_id:user[cliente.id]._id.toString()},
                    option:datos.value
                }
            };
            let res = await  opcionSolicitud(pre_consulta);
            if(datos.value){
                cliente.emit("solicitud-aceptada",true);
                cliente.to(datos.data._id).emit("solicitud-aceptada",true);
            }
        }catch(err){console.log(err);}
    });

    //------------------------Contactos-------------------------
    cliente.on("contactos-refresh",async (datos)=>{
        try{
            let contactos = {
                body:{
                    search:{
                        _id:user[cliente.id]
                    }
                },
            };
            let post_contactos = await ObtenerContacto(contactos,null);
            cliente.emit("contactos",post_contactos.contactos);
        }catch(err){console.log(err)}
    });
    cliente.on("add-contact",async (data)=>{//envia solicitudes de amistad
        try{
            let datos = {
                body:{
                    search:{
                        name:data
                    },
                    value:{
                        _id:user[cliente.id]._id.toString(),
                        name:user[cliente.id].name
                    }
                }
            }
            let soli = await enviarSolicitud(datos,null);
            io.to(soli.socket).emit("notificaciones",soli.body);
        }catch(err){console.log(err)}
    });
    //--------------------------------CHAT-------------------------------------

    cliente.on("send-chat",async (data)=>{// envia el identificador del chat en el que se encuentra
        try{
            let chat = await ObtenerChat(null,data.chat_id);
            if(user[cliente.id].chatJoin){
                cliente.leave(user[cliente.id].chatJoin);
            }
            cliente.join(data.chat_id);
            user[cliente.id].chatJoin=data.chat_id;
            cliente.emit("recive-chat-info",chat.messages);
        }catch(err){
            console.log(err);
        }        
    });
    cliente.on("send-message",async (msj)=>{//enviar mensajes a los chats
        await AgregarMensaje(null,user[cliente.id].chatJoin,msj);
        cliente.emit("recive-message",msj);
        cliente.to(user[cliente.id].chatJoin).emit("recive-message",msj);
    });


    cliente.on("disconnect",async(datos)=>{
        try{
            let usuario_update ={ // estructura necesaria para buscar y actualizar datos
                body:{
                    search:user[cliente.id]._id,
                    update:{conexion:false}
                },
            }
            await ActualizarUsuario(usuario_update);
            delete user[cliente.id];
        }catch(err){console.log(err)}
    })
})




//----------------------------------------------------------------------------------------------------------------------

















const publicPath = path.resolve(__dirname, '../../dist');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

//-------------------------------------------------------------Servidor-----------------------------------------------------------------
servidor.listen(process.env.PORT,()=>console.log("servidor encendido en http://"+process.env.IP+":"+process.env.PORT));