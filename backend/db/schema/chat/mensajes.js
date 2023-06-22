const {Schema, model} = require("mongoose")

const mensajesSchema = new Schema({
    content: String,
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'usuarios'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  });


module.exports = mensajesSchema; 
