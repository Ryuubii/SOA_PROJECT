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

//2
router.get("/detail/:id", [authenticate, logDB], async function(req,res){
    try {
        const id = req.params.id;
        const result = await axios.get(`https://api.jikan.moe/v4/manga/${id}`);
        console.log(result.data);
        const release_date = result.data.data.published.from;
        const potong = release_date.toString().split('T')[0];
        const tanggal = potong.split('-');
        const tanggal_release = tanggal[2] +"-"+tanggal[1]+"-"+tanggal[0];
        let item = [];
        const r = {
            "mal_id": result.data.data.mal_id,
            "title": result.data.data.title,
            "release_date": tanggal_release,
            "type": result.data.data.type,
            "chapters": result.data.data.chapters,
            "volumes": result.data.data.volumes,
            "synopsis": result.data.data.synopsis
        }
        item.push(r);
        // console.log(item);
        return res.status(200).send(item);
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

//7
router.get("/addToList", [authenticate, logDB], async function(req,res){
    const schema =
        joi.object({
            api_key: joi.string().required(),
            id_list_manga: joi.number().required(),
            id_manga: joi.number().required()
        })

    try {
        await schema.validateAsync(req.body);
    }
    catch (err) {
        return res.status(403).send(err.toString());
    }

    try {
        const userdata = req.userdata;
        const {api_key, id_list_manga, id_manga} = req.body;
        const cekUser = await executeQuery(`select * from users where api_key = '${api_key}'`);
        if(cekUser.length < 1){
            return res.status(404).send({"message" : "User tidak ditemukan"});
        }
        else{
            const cekList = await executeQuery(`select * from manga_lists where list_id = '${id_list_manga}'`);
            if(cekList.length < 1){
                return res.status(404).send({"message" : "List manga tidak ditemukan"});
            }
            else{
                const result = await axios.get(`https://api.jikan.moe/v4/manga/${id_manga}`);
                console.log(result.data);
                let item = [];
                const r = {
                    "mal_id": result.data.data.mal_id,
                    "title": result.data.data.title,
                    "type": result.data.data.type,
                    "chapters": result.data.data.chapters,
                    "volumes": result.data.data.volumes,
                    "synopsis": result.data.data.synopsis,
                    "list_id": id_list_manga
                }
                item.push(r);
                console.log(item[0].mal_id);
                // await executeQuery(`insert into manga_list_items values(0, ${item[0].mal_id},'${item[0].title}','${item[0].type}',${item[0].chapters},${item[0].volumes},'${item[0].synopsis}','${id_list_manga}' )`);
                return res.status(201).send({"message": "Berhasil menambahkan manga " + item[0].title + " ke list manga yang bernama " + cekList[0].list_name});
            }
        }
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

module.exports = router;