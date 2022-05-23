const express = require("express");
const router = express.Router();
const joi = require('joi');
const axios = require('axios');

const { executeQuery } = require("../connection");
const {logDB, authenticate, rateLimti} = require("../middleware");
const {response} = require("express");

const checkListAnime = async (list_id) => {
    const cekListAnime = await executeQuery(`select * from manga_lists where list_id = '${list_id}'`);
    if(cekListAnime.length <= 0){
        throw new Error("List manga tidak ditemukan");
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
        const result = await axios.get(`https://api.jikan.moe/v4/manga?q='${q}'`);
        for (let i = 0;i<result.data.data.length;i++){
            const release_date = releaseDate(result.data.data[i].published.from);
            const r = {
                "mal_id": result.data.data[i].mal_id,
                "title": result.data.data[i].title,
                "release_date": release_date,
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
        const result = await axios.get(`https://api.jikan.moe/v4/manga/${id}`);
        const tanggal_release = releaseDate(result.data.data.published.from);
        let item = [];
        const r = {
            "mal_id": result.data.data.mal_id,
            "title": result.data.data.title,
            "type": result.data.data.type,
            "chapters": result.data.data.chapters,
            "volumes": result.data.data.volumes,
            "synopsis": result.data.data.synopsis,
            "release_date": tanggal_release,
        }
        item.push(r);
        return res.status(200).send(item);
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

//3
router.get("/readList", [authenticate, rateLimti, logDB], async function(req,res){
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
        await executeQuery(`insert into manga_lists values(0, '${nama_list}', 0, ${userdata.user_id} )`);

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
        const {list_id} = req.body;

        const mangaList = await executeQuery(`select * from manga_lists where list_id = ${list_id}`);
        await executeQuery(`delete from manga_list_items where list_id = ${list_id}`);
        await executeQuery(`delete from manga_lists where list_id = ${list_id}`);

        return res.status(201).send({"message": "Berhasil menghapus list manga yang bernama " + mangaList[0].list_name});
    }
    catch (err){
        return res.status(500).send(err.toString());
    }
});

//7
router.post("/addToList", [authenticate, rateLimti, logDB], async function(req,res){
    const schema =
        joi.object({
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
        const {id_list_manga, id_manga} = req.body;

        const cekList = await executeQuery(`select * from manga_lists where list_id = '${id_list_manga}' and user_id = ${userdata.user_id}`);
        if(cekList.length < 1){
            return res.status(404).send({"message" : "List manga tidak ditemukan"});
        }
        else{
            const result = await axios.get(`https://api.jikan.moe/v4/manga/${id_manga}`);
            const tanggal_release = releaseDate(result.data.data.published.from);
            let tanggal = "";
            let release_tanggal = "";
            if(tanggal_release != '-'){
                tanggal = tanggal_release.split('-');
                release_tanggal = tanggal[2] +"-"+tanggal[1]+"-"+tanggal[0];
            }
            let item = [];
            let title_fix = result.data.data.title.replace(/'/g, "#");
            let synopsis_fix = result.data.data.synopsis.toString().replace(/'/g, "#");
            const r = {
                "mal_id": result.data.data.mal_id,
                "title": title_fix,
                "type": result.data.data.type,
                "chapters": result.data.data.chapters,
                "volumes": result.data.data.volumes,
                "synopsis": synopsis_fix,
                "release_date": tanggal_release,
                "list_id": parseInt(id_list_manga)
            }
            item.push(r);
            await executeQuery(`insert into manga_list_items values(0, ${item[0].mal_id},'${item[0].title}','${item[0].type}',${item[0].chapters},${item[0].volumes},'${item[0].synopsis}', '${release_tanggal}',${id_list_manga})`);
            const listItemCount = await executeQuery(`select list_item_count from manga_lists where list_id = '${id_list_manga}'`);
            const tambah = listItemCount[0].list_item_count + 1;
            await executeQuery(`update manga_lists set list_item_count = '${tambah}' where list_id = '${id_list_manga}'`);
            return res.status(201).send({"message": "Berhasil menambahkan manga " + result.data.data.title + " ke list manga yang bernama " + cekList[0].list_name});
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
        const {id_list_manga} = req.body;

        const cekList = await executeQuery(`select * from manga_lists where list_id = '${id_list_manga}' and user_id = ${userdata.user_id}`);
        if(cekList.length < 1){
            return res.status(404).send({"message" : "List manga tidak ditemukan"});
        }
        else{
            const dataMangaList = await executeQuery(`select * from manga_list_items where list_id = '${id_list_manga}'`);
            let item = [];
            for (let i = 0; i < dataMangaList.length; i++) {
                let title_fix = dataMangaList[i].title.replace(/#/g, "'");
                let synopsis_fix = dataMangaList[i].synopsis.toString().replace(/#/g, "'");
                item.push({
                    "mal_id": dataMangaList[i].mal_id,
                    "title": title_fix,
                    "type": dataMangaList[i].type,
                    "chapters": dataMangaList[i].chapters,
                    "volumes": dataMangaList[i].volumes,
                    "synopsis": synopsis_fix,
                    "release_date": String(dataMangaList[i].release_date.getDate()).padStart(2, '0')+ "-" + String(dataMangaList[i].release_date.getMonth() + 1).padStart(2, '0') + "-" + dataMangaList[i].release_date.getFullYear()
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
        const {id_list_manga, id_manga} = req.body;

        const cekList = await executeQuery(`select * from manga_lists where list_id = '${id_list_manga}' and user_id = ${userdata.user_id}`);
        if(cekList.length < 1){
            return res.status(404).send({"message" : "List manga tidak ditemukan"});
        }
        else{
            const cekManga = await executeQuery(`select * from manga_list_items where mal_id = '${id_manga}' and list_id = '${id_list_manga}'`);
            if(cekManga.length < 1){
                return res.status(404).send({"message" : "Manga tidak ditemukan dari list"});
            }
            else{
                await executeQuery(`delete from manga_list_items where mal_id = '${id_manga}' and list_id = '${id_list_manga}'`);
                const listItemCount = await executeQuery(`select list_item_count from manga_lists where list_id = ${id_list_manga}`);
                const kurang = listItemCount[0].list_item_count - 1;
                await executeQuery(`update manga_lists set list_item_count = '${kurang}' where list_id = '${id_list_manga}'`);
                return res.status(201).send({"message": "Berhasil menghapus manga dari list "});
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
        const result = await axios.get(`https://api.jikan.moe/v4/random/manga`);
        const tanggal_release = releaseDate(result.data.data.published.from);
        let item = [];
        const r = {
            "mal_id": result.data.data.mal_id,
            "title": result.data.data.title,
            "type": result.data.data.type,
            "chapters": result.data.data.chapters,
            "volumes": result.data.data.volumes,
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