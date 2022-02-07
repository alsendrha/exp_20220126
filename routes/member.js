var express = require('express');
var router = express.Router();

const db = require('mongodb').MongoClient;
const dburl = require('../config/mongodb').URL;
const dbname = require('../config/mongodb').DB;

// 문자를 HASH하기 (암호확인)
const crypto = require('crypto');

//토큰 발행을 위한 필요 정보 가져오기
const jwt = require('jsonwebtoken');
const jwtkey = require('../config/auth').securitykey;
const jwtOptions = require('../config/auth').options;
const checkToken = require('../config/auth').ckeckToken;


// 회원정보수정 put
// localhost:3000/member/update
// 토큰 이메일(PK), 이름(변경할 내용)
router.put('/update', checkToken, async function(req, res, next) {
  try{
    console.log('이메일',req.body.uid);
    console.log('기존이름',req.body.uname);
    console.log('변경할이름',req.body.name);

    const dbconn = await db.connect(dburl);
    const collection = dbconn.db(dbname).collection('member1');

    const result = await collection.updateOne(
      {_id : req.body.uid}, // 조건
      { $set : {name : req.body.name}}, // 실제 변경할 항목들
      );

      if(result.modifiedCount === 1){
        return res.send({status:200});
      }

    return res.send({status : 0});
  }
  catch(e){
    console.error(e);
      res.send({status : -1, message:e});
  }
});

// 회원암호변경 put
// localhost:3000/member/updatepw
router.put('/updatepw', checkToken, async function(req, res, next) {
  try{

    const dbconn = await db.connect(dburl);
    const collection = dbconn.db(dbname).collection('member1');

    const result = await collection.updateOne(
      {_id : req.body.uid}, // 조건
      { $set : {password : req.body.password}}, // 실제 변경할 항목들
      );

      if(result.modifiedCount === 1){
        return res.send({status:200});
      }

    return res.send({status : 0});

  }
  catch(e){
    console.error(e);
      res.send({status : -1, message:e});
  }
});

// 회원탈퇴 delete
// localhost:3000/member/delete



//로그인 post
//localhost:3000/member/select
// 이메일, 암호 => 현시점에 생성된 토큰을 전송
router.post('/select', async function(req, res, next) {
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

      if(result !== null){ //로그인 가능
        const token = jwt.sign(
          {uid : email, uname : result.name },//토큰에 포함할 내용들...
          jwtkey,   // 토큰생성시 키값
          jwtOptions, // 토큰생성 옵션
          );

          return res.send({status:200, token:token});
      }

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

// 이메일 중복확인 get
// 이메일 => 결과
// localhost:3000/member/emailcheck
router.get('/emailcheck', async function(req, res, next) {
  try{

    const dbconn = await db.connect(dburl);
    const collection = dbconn.db(dbname).collection('member1');

    // 2. 일치하는 개수 리턴 0 또는 1
    const result = await collection.countDocuments({
      _id : req.query.email
    });

    return res.send({status : 200, result:result});
  }

  catch(e){
    console.error(e);
      res.send({status : -1, message:e});
  }
});


module.exports = router;
