const {Schema, model} = require("mongoose");
const idGenerator = require("../../../session/session");
const { CrearChat } = require("../chat/chat");

const userSchema = new Schema({
    name:{
        type:String,
        minlength:3,
        required:true,
    },
    password:{
        type:String,
        minlength:8,
        required:true,
    },
    age:Number,
    email:{
        type:String,
        required:true,
        unique:true,
    },
    solicitud:[
        {
            _id:{
                type:Schema.Types.ObjectId,
                ref:"usuarios",
            },
            name:String
        }
    ],
    contactos:[
        {
            _id:{
                type:Schema.Types.ObjectId,
                ref:"usuarios",
            },
            chat_id:{
                type:Schema.Types.ObjectId,
                ref:"chats",
            },
            name:String,
            age:Number,
            socket_id:{
                type:String,
                default:null
            },
            conexion:{
                type:Boolean,
                default:false,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            }
        }
    ],
    notificaciones:[
        {
            sender:String,
            name:String,
            content:String,
            timestamp: {
                type: Date,
                default: Date.now,
            }
        }
    ],
    conexion:{
        type:Boolean,
        default:false
    },
    session:{
        type:String,
        default:null
    },
    socket_id:{
        type:String,
        default:null
    }
});

const User = model('usuarios',userSchema);
//--------------------------------------------Usuarios-------------------------------------
const ObtenerUsuarios = async (req,res,search=false)=>{
    try{
        let datos = req.body;
        let datos_value = datos.value ? datos.value.join(" ",",") : '';
        let respuesta = await User.findOne(search ? datos.search : {}).select(datos_value);
        if(datos.session){
            if(!respuesta){
                console.log("no se abre session");
            }else{
                var newId = idGenerator();
                await User.findOneAndUpdate(datos.search,{session:newId,conexion:true},{new:true}); // se crea el id y luego se almacena
                respuesta = {
                    _id:respuesta._id,
                    email:respuesta.email,
                    name: respuesta.name
                }
            }
        }
        if(!res) return respuesta;
        res.json({datos:respuesta,token:newId});
    }catch(err){
        console.log(err);
    }
}

const CrearUsuario = async(req,res)=>{// funcion que permite crear registros de usuarios
    try{
        let usuario_datos = await req.body;
        await new User(usuario_datos).save();
        res.json({message:"datos almacenados con exito"});
    }catch(err){
        let errores=err.errors;
        if(errores){
            for(let campos in errores){
                let campoError = errores[campos];
                if(campoError.kind === 'required') return res.json({message:`${campos} is required`});
                if(campoError.kind  === 'minlength') return res.json({message:`${campos} need min ${campoError.properties.minlength} characters`});
            }
        }
        if(err.code === 11000) return res.json({message:"email used"})
        console.log(err);
    }
}


const BorrarUsuarios=async (req,res)=>{// funcion que elimina registros de usuarios
    try{
        let datos = req.body;
        let resultado =await User.findByIdAndDelete({_id:datos._id})
        if(!resultado) return res.json({message:"registro no existente"});
        res.json({message:"datos eliminado con exito"});
    }catch(err){
        for(let campos in err.error){
            if(err.error[campos].kind === "ObjectId") return res.json({message:"identificadro necesario"});
        }
        console.log(err);
    }
}

const ActualizarUsuario = async (req,res=null)=>{// funcion que permite actualizar los registros de un usuario
    try{
        let datos = req.body;
        let datos_search=datos.search;
        let datos_update=datos.update;
        let update_user = await User.findByIdAndUpdate(datos_search,datos_update,{new:true});
        if(!update_user)return res ? res.json({message:"error al actualizar"}) : "error al actualizar";
        if(!res) return {message:"datos almacenados",update:update_user};
        res.json({message:"registro actualizado"});
    }catch(err){
        console.log(err);
    }
}


//--------------------------------------Solicitudes-----------------------------------------

const enviarSolicitud =async (req,res=null)=>{
    try{
        let {search,value} = req.body;
        let respons = await User.findOne(search);
        if(!respons) return console.log("usuario no encontrado");
        if(respons.solicitud.find(data => data._id.toString() == value._id.toString())) return {message:"la solicitud ya ha sido enviada",client:null};
        let message = {
            sender:value._id,
            name:value.name,
            content:`${value.name} te ha enviado una solicitud`
        }
        respons.solicitud.push({_id:value._id,name:value.name});
        respons.notificaciones.push(message);
        await respons.save();
        if(res){
            res.json({ message: "Contacto agregado exitosamente" });
        }
        return {socket:respons.socket_id,body:message};
    }catch(err){
        console.log(err)
    }
}




