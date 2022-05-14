const express = require('express');
const app = express();
const user = require("./routes/user");
const anime = require("./routes/anime");
const manga = require("./routes/manga");
app.use(express.urlencoded({extended: true}));
app.use("/api/user",user);
app.use("/api/anime", anime);
app.use("/api/manga", manga);

const port = 3000;
app.listen(port, () => {
    console.log(`Alive at http://localhost:${port}`);
});