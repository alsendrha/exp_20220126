var express = require('express');
var router = express.Router();

const db = require('mongodb').MongoClient;
const dburl = require('../config/mongodb').URL;
const dbname = require('../config/mongodb').DB;

// 문자를 HASH하기 (암호확인)
const crypto = require('crypto');

//토큰 발행을 위한 필요 정보 가져오기
const jwtkey = require('../config/auth').securitykey;
const jwtOptions = require('../config/auth').options;

//로그인 post
//localhost:3000/member/select
// 이메일, 암호 => 현시점에 생성된 토큰을 전송
router.post('/insert', async function(req, res, next) {
  try{
    // 1. 전송값 받기(이메일, 암호)
    const email = req.body.email;
    const pw = req.body.password;

    // 2. 암호는 바로 비교 불가 회원가입과 동일한hash후에 비교
    const hashPassword = crypto.createHmac('sha256', email)
      .update(pw).digest('hex'); // 실제 바꿔야될 값

    // 3. 회원정보가 일치하면 토큰을 발행
    const dbconn = await db.connect(dburl);
    const collection = dbconn.db(dbname).collection('member1');

    // 이메일과 hash한 암호가 둘다(AND) 일치
    const result = await collection.findOne(
      {_id : email, pw : hashPassword},
      );

    return res.send({status : 0});

  }
  catch(e){
    console.error(e);
      res.send({status : -1, message:e});

  }

});
//회원가입 
// localhost:3000/member/insert
// 이메일(PK), 암호, 이름 받기 등록일 (자동생성)
router.post('/insert', async function(req, res, next) {
  try{
    // 사용자1 aaa => agafafsdfsdfssdfsfssf => 16진수로
    // 사용자2 aaa => 34534545fsdfssdfsfssf => 16진수로
    const hashPassword = crypto.createHmac('sha256', req.body.email)
      .update(req.body.password).digest('hex'); // 실제 바꿔야될 값

    const obj = {
      _id : req.body.email,
      pw : hashPassword,
      name : req.body.name,
      regdate : new Date()
    }
    
    const dbconn = await db.connect(dburl);
    const collection = dbconn.db(dbname).collection('member1');

    const result = await collection.insertOne(obj);
    
    if(result.insertedId === req.body.email){
      return res.send({status : 200});
  }
  return res.send({status : 0});

  }
  catch(e){
    console.error(e);
      res.send({status : -1, message:e});

  }
});

module.exports = router;
