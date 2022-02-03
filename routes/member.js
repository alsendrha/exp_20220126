var express = require('express');
var router = express.Router();

const db = require('mongodb').MongoClient;
const dburl = require('../config/mongodb').URL;
const dbname = require('../config/mongodb').DB;

// localhost:3000/member/insert
// 이메일, 암호, 이름 받기
// 등록일 자동생성
router.post('/insert', async function(req, res, next) {
  try{
    
   

    const obj = {
      _id : req.body.email,
      pw : req.body.password,
      name : req.body.name,
      regdate : new Date()
    }

    const dbconn = await db.connect(dburl);
    const collection = dbconn.db(dbname).callection('member2');
    
   


    
  

  }
  catch{
    console.error(e);
      res.send({status : -1, message:e});

  }
});

module.exports = router;
