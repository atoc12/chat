const idGenerator=()=>{
    let size = 20;
    let caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.:";
    let cadenaAleatoria='';
    for (let i = 0; i < size; i++) {
        let indice = Math.floor(Math.random() * caracteres.length);
        cadenaAleatoria += caracteres.charAt(indice);
    }
      return btoa(cadenaAleatoria);
}

module.exports = idGenerator;