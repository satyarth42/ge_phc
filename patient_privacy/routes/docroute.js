var express = require('express');
var router = express.Router();
var passport = require('passport'),
    LocalStrategy   = require('passport-local').Strategy;
var flash = require('connect-flash');
const mongoose = require('mongoose');
const aes256 = require('aes256');
const key = "GEHEALTHCARE";
const fs = require('fs');
var sha256=require('js-sha256');

var analogy = require('../models/analogies');
/* GET home page. */

function check(filename)
{
    let transact_data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    console.log(transact_data);
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
    var initial_value=transact_data.transaction_data[0];
    var newhash1=sha256(JSON.stringify(initial_value));


//Getting the Hashed Values for each of the Trasanction

    for(var i=1;i<=number_of_nodes;i++)
    {
        Hash_Transactions[i]=sha256(JSON.stringify(transact_data.transaction_data[i-1]));
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
                else
                    X9=x;
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


    //let K = Get_Hex(Inter_Transactions[0]);

    return newhash1;
}




router.get('/dashboard',function(req,res,next){
    if(req.session.passport && req.session.passport.user){
        let uname = req.session.passport.user.email;

        analogy.find({$and:[{doctor:uname},{read:1}]},function(err,data){
            for(let i=0;i<data.length;i++){
                data[i]['comments']=aes256.decrypt(key,data[i]['comments']);
                data[i]['images']=aes256.decrypt(key,data[i]['images']);
            }
            res.render('doc_dashboard',{msg:req.flash('success'),session:req.session,data:data});
        });
    }
    else
        res.redirect('/doctor/');
});


router.get('/logout',function(req,res,next){
    req.logOut();
    req.flash('logout','You have successfully logged out');
    res.redirect('/');
});

router.post('/send_reply',function(req,res,next){
    let id = req.body.id;
    let reply = req.body.reply;
    analogy.findOne({_id:id},function(err,doc){


        let file_address = aes256.decrypt(key,doc.file_address);

        //console.log(doc["previous_hash"]);
        //console.log(doc["generated_hash"]);
        Generated_hash = check(file_address);

        console.log(Generated_hash,doc["previous_hash"]);
        if(Generated_hash==doc["previous_hash"])
            console.log('Doctors data has been verified');
        else
            console.log("security has been compromised");

        doc.doctors_reply = aes256.encrypt(key,reply);
        doc.read = 0;

        var trans_data = JSON.parse(fs.readFileSync(file_address, 'utf8'));
        //console.log(trans_data);
        trans_data['transaction_data'].push({
            "patient":doc.patient,
            "doctor":doc.doctor,
            "comments":doc.comments,
            "read":0,
            "time":new Date(),
            "images":doc.images
        });
        //console.log(trans_data);

        fs.writeFileSync(file_address,JSON.stringify(trans_data),'utf-8');

        let new_hash = check(file_address);
        doc["previous_hash"]=new_hash;

        doc.save();


        res.redirect('/dashboard');
    });
});

module.exports = router;
