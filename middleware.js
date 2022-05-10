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
}