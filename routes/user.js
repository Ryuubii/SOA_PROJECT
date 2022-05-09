const express = require("express");
const router = express.Router();
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const joi = require('joi');
const pool = mysql.createPool({
    host: "localhost",
    database: "proyek_soa",
    user: "root",
    password: ""
});

const key = "proyeksoa";
const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function executeQuery(q){
    return new Promise(function(resolve, reject){
        pool.getConnection(function(err, conn){
            if(err){
                reject(err);
            }
            else{
                conn.query(q, function(err, results){
                    conn.release();
                    if(err){
                        reject(err);
                    }
                    else{
                        resolve(results);
                    }
                });
            }
        });
    });
}

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
        await executeQuery(`insert into users values(0, '${email}', '${username}', '${password}', '${nama}', '${no_telp}', '${alamat}', '${apikey}')`);
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

        const token = jwt.sign({email: cekUser[0].email, username: username, api_key: cekUser[0].api_key}, key, {expiresIn: '30m'});

        return res.status(200).send({
            "email": cekUser[0].email,
            "token": token
        })
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});


module.exports = router;