const {Schema, model} = require("mongoose");
const mensajesSchema = require("./mensajes");
//-------------------------------------------------------------------------------------------------Esquema----------------------------------------------
const chatSchema =new Schema({
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'usuario'
    }],
    messages: [{
        content: String,
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'usuario'
        },
        name:{
            type:String
        },
        timestamp: {
            type: String,
            default: Date
        }
    }]
})
const Chat = model("chat",chatSchema);
///---------------------------------------------------------------------CRUD PARA ESTE ESQUEMA-------------------------------------------------------------
const CrearChat = async(res=null)=>{
    try{
        let chat = new Chat();
        await chat.save();
        if(res){
            res.json(chat);
        }
        return chat;
    }catch(err){console.log(err)}
}

const BorrarChat = async (res,id)=>{
    try{
        await Chat.findOneAndDelete({_id:id});
        res.json({message:"exitos"});
    }catch(err){console.log(err)}
}

const ObtenerChat = async (res,id)=>{ 
    try{
        let respons = await Chat.findById({_id:id});
        if(res){
            res.json(!respons || respons.length <= 0 ? {message:"error"} : respons);
        }
        return respons;
    }catch(err){console.log(err)}
}
//----------------------------------------------------MENSAJES-----------------------------------------
const AgregarMensaje = async (res,id,datos)=>{
    try{
        let chat = await Chat.findById(id);
        if(chat){
            let men = chat.messages.push({
                    content:datos.content,
                    sender:datos.sender,
                    name:datos.name
                });
            let resultado = await chat.save();
            console.log(resultado[resultado.length]);
        }
        if(res){
            res.json({message:"mensaje almacenado"});
        }
        return {message:"mensaje almacenado"};
    }catch(err){console.log(err)}
}

//-----------------------------------------------------Exportacíón----------------------------------------
module.exports = {Chat,ObtenerChat,CrearChat,BorrarChat,AgregarMensaje};