const opcionSolicitud =async (req,res=null)=>{
    try{
        const {search,value,option} = req.body;
        let usuario = await User.findOne(search);
        if(!usuario) return res.json({message:"usuario no encontrado"});
        let validation =usuario.solicitud.findIndex((solicitante)=> solicitante._id.toString() === value._id.toString());
        if(validation === -1) return {message:"contacto no existente"};
        usuario.solicitud.splice(validation,1);
        if(!option) {await usuario.save(); return {message:"se ha rechazado con exito"}};
        let usuario2 = await User.findOne({_id:value._id});
        let chat =await CrearChat();
        usuario.contactos.push({
            _id:usuario2._id,
            conexion:usuario2.conexion,
            name:usuario2.name,
            socket_id:usuario2.socket_id,
            chat_id:chat._id.toString()
        })
        usuario.notificaciones.push({
            sender:usuario2._id,
            name:usuario2.name,
            content:`${usuario2.name} se ha añadido a tus contactos`
        })
        usuario2.contactos.push({
            _id:usuario._id,
            conexion:usuario.conexion,
            name:usuario.name,
            socket_id:usuario.socket_id,
            chat_id:chat._id.toString()
        })
        usuario2.notificaciones.push({
            sender:usuario._id,
            name:usuario.name,
            content:`${usuario.name} se ha añadido a tus contactos`
        })
        chat.participants.push(usuario);
        chat.participants.push(usuario2);
        await usuario.save();
        await usuario2.save();
        await chat.save();
        return {message:"contacto añadido",socket:usuario.socket_id};


    }catch(err){
        console.log(err)
    }
}
//-------------------------Notificaciones-------------------------------------

const CrearNotificacion =async (req,res=null)=>{
    try{
        const {search,value} = req.body;
        let resultado = await User.findOne(search).select("notificaciones");
        resultado.notificaciones.push(value);
        await resultado.save();

    }catch(err){console.log(err)}
}

const BorrarNotificacion = async(req,res=null)=>{
    try{
        let {search,value} = req.body;
        let usuario = await User.findOne(search);
        if(!usuario) return ;
        if(value){
            let noti =usuario.notificaciones.findIndex((notificaciones)=> notificaciones._id.toString() === value._id.toString());
            if(noti === -1) return res.json({message:"contacto no existente"});
            usuario.notificaciones.splice(noti,1);
        }else{
            usuario.notificaciones = [];
        }
        await usuario.save()
    }catch(err){console.log(err)}
}


const ObtenerNotifiaciones = async (req,res)=>{
    try{
        let datos= req.body;
        let datos_search= datos.search;
        let resultado=await User.findOne(datos_search,`notificaciones`);
        if(res)return res.json(resultado);
        return resultado;
    }catch(err){console.log(err)}
}

// //----------------------------------contactos--------------------------------------------
const ObtenerContacto = async (req,res)=>{
    try{
        let datos= req.body;
        let datos_search= datos.search;
        let resultado=await User.findOne(datos_search,`contactos`);
        if(res)return res.json(resultado);
        return resultado;
    }catch(err){console.log(err)}
}
const AgregarContacto = async (req,res)=>{ // funcion que permite obtener datos de contactos
    try {
        let {search,value} = req.body;
        let usuario = await User.findOne(search);
        if(!usuario)return res.json({message:"Usuario no encontrado"});
        if(usuario.contactos.find(data => data._id == value._id))return res.json({ message: "El contacto ya existe" });
        let contacto = {
            _id:value._id,
            name:value.name
        };
        usuario.contactos.push(contacto);
        await usuario.save();
        res.json({ message: "Contacto agregado exitosamente" });
    } catch (err) {res.json({ message: "Error al agregar el contacto" });}
}      

const BorrarContacto =async (req,res)=>{// funcion que permite eliminar contactos
    try{
        let {search,value} = req.body;
        let usuario = await User.findOne(search);
        if(!usuario) return res.json({message:"usuario no encontrado"});
        let contacto =usuario.contactos.findIndex((contactos)=> contactos._id.toString() === value._id.toString());
        if(contacto === -1) return res.json({message:"contacto no existente"});
        usuario.contactos.splice(contacto,1)
        await usuario.save()
        res.json({message:"contacto eliminado"});
    }catch(err){console.log(err)}

}
const ActualizarContacto =async (req,res)=>{// funcion que permite actualizar los contactos del usuario
    try{
        let { search, value } = req.body;
        let usuario = await User.findOne(search.User);
        if (!usuario)return res.json({ message: "Usuario no encontrado" });
        let contacto = usuario.contactos.find(contacto => contacto._id.toString() === search.contact._id.toString());
        if (!contacto)return res.json({ message: "Contacto no existente" });
        Object.assign(contacto, value);
        await usuario.save();
        res.json({ message: "Contacto actualizado" });
    }catch(err){console.log(err)}
}


//-----------------------------------------------Exportación----------------------------------------------------
module.exports = {
    User,
    BorrarUsuarios,
    ObtenerUsuarios,
    CrearUsuario,
    ActualizarUsuario,
    enviarSolicitud,
    opcionSolicitud,
    ObtenerNotifiaciones,
    CrearNotificacion,
    BorrarNotificacion,
    AgregarContacto,
    ObtenerContacto,
    ActualizarContacto,
    BorrarContacto,
};
