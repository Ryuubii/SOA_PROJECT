const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const joi = require('joi');
const fs = require("fs");
const multer = require("multer");

const { executeQuery } = require("../connection");
const {logDB, authenticate} = require("../middleware");

const key = "proyeksoa";
const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const uploadFolder = "profile_picture";

const checkEmail = async (email) => {
    const cekEmail = await executeQuery(`select * from users where email = '${email}'`);
    if(cekEmail.length !== 0){
        throw new Error("Email sudah terdaftar");
    }
}

const checkUsername = async (username) => {
    const cekUsername = await executeQuery(`select * from users where username = '${username}'`);
    if(cekUsername.length !== 0){
        throw new Error("Username sudah terdaftar");
    }
}

const generateUniqueApiKey = (length) => {
    let result = '';
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function getFileExtension(filename){
    filename = filename.split(".");
    return filename[filename.length-1];
}

const storage = multer.diskStorage({
    destination: "profile_picture/",
    filename: function(req, file, cb){
        const extension = getFileExtension(file.originalname);
        const file_name = file.originalname.split(".")[0];
        cb(null, file_name + "." + extension);
    }
});

const upload = multer({
    storage:storage,
});


router.post("/register", async function(req,res){
    const schema =
        joi.object({
            email: joi.string().external(checkEmail).required(),
            username: joi.string().external(checkUsername).required(),
            password: joi.string().required(),
            confirm_password: joi.string().required().valid(joi.ref('password')),
            nama: joi.string().required(),
            no_telp: joi.string().min(10).max(12).required(),
            alamat: joi.string().required()
        })

    try {
        await schema.validateAsync(req.body);
    }
    catch (err) {
        return res.status(403).send(err.toString());
    }

    try {
        const apikey = generateUniqueApiKey(20);
        const {email, username, password, nama, no_telp, alamat} = req.body;
        await executeQuery(`insert into users values(0, '${email}', '${username}', '${password}', '${nama}', '${no_telp}', '${alamat}', 0, 'gambar','${apikey}')`);
        await executeQuery(`insert into plan values(0, '${apikey}', 'free')`);

        return res.status(201).send({
            "email": email,
            "username": username,
            "nama": nama,
            "no_telp": no_telp,
            "alamat": alamat,
            "api-key": apikey
        })
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

router.post("/login", async function(req,res){

    try {
        const {username, password} = req.body;
        const cekUser = await executeQuery(`select * from users where username = '${username}' and password = '${password}'`);

        if(cekUser <= 0){
            return res.status(400).send("Username/password salah!");
        }

        const token = jwt.sign({user_id: cekUser[0].id, email: cekUser[0].email, username: username, api_key: cekUser[0].api_key}, key, {expiresIn: '30m'});

        return res.status(200).send({
            "email": cekUser[0].email,
            "token": token
        })
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

router.post("/topup", [authenticate, logDB], async function(req,res){

    try {
        const userdata = req.userdata;
        const {jumlah} = req.body;

        if(jumlah < 10000){
            return res.status(400).send({
                "message":"Jumlah tidak boleh kurang dari 10000"
            })
        }

        const user = await executeQuery(`select * from users where email = '${userdata.email}'`);
        const saldoLama = user[0].balance;
        const saldoBaru = parseInt(saldoLama) + parseInt(jumlah);
        await executeQuery(`update users set balance = ${saldoBaru} where email = '${userdata.email}'`);
        return res.status(201).send({
            "email":userdata.email,
            "saldo lama": saldoLama,
            "saldo baru": saldoBaru
        })
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

router.put("/changeProfilePicture",[authenticate, logDB], upload.single("profile_picture"),async function(req,res){
   try {
       const userdata = req.userdata;
       const extension = getFileExtension(req.file.originalname);
       const path = "/profile_picture/" + userdata.user_id;

       fs.renameSync(`${uploadFolder}/${req.file.filename}`, `${uploadFolder}/${userdata.user_id}.${extension}`);

       await executeQuery(`update users set profile_picture = '${path}' where id = ${userdata.user_id}`);

       return res.status(201).send({
           "message":"Berhasil mengubah foto profil!"
       });
   }
   catch (err){
       return res.status(500).send(err.toString());
   }
});

router.post("/upgradepremium", [authenticate, logDB], async function(req,res){
    const userdata = req.userdata;
    try {
        const plan = await executeQuery(`select * from plan where api_key = '${userdata.api_key}'`);
        if(plan[0].type == "premium"){
           
            return res.status(429).send("akun anda sudah premium!")
            
        }
        const requestuser = await executeQuery(`select * from request_upgrade where user_id = ${userdata.user_id}`);
        console.log(requestuser);
        if(requestuser.length>0){
           
            return res.status(429).send("anda sudah pernah request upgrade premium!")
            
        }
        await executeQuery(`insert into request_upgrade values(0, ${userdata.user_id}, 0)`);
        
        return res.status(201).send({
            "message":"user dengan username "+userdata.username+" berhasil meminta request upgrade",
        })
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

router.post("/bill", [authenticate, logDB], async function(req,res){
    const userdata = req.userdata;
    try {
        const plan = await executeQuery(`select * from plan where api_key = '${userdata.api_key}'`);
        if(plan[0].type == "premium"){
           
            return res.status(429).send("akun anda sudah premium!")
            
        }
        const requestuser = await executeQuery(`select * from request_upgrade where user_id = ${userdata.user_id}`);
        console.log(requestuser);
        if(requestuser.length>0){
            return res.status(201).send({
                "email":userdata.email,
                "Biaya Tagihan": 694200,
            })
        }
        
        return res.status(201).send({
            "message":"user dengan username "+userdata.username+" belum pernah melakukan request upgrade",
        })
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

router.post("/pay", [authenticate, logDB], async function(req,res){
    const userdata = req.userdata;
    try {
        const plan = await executeQuery(`select * from plan where api_key = '${userdata.api_key}'`);
        if(plan[0].type == "premium"){
           
            return res.status(429).send("akun anda sudah premium!")
            
        }
        const requestuser = await executeQuery(`select * from request_upgrade where user_id = ${userdata.user_id}`);
        console.log(requestuser);
        if(requestuser.length>0){
            const user = await executeQuery(`select * from users where email = '${userdata.email}'`);
            const saldoLama = user[0].balance;
            if(saldoLama<694200){
                return res.status(429).send("saldo anda tidak cukup!")
            }
            const variabel=1;
            const saldoBaru = parseInt(saldoLama) - 694200;
            await executeQuery(`update users set balance = ${saldoBaru} where email = '${userdata.email}'`);
            await executeQuery(`update plan set type = 'premium' where api_key = '${userdata.api_key}'`);
            const hasil=await executeQuery(`update request_upgrade set status = ${variabel} where user_id = ${userdata.user_id}`);
            console.log(hasil);
            return res.status(201).send({
                "message":"user dengan username "+userdata.username+" Berhasil melakukan upgrade plan"
            });
        }
        
        return res.status(201).send({
            "message":"user dengan username "+userdata.email+" belum pernah melakukan request upgrade",
        })
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});


module.exports = router;