const express = require("express");
const router = express.Router();
const joi = require('joi');
const axios = require('axios');

const { executeQuery } = require("../connection");
const {logDB, authenticate} = require("../middleware");
const {response} = require("express");

const checkListAnime = async (list_id) => {
    const cekListAnime = await executeQuery(`select * from anime_lists where list_id = '${list_id}'`);
    if(cekListAnime.length <= 0){
        throw new Error("List anime tidak ditemukan");
    }
}

//1
router.get("/search", [authenticate, logDB], async function(req,res){
    try {
        let resutls = [];
        const {q} = req.query;
        const result = await axios.get(`https://api.jikan.moe/v4/anime?q='${q}'`);
        for (let i = 0;i<result.data.data.length;i++){
            const r = {
                "mal_id": result.data.data[i].mal_id,
                "title": result.data.data[i].title,
                "type": result.data.data[i].type,
                "episodes": result.data.data[i].episodes,
                "synopsis": result.data.data[i].synopsis
            }

            resutls.push(r);
        }
        return res.status(200).send(resutls);
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

//3
router.get("/readList", [authenticate, logDB], async function(req,res){
   try {
       const userdata = req.userdata;
       const animeLists = [];
       const animeList = await executeQuery(`select * from anime_lists where user_id = ${userdata.user_id}`);
       for(let i = 0;i<animeList.length;i++){
           const a = {
               "list_id": animeList[i].list_id,
               "list_name": animeList[i].list_name,
               "anime_count": animeList[i].list_item_count
           }

           animeLists.push(a);
       }
       return res.status(200).send(animeLists);
   }
   catch (err){
       return res.status(500).send(err.toString());
   }
});

//4
router.post("/addList", [authenticate, logDB], async function(req,res){
    const schema =
        joi.object({
            nama_list: joi.string().required(),
        })

    try {
        await schema.validateAsync(req.body);
    }
    catch (err) {
        return res.status(403).send(err.toString());
    }

    try {
        const userdata = req.userdata;
        const {nama_list} = req.body;
        await executeQuery(`insert into anime_lists values(0, '${nama_list}', 0, ${userdata.user_id} )`);

        return res.status(201).send({"message" : "Berhasil membuat list dengan nama " + nama_list});
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

//5
router.put("/renameList", [authenticate, logDB], async function(req, res){
    const schema =
        joi.object({
            list_id: joi.string().external(checkListAnime).required(),
            nama_list: joi.string().required(),
        })

    try {
        await schema.validateAsync(req.body);
    }
    catch (err) {
        return res.status(403).send(err.toString());
    }

   try {
        const userdata = req.userdata;
       const {list_id, nama_list} = req.body;
       const animeList = await executeQuery(`select * from anime_lists where list_id = ${list_id}`);

       if(animeList[0].user_id != userdata.user_id){
           return res.status(400).send({
               "message": "Bukan list anda!"
           });
       }

       await executeQuery(`update anime_lists set list_name = '${nama_list}' where list_id = ${list_id}`);

       return res.status(201).send({"message": "Berhasil mengubah nama list dari " + animeList[0].list_name + " menjadi " + nama_list});
   }
   catch (err){
       return res.status(500).send(err.toString());
   }
});

//6
router.delete("/deleteList", [authenticate, logDB], async function(req,res){
    const schema =
        joi.object({
            list_id: joi.string().external(checkListAnime).required(),
        })

    try {
        await schema.validateAsync(req.body);
    }
    catch (err) {
        return res.status(403).send(err.toString());
    }

    try {
        const {list_id} = req.body;

        const animeList = await executeQuery(`select * from anime_lists where list_id = ${list_id}`);

        await executeQuery(`delete from anime_list_items where list_id = ${list_id}`);
        await executeQuery(`delete from anime_lists where list_id = ${list_id}`);

        return res.status(201).send({"message": "Berhasil menghapus list anime yang bernama " + animeList[0].list_name});
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

module.exports = router;