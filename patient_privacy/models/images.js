var mongoose = require('mongoose');
var schema = mongoose.Schema;
var imagesSchema = new schema({
    "patient":{
        type:String,
        required:true
    },
    "image":{
        type:String,
        required:true
    }
},{collection:'images'});

module.exports = mongoose.model('images',imagesSchema);