var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
var crypto = require('crypto');

const secret = 'ojha';
router.get('/', function(req, res, next) {
    res.render('admn_pnl', { title: 'Administrator' });
});

var use = require('../models/users.js');

router.post('/login',function (req, res, next) {
    password = req.body.password;
    const hash = crypto.createHmac('sha256', secret)
        .update(password)
        .digest('hex');
    if(hash==='30df25a5f3ca4239b7c594b3d893d8952d0fc41f55bdd76e768a8c5269f9c88d')
    {
        res.redirect('/admin/control');
    }
    else
    {
        res.redirect('/admin');
    }
});

router.post('/adddoctor',function(req,res,next){
    var email = req.body.email;
    var password = req.body.password;
    var fname = req.body.fname;
    var lname = req.body.lname;
    var type = req.body.type;

    use.find({email:email},function (err,docs) {
        if(docs.length>0){
            req.flash('error_msg','User already exists');
            res.redirect('/admin/control');
        }
        else{
            var doctor = new use({
                "email":email,
                "password":bcrypt.hashSync(password,10),
                "lname":lname,
                "fname":fname,
                "type" : type
            });
            doctor.save(function(err,updated){
                if(err) console.log(err);
                req.flash('success','User added');
                res.redirect('/admin/control');
            });
        }
        console.log(req.session);
    });
});


router.get('/control',function(req,res,next){
    res.render('doc_add',{error_msg:req.flash('error_msg'),success:req.flash('success')});
});

module.exports = router;
