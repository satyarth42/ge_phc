var express = require('express');
var router = express.Router();
var passport = require('passport'),
    LocalStrategy   = require('passport-local').Strategy;
var flash = require('connect-flash');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const http = require('http');
const aes256 = require('aes256');
const fs = require('fs');
var sha256=require('js-sha256');

const key = "GEHEALTHCARE";

var analogy = require('../models/analogies');
var images = require('../models/images');

const storage = multer.diskStorage({
    destination: './public/images/',
    filename: function(req, file, cb){
        cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }

});

var filename = "";

const upload = multer({
    storage: storage,
    limits:{fileSize: 1000000},
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
}).single('myImage');

function checkFileType(file, cb){
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    } else {
        cb('Error: Images Only!');
    }
}

var use = require('../models/users');

/* GET home page. */
router.get('/', function(req, res, next) {
    if(req.session.passport && req.session.passport.user)
        if(req.session.passport.user.type=="patient")
            res.redirect('/dashboard');
        else
            res.redirect('/doctor/dashboard');
    else
        res.render('index',{success:req.flash('success_msg'),error:req.flash('error'),session:req.session});
});

router.get('/register', function(req,res,next){
    if(req.session.passport && req.session.passport.user)
        res.redirect('/dashboard');
    else
        res.render('register',{error:req.flash('error_msg'),session:req.session});
});

router.get('/dashboard',function(req,res,next){
    if(req.session.passport && req.session.passport.user) {
        let id = req.session.passport.user._id;
        if (req.session.passport.user.type == "patient") {
            use.find({type:{$ne:"patient"}},function(err,docs){

                let email = req.session.passport.user.email;
                let final_data = [];
                analogy.find({},function(err,data){
                    for(let i=0;i<data.length;i++){
                            if(aes256.decrypt(req.session.passport.user._id,data[i]['patient'])==email){
                                data[i]['comments']=aes256.decrypt(key,data[i]['comments']);
                                data[i]['images']=aes256.decrypt(key,data[i]['images']);
                                if(data[i]['doctors_reply']){
                                    data[i]['doctors_reply']=aes256.decrypt(key,data[i]['doctors_reply']);
                                }
                                final_data.push(data[i]);
                            }
                    }
                    res.render('dashboard', {msg: req.flash('success'), session: req.session,doctors:docs,data:final_data});
                });
            });
        }
        else
            res.redirect('/doctor/dashboard');
    }
    else
        res.redirect('/');
});

router.get('/request/:username/:type',function(req,res,next){

    res.render('request',{session:req.session,doctor:req.params.username,type:req.params.type});
});

router.post('/register', function(req,res,err){
    var email = req.body.email;
    var fname = req.body.fname;
    var lname = req.body.lname;
    var password = req.body.password;
    var confpass = req.body.confpass;
    if(password!=confpass) {
        req.flash('error_msg', 'Password and Confirm Password fields do not match');
        res.redirect('/register');
    }
    else{
        use.find({email:email},function(err,docs){
            if(docs.length>0)
            {
                req.flash('error_msg',"Email already registered.");
                res.redirect('/register');
            }
            else
            {
                var hash = bcrypt.hashSync(password,10);
                var user = new use({
                    "email":email,
                    "fname":fname,
                    "lname":lname,
                    "password":hash,
                    "type":"patient"
                });
                user.save(function(err,updated){
                    if(err) console.log(err);
                    const content = JSON.stringify({transaction_data:[]});

                    fs.writeFileSync('./json_data/'+user._id+'.json',content,'utf-8');

                    req.flash('success_msg','You have succesfully registered. Login now to continue');
                    res.redirect('/');
                });
            }
        });
    }
});

router.post('/', passport.authenticate('userLogin', {
    successRedirect:'/dashboard',
    failureRedirect:'/',
    failureFlash:true,
    successFlash:true
}));

