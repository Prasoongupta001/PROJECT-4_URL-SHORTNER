const express = require('express');
const router = express.Router();
const Controller = require("../Controllers/UrlController")



router.post("/Url/shortner",Controller.ShortingUrl)

router.get("/:urlCode",Controller.geturl)




module.exports= router;