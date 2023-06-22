const mongoose = require("mongoose");

const Bd = async ()=>{
    try{
        await mongoose.connect("mongodb://mongo:s64Ry15NJ4Kx023Y5KwP@containers-us-west-126.railway.app:8015");
        console.log("conexion a la base de datos realizada");
    }catch(err){
        console.log(err);
    }
}
Bd();