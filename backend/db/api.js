const {Router, json} = require("express");
const {ObtenerUsuarios, ActualizarContacto, AgregarContacto, BorrarContacto, ActualizarUsuario, CrearUsuario, BorrarUsuarios, ObtenerContacto} = require("./schema/user/usuario");
const { ObtenerChat, CrearChat, BorrarChat, AgregarMensaje } = require("./schema/chat/chat");
const bdRouter = Router();
//--------------------------------------------------------------------Usuarios----------------------------------------------------------------------------
bdRouter.get("/usuario",async (req,res)=>await ObtenerUsuarios(req,res)); // se mostrarán todos los usuarios registrados
bdRouter.post("/usuario",async (req,res) => await CrearUsuario(req,res));// se agregarán nuevos usuarios
bdRouter.post("/usuario/buscar",async (req,res)=>await ObtenerUsuarios(req,res,search=true));//se buscarán usuarios registrados
bdRouter.put("/usuario",async (req,res)=>await ActualizarUsuario(req,res));// se editarán o actualizaran los usuarios registrados
bdRouter.delete("/usuario",async (req,res)=>await BorrarUsuarios(req,res)); // se eliminarám el usuario señalado en la base de datos


//-------------------------------------------------------------------Contactos---------------------------------------------------------------------------
bdRouter.post("/usuario/contactos/buscar", async (req,res) => await ObtenerContacto(req,res));
bdRouter.post("/usuario/contactos", async (req,res) => await AgregarContacto(req,res));
bdRouter.put("/usuario/contactos", async (req,res) => await ActualizarContacto(req,res));
bdRouter.delete("/usuario/contactos", async (req,res) => await BorrarContacto(req,res));


//----------------------------------------------------------------------Chat-------------------------------------------------------------------------
bdRouter.get("/chat/obtener",async (req,res)=>await ObtenerChat(res)); 
bdRouter.get("/chat/crear",async (req,res)=>await CrearChat(res));
bdRouter.get("/chat/borrar",async (req,res)=>await BorrarChat(res,"64861bdf93fb193f1581039f"));
bdRouter.post("/chat/mensaje/subir",async (req,res)=>{
    let usuario=req.body;
    await AgregarMensaje(res,usuario.chat_id,usuario)
});
//------------------------------------------------------------------Exportación------------------------------------------------------------------
module.exports = bdRouter;