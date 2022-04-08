const Models = require("../Models/UrlModel")
const ValidURL = require('valid-url');
const shortid = require('shortid');
const redis = require("redis");
const { promisify } = require("util");

const redisClient = redis.createClient(
  18055,
  "redis-18055.c212.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("60rXKwytcepxXSIk2cQdNmwNFSY82H4o", function (err) {
  if (err) throw err;
});


redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false
  if (typeof value === 'string' && value.trim().length === 0) return false
  return true;
}

const urlCode = shortid.generate()
const ShortingUrl = async function (req, res) {
  try {
    const data = req.body
    const { longUrl } = data

    const baseurl = 'http://localhost:3000'


    if (!isValid(longUrl)) {
      return res.status(400).send({ status: false, msg: "Please enter Long url" })
    }
    if (!/^(http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(longUrl.trim())) {

      return res.status(400).send({ status: false, message: "please provide valid URL" })
   }


    const shortUrll = await Models.findOne({ longUrl: longUrl })

    if (isValid(shortUrll)) {
      return res.status(200).send({ status: true, data: shortUrll })
    }
    else {
      const shortUrl = baseurl + '/' + urlCode
      const result = await Models.create({ longUrl: longUrl, shortUrl: shortUrl, urlCode: urlCode })
      const saveShortUrl = await SET_ASYNC(`${urlCode}`, JSON.stringify(result.shortUrl))
      return res.status(201).send({ status: true, msg: "Data created sucessfully", data: result })
    }
  } catch (error) {
    return res.status(500).send({ msg: error.message })
  }
}

//-------------------------------------------------------------------------------------------------//


//-----------SECOND API PULL LONG URL BY REDIRECTING
const geturl = async function (req, res) {
  try {
    const urlCode = req.params.urlCode.trim().toLowerCase()
    if (!isValid(urlCode)) {
      return res.status(400).send({ status: false, message: 'Please provide valid urlCode' })
    }

    //---FETCH THE DATA BY URLCODE IN REDIS
    let checkforUrl = await GET_ASYNC(`${urlCode}`)
    if (checkforUrl) {
      return res.redirect(302, checkforUrl)
    }
    //---FETCH THE DATA IN MONGO DB IF IT IS NOT PRESENT IN CACHE
    const url = await Models.findOne({ urlCode: urlCode })
    if (!url) {
      return res.status(404).send({ status: false, message: 'No URL Found' })
    }
    //---SET GENERATE DATA IN CACHE
    await SET_ASYNC(`${urlCode}`, JSON.stringify(url.longUrl))
    return res.redirect(302, url.longUrl)
  } catch (err) {
    console.log(err)
    res.status(500).send('Server Error')
  }
}

module.exports.ShortingUrl = ShortingUrl
module.exports.geturl = geturl
