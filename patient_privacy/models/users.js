var mongoose = require('mongoose');
var schema = mongoose.Schema;
var userSchema = new schema({
    "email":{
        type:String,
        unique:true,
        required:true
    },
    "fname":{
        type:String,
        required:true
    },
    "lname":{
        type:String
    },
    "password":{
        type:String,
        required:true
    },
    "type":{
        type:String,
        required:true
    }
},{collection:'users'});

module.exports = mongoose.model('users',userSchema);