passport.use('userLogin',new LocalStrategy({
        usernameField:'email'
    },
    function(username, password, done) {
        use.findOne({ email :username },
            function(err,user) {
                if (err)
                    return done(err);
                if (!user){
                    return done(null, false, { message:'Incorrect Email'});
                }
                if (!isValidPassword(user, password)){
                    return done(null, false, { message:'Incorrect Password'});
                }
                return done(null, user,{message:'You have Logged In successfully'});
            }
        );

    })
);

var isValidPassword = function(user,password){
    return bcrypt.compareSync(password,user.password);
};

passport.serializeUser(function(user, done) {
    var sessionUser = {_id:user._id,email:user.email,fname:user.fname,lname:user.lname,type:user.type};
    console.log(sessionUser);
    done(null, sessionUser);
});

passport.deserializeUser(function(id, done) {
    use.findById(id, function(err, user) {
        done(err, user);
    });
});

router.get('/logout',function(req,res,next){
    req.logOut();
    req.flash('logout','You have successfully logged out');
    res.redirect('/');
});

router.post('/upload', (req, res) => {
    upload(req, res, (err) => {
    if(err){
        res.render('request', {
            msg: err
        });
    } else {
        if(req.file == undefined){
            res.render('index', {
                msg: 'Error: No File Selected!'
            });
        } else {

            http.get(`http://localhost:8000/image_process?file=${req.file.filename}`, (resp) => {
                let data = '';

            // A chunk of data has been recieved.
                resp.on('data', (chunk) => {
                    data += chunk;
                });

            let comment = req.body.comment;
            let enc_comment = aes256.encrypt(key,comment);
            let enc_address = aes256.encrypt(key,`/images/${req.file.filename}`);
            /*let new_image = new images({
                "patient":req.session.passport.user.email,
                "image":enc_addr
            });

            new_image.save(function(err,updated){
                if(err) console.log(err);
            });*/

            let enc_user = aes256.encrypt(req.session.passport.user._id,req.session.passport.user.email);
            //console.log(req.body.doc_name);
            let time = new Date();


            let id = req.session.passport.user._id;

            var trans_data = JSON.parse(fs.readFileSync('./json_data/'+id+'.json', 'utf8'));
            trans_data['transaction_data'].push({
                "patient":enc_address,
                "doctor":req.body.doc_name,
                "comments":enc_comment,
                "read":1,
                "time":time,
                "images":enc_address
            });



            fs.writeFileSync('./json_data/'+id+'.json',JSON.stringify(trans_data),'utf-8');

            trans_data = JSON.parse(fs.readFileSync('./json_data/'+id+'.json', 'utf8'));
            console.log(trans_data);

            //let transact_data=require('../json_data/'+id+'.json');
            let transact_data = JSON.parse(fs.readFileSync('./json_data/'+id+'.json', 'utf8'));


            //code_starts
            var Hash_Transactions=[];
            var Bin_Transactions=[];
            var Inter_Transactions=[];
            var number_of_nodes=transact_data.transaction_data.length;
            var level=Math.ceil(Math.log2(number_of_nodes));
            var nodes_at_each_level=[];
            var sum=0;

//Size of each level of B tree
            for(var i=0;i<level;i++)
            {
                nodes_at_each_level[i]=Math.pow(2,i);
                sum+=nodes_at_each_level[i];
            }
            sum--;
            nodes_at_each_level[level]=number_of_nodes-sum;

//Getting Hex Values
            function Get_Hex(X)
            {
                var res="";
                for(var h=0;h<X.length;h+=4)
                {
                    var str;
                    str=X.substr(h,4);
                    var Z=parseInt(str,2).toString(16);
                    res+=Z;
                }
                return res;
            }



//Function to convert Hexadecimal number to Binary number
            function hex2bin(hex)
            {
                return (parseInt(hex,16).toString(2)).padStart(8,'0');
            }

//Function returning the Binary Value in String Format
            function get_binary_value(hex)
            {
                var res="";
                for(var i=0;i<hex.length-1;i+=2)
                {
                    var str="";
                    str=hex.substr(i,2);
                    res+=hex2bin(str);
                }
                return res;
            }


//Function Giving XOR of the Two Binary number
            function Get_Xor(p,q,R)
            {
                let hell=R[p];
                let yeah=R[q];

                let result="";
                for(u=0;u<256;u++)
                {
                    if(hell[u]==='1' && yeah[u]==='1')
                    {
                        result+='0';
                    }
                    else if(hell[u]==='0' && yeah[u]==='0')
                    {
                        result+='0';
                    }
                    else
                    {
                        result+='1';
                    }
                }
                return result;
            }

//Taking Initial Hash which is to be compared on receiver side
            var initial_value="";
            var initial_hash=sha256(JSON.stringify(initial_value));
            let new_Hash1=sha256(JSON.stringify(transact_data.transaction_data[0]))

//Getting the Hashed Values for each of the Trasanction
            Hash_Transactions[0]=initial_hash
            for(var i=1;i<=number_of_nodes;i++)
            {
                Hash_Transactions[i]=sha256(JSON.stringify(transact_data.transaction_data[i-1]));
                console.log("important");
                console.log(transact_data.transaction_data[i-1]);
            }


//Converting Hash Values of Transaction to Binary form
            Hash_Transactions.forEach(function(x,i){
                var hash_value="";
                hash_value=get_binary_value(x);
                Bin_Transactions[i]=hash_value;
                Inter_Transactions[i]=hash_value;
            })



//Going from leaves to root to obtain a Final Hash
//Assigning left root as (2*i+1) and right root as (2*i+2)
            for(i=level;i>0;i--)
            {
                var x=Math.pow(2,i)-1;

                for(var j=0;j<nodes_at_each_level[i];j+=2,x+=2)
                {
                    var X9="";



                    if((j+1) < nodes_at_each_level[i]) {

                        if(Inter_Transactions[x] && Inter_Transactions[x+1])
                            X9 = Get_Xor(x, x + 1, Inter_Transactions);

                    }
                    else
                        X9=x;

                    var e;
                    //Getting Parent using the formula
                    //if x is even parent=x/2
                    //if x is odd parrent=((x-1)/2)

                    if(x%2!==0)
                    {
                        e=x-1;
                    }
                    else
                    {
                        e=x;
                    }
                    //Updating Xor of both the children i.e (2*i+1),(2*i+2) with Value of the parent
                    if(Inter_Transactions[e/2] && Inter_Transactions[X9])
                        Inter_Transactions[e/2]=Get_Xor(e/2,X9,Inter_Transactions);
                }
            }


            let new_hash = Get_Hex(Inter_Transactions[0]);


            var new_analogy = new analogy({
                "patient":enc_user,
                "doctor":req.body.doc_name,
                "comments":enc_comment,
                "read":1,
                "time":time,
                "images":enc_address,
                "generated_hash":new_Hash1,
                "previous_hash":new_Hash1,
                "file_address":aes256.encrypt(key,'./json_data/'+id+'.json')
            });


            new_analogy.save(function(err,updated){
                if(err) console.log(err);

            });

            res.render('request', {
                session:req.session,
                msg: 'File Uploaded!',
                file: `/images/${req.file.filename}`,
                doctor: req.body.doc_name,
                type: req.body.type
            });


            }).on("error", (err) => {
                    console.log("Error: " + err.message);
            });
        }
    }

});
});

router.post('/request/:doctor/generate_request',function (req,res,next) {
    console.log(req.body.comment);
    console.log(req.params.doctor);
    console.log(req.session.passport.user.email);

    let enc_comment = aes256.encrypt(key,req.body.comment);
    var new_analogy = new analogy({
        "patient":req.session.passport.user.email,
        "doctor":req.params.doctor,
        "comments":enc_comment,
        "read":1,
        "time":new Date()
    });
    new_analogy.save(function(err,updated){
        if(err) console.log(err);

        res.redirect('back');
    });

});

module.exports = router;
