const jwt = require("jsonwebtoken");
const { executeQuery } = require("./connection")
const key = "proyeksoa";

module.exports = {
    authenticate: async function (req, res, next){
        try {
            if(!req.headers["x-auth-token"]){
                return res.status(401).send({ "msg": "Unauthorized!" });
            }
            const header = req.headers["x-auth-token"];
            const userdata = jwt.verify(header, key);
            req.userdata= userdata;
            next();
        }
        catch (err){
            return res.status(500).send(err.toString())
        }
    },
    logDB: async function (req, res, next){
        const header = req.headers["x-auth-token"];
        const userdata = jwt.verify(header, key);
        await executeQuery(`insert into access_log values (0, '${userdata.api_key}', '${req.path}', '${req.url}', now())`);
        next();
    },
    rateLimti:async function(req,res,next){
        const userdata = req.userdata;
        const plan = await executeQuery(`select * from plan where api_key = '${userdata.api_key}'`);
        if(plan[0].type == "free"){
            let accesses = await executeQuery(`select * from access_log where accessed_at > now() - interval 10 second and api_key = '${userdata.api_key}'`);
            if(accesses.length >= 1){
                return res.status(429).send("Akses anda melebihi batas!")
            }
        }

        next();
    },
}