const express = require("express");
const router = express.Router();
const joi = require('joi');
const axios = require('axios');

const { executeQuery } = require("../connection");
const {logDB, authenticate} = require("../middleware");
const {response} = require("express");

const checkListAnime = async (list_id) => {
    const cekListAnime = await executeQuery(`select * from manga_lists where list_id = '${list_id}'`);
    if(cekListAnime.length <= 0){
        throw new Error("List manga tidak ditemukan");
    }
}

//1
router.get("/search", [authenticate, logDB], async function(req,res){
    try {
        let resutls = [];
        const {q} = req.query;
        const result = await axios.get(`https://api.jikan.moe/v4/manga?q='${q}'`);
        console.log(result.data);
        for (let i = 0;i<result.data.data.length;i++){
            const r = {
                "mal_id": result.data.data[i].mal_id,
                "title": result.data.data[i].title,
                "type": result.data.data[i].type,
                "chapters": result.data.data[i].chapters,
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
       const mangaLists = [];
       const mangaList = await executeQuery(`select * from manga_lists where user_id = ${userdata.user_id}`);
       for(let i = 0;i<mangaList.length;i++){
           const a = {
               "list_id": mangaList[i].list_id,
               "list_name": mangaList[i].list_name,
               "manga_count": mangaList[i].list_item_count
           }

           mangaLists.push(a);
       }
       return res.status(200).send(mangaLists);
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
        await executeQuery(`insert into manga_lists values(0, '${nama_list}', 0, ${userdata.user_id} )`);

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
       const mangaList = await executeQuery(`select * from manga_lists where list_id = ${list_id}`);

       if(mangaList[0].user_id != userdata.user_id){
           return res.status(400).send({
               "message": "Bukan list anda!"
           });
       }

       await executeQuery(`update manga_lists set list_name = '${nama_list}' where list_id = ${list_id}`);

       return res.status(201).send({"message": "Berhasil mengubah nama list dari " + mangaList[0].list_name + " menjadi " + nama_list});
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

        const mangaList = await executeQuery(`select * from manga_lists where list_id = ${list_id}`);
        console.log("masuk");
        await executeQuery(`delete from manga_list_items where list_id = ${list_id}`);
        await executeQuery(`delete from manga_lists where list_id = ${list_id}`);

        return res.status(201).send({"message": "Berhasil menghapus list manga yang bernama " + mangaList[0].list_name});
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

module.exports = router;