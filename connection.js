const mysql = require("mysql");
const pool = mysql.createPool({
    host: "remotemysql.com",
    database: "7T0Y5Gv5IN",
    user: "7T0Y5Gv5IN",
    password: "kXTh9rb5nw"
});

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

module.exports = { executeQuery: executeQuery }