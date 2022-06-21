const express = require("express");
const router = express.Router();
const joi = require('joi');
const axios = require('axios');

const { executeQuery } = require("../connection");
const {logDB, authenticate, rateLimti} = require("../middleware");
const {response} = require("express");

const checkListAnime = async (list_id) => {
    const cekListAnime = await executeQuery(`select * from anime_lists where list_id = '${list_id}'`);
    if(cekListAnime.length <= 0){
        throw new Error("List anime tidak ditemukan");
    }
}

function releaseDate(tahun){
    const release_date = tahun;
    let potong = "";
    let tanggal = "";
    let tanggal_release = "";
    if(release_date != null){
        potong = release_date.toString().split('T')[0];
        tanggal = potong.split('-');
        tanggal_release = tanggal[2] +"-"+tanggal[1]+"-"+tanggal[0];
    }
    else{
        tanggal_release = "-";
    }
    return tanggal_release;
}

//1
router.get("/search", [authenticate, rateLimti, logDB], async function(req,res){
    try {
        let resutls = [];
        const {q} = req.query;
        const result = await axios.get(`https://api.jikan.moe/v4/anime?q='${q}'`);
        if(result.data.data.length <= 0){
            return res.status(404).send({"message":"Anime tidak ditemukan!"})
        }
        for (let i = 0;i<result.data.data.length;i++){
            const tanggal_release = releaseDate(result.data.data[i].aired.from);
            const r = {
                "mal_id": result.data.data[i].mal_id,
                "title": result.data.data[i].title,
                "release_date": tanggal_release
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
router.get("/detail/:id", [authenticate, rateLimti, logDB], async function(req,res){
    try {
        const id = req.params.id;
        const result = await axios.get(`https://api.jikan.moe/v4/anime/${id}`);
        const tanggal_release = releaseDate(result.data.data.aired.from);
        const r = {
            "mal_id": result.data.data.mal_id,
            "title": result.data.data.title,
            "type": result.data.data.type,
            "episodes": result.data.data.episodes,
            "airing": result.data.data.airing,
            "score": result.data.data.score,
            "release_date": tanggal_release
        }
        // console.log(item);
        return res.status(200).send(r);
    }
    catch (err){
        return res.status(404).send({
            "message":"Anime tidak ditemukan!"
        });
    }
});

//3
router.get("/readList", [authenticate, rateLimti, logDB], async function(req,res){
   try {
       const userdata = req.userdata;
       const animeLists = [];
       const animeList = await executeQuery(`select * from anime_lists where user_id = ${userdata.user_id}`);
       if(animeList.length <= 0){
           return res.status(200).send({"message":"Tidak mempunyai list anime"})
       }
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
router.post("/addList", [authenticate, rateLimti, logDB], async function(req,res){
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
router.put("/renameList", [authenticate, rateLimti, logDB], async function(req, res){
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
       if(animeList.length<=0){
           return res.status(200).send({
               "message":"List anime tidak ditemukan!"
           })
       }
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
router.delete("/deleteList", [authenticate, rateLimti, logDB], async function(req,res){
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
        const userdata = req.userdata;
        const {list_id} = req.body;

        const animeList = await executeQuery(`select * from anime_lists where list_id = ${list_id}`);
        if(animeList.length<=0){
            return res.status(200).send({
                "message":"List anime tidak ditemukan!"
            })
        }
        if(animeList[0].user_id != userdata.user_id){
            return res.status(400).send({
                "message": "Bukan list anda!"
            });
        }
        await executeQuery(`delete from anime_list_items where list_id = ${list_id}`);
        await executeQuery(`delete from anime_lists where list_id = ${list_id}`);

        return res.status(201).send({"message": "Berhasil menghapus list anime yang bernama " + animeList[0].list_name});
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

//7
router.post("/addToList", [authenticate, rateLimti, logDB], async function(req,res){
    const schema =
        joi.object({
            id_list_anime: joi.number().required(),
            id_anime: joi.number().required()
        })

    try {
        await schema.validateAsync(req.body);
    }
    catch (err) {
        return res.status(403).send(err.toString());
    }

    try {
        const userdata = req.userdata;
        const {id_list_anime, id_anime} = req.body;

        const cekList = await executeQuery(`select * from anime_lists where list_id = '${id_list_anime}' and user_id = ${userdata.user_id}`);
        if(cekList.length < 1){
            return res.status(404).send({"message" : "List anime tidak ditemukan"});
        }
        else{
            const result = await axios.get(`https://api.jikan.moe/v4/anime/${id_anime}`);
            const tanggal_release = releaseDate(result.data.data.aired.from);
            let tanggal = "";
            let release_tanggal = "";
            if(tanggal_release != '-'){
                tanggal = tanggal_release.split('-');
                release_tanggal = tanggal[2] +"-"+tanggal[1]+"-"+tanggal[0];
            }
            let title_fix = result.data.data.title.replace(/'/g, "#");
            let synopsis_fix = result.data.data.synopsis.toString().replace(/'/g, "#");
            const r = {
                "mal_id": result.data.data.mal_id,
                "title": title_fix,
                "type": result.data.data.type,
                "episodes": result.data.data.episodes,
                "synopsis": synopsis_fix,
                "release_date": tanggal_release,
                "list_id": parseInt(id_list_anime)
            }
            await executeQuery(`insert into anime_list_items values(0, ${r.mal_id},'${r.title}','${r.type}',${r.episodes},'${r.synopsis}', '${release_tanggal}',${id_list_anime})`);
            const listItemCount = await executeQuery(`select list_item_count from anime_lists where list_id = '${id_list_anime}'`);
            const tambah = listItemCount[0].list_item_count + 1;
            await executeQuery(`update anime_lists set list_item_count = '${tambah}' where list_id = '${id_list_anime}'`);
            return res.status(201).send({"message": "Berhasil menambahkan anime " + result.data.data.title + " ke list anime yang bernama " + cekList[0].list_name});
        }
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

//8
router.get("/readFromList", [authenticate, rateLimti, logDB], async function(req,res){
    try {
        const userdata = req.userdata;
        const {id_list_anime} = req.body;

        const cekList = await executeQuery(`select * from anime_lists where list_id = '${id_list_anime}' and user_id = ${userdata.user_id}`);
        if(cekList.length < 1){
            return res.status(404).send({"message" : "List anime tidak ditemukan"});
        }
        else{
            const dataanimeList = await executeQuery(`select * from anime_list_items where list_id = '${id_list_anime}'`);
            let item = [];
            for (let i = 0; i < dataanimeList.length; i++) {
                let title_fix = dataanimeList[i].title.replace(/#/g, "'");
                let synopsis_fix = dataanimeList[i].synopsis.toString().replace(/#/g, "'");
                item.push({
                    "mal_id": dataanimeList[i].mal_id,
                    "title": title_fix,
                    "type": dataanimeList[i].type,
                    "episodes": dataanimeList[i].episodes,
                    "synopsis": synopsis_fix,
                    "release_date": String(dataanimeList[i].release_date.getDate()).padStart(2, '0')+ "-" + String(dataanimeList[i].release_date.getMonth() + 1).padStart(2, '0') + "-" + dataanimeList[i].release_date.getFullYear()
                });
            }
            return res.status(200).send(item);
        }
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

//9
router.delete("/deleteFromList", [authenticate, rateLimti, logDB], async function(req,res){
    try {
        const userdata = req.userdata;
        const {id_list_anime, id_anime} = req.body;

        const cekList = await executeQuery(`select * from anime_lists where list_id = '${id_list_anime}' and user_id = ${userdata.user_id}`);
        if(cekList.length < 1){
            return res.status(404).send({"message" : "List anime tidak ditemukan"});
        }
        else{
            const cekanime = await executeQuery(`select * from anime_list_items where mal_id = '${id_anime}' and list_id = '${id_list_anime}'`);
            if(cekanime.length < 1){
                return res.status(404).send({"message" : "anime tidak ditemukan dari list"});
            }
            else{
                await executeQuery(`delete from anime_list_items where mal_id = '${id_anime}' and list_id = '${id_list_anime}'`);
                const listItemCount = await executeQuery(`select list_item_count from anime_lists where list_id = ${id_list_anime}`);
                const kurang = listItemCount[0].list_item_count - 1;
                await executeQuery(`update anime_lists set list_item_count = '${kurang}' where list_id = '${id_list_anime}'`);
                return res.status(201).send({"message": "Berhasil menghapus anime dari list "});
            }
        }

    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

//10
router.get("/random", [authenticate, rateLimti, logDB], async function(req,res){
    try {
        const result = await axios.get(`https://api.jikan.moe/v4/random/anime`);
        const tanggal_release = releaseDate(result.data.data.aired.from);
        let item = [];
        const r = {
            "mal_id": result.data.data.mal_id,
            "title": result.data.data.title,
            "type": result.data.data.type,
            "episodes": result.data.data.episodes,
            "synopsis": result.data.data.synopsis,
            "release_date": tanggal_release
        }
        item.push(r);
        return res.status(200).send(item);
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

module.exports = router;