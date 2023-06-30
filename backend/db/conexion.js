const mongoose = require("mongoose");

const Bd = async ()=>{
    try{
        await mongoose.connect("mongodb://34.151.204.251:27017");
        console.log("conexion a la base de datos realizada");
    }catch(err){
        console.log(err);
    }
}
Bd();