var mongoose = require('mongoose');
var schema = mongoose.Schema;
var analogySchema = new schema({
    "patient":{
        type:String,
        required:true
    },
    "doctor":{
        type:String,
        required:true
    },
    "comments":{
        type:String,
        required:true
    },
    "time":{
        type:Date,
        required:true
    },
    "read":{
        type:Number,
        required:true
    },
    "doctors_reply":{
        type:String
    },
    "images":{
        type:String
    },
    "generated_hash":{
        type:String
    },
    "previous_hash":{
        type:String
    },
    "file_address":{
        type:String,
        required:true
    }
},{collection:'analogies'});

module.exports = mongoose.model('analogies',analogySchema);