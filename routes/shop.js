// 파일명 : routes/shop.js
var express = require('express');
var router = express.Router();

const db = require('mongodb').MongoClient;
const dburl = require('../config/mongodb').URL;
const dbname = require('../config/mongodb').DB;

const itemCount = 16; // 한페이지에 보여줄 개수

const checkToken = require('../config/auth').ckeckToken;


// 주문목록
// localhost:3000/shop/orderlist
router.get('/orderlist', checkToken, async function(req, res, next) {
    try{
        const email = req.body.uid;
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('order1');

        const result = await collection.find(
            {orderid : email }, 
            {projection : {orderstep : 0, orderid : 0}}
        ).toArray();

        const collection1 = dbconn.db(dbname).collection('item1');
        for(let i=0;i<result.length;i++){
            const result1 = await collection1.findOne(
                {_id : result[i].itemcode }, 
                {projection : {name : 1, price : 1}}
            );

            result[i]['itemname'] = result1['name'];
            result[i]['itemprice'] = result1['price'];
        }
        
        return res.send({status:200, result:result});
    }
    catch(e){
        console.error(e);
         return res.send({status : -1, message : e });
    }
  });

// 시간대별 주문수량
// localhost:3000/shop/grouphour
router.get('/grouphour', async function(req, res, next) {
    try{
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('order1');

        const result = await collection.aggregate([
            {
                $project : { 
                    orderdate : 1, //주문일자
                    ordercnt : 1, // 주문수량
                    month : {$month : '$orderdate'}, // 주문일자를 이용해서 달
                    hour : {$hour : '$orderdate'}, // 주문일자를 이용해서 시간
                    minute : {$minute : '$orderdate'}, // 주문일자를 이용해서 분
                }
            },

            {
                $group : {
                    _id : '$hour', // 그룹할 항목
                    count : {
                        $sum : '$ordercnt'
                    }
                }
            },

        ]).toArray();
        return res.send({status:200, result:result});
    }
    catch(e){
        console.error(e);
         return res.send({status : -1, message : e });
    }
  });

// 상품별 주문수량
// localhost:3000/shop/groupitem?code=1078
router.get('/groupitem', async function(req, res, next) {
    try{
  
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('order1');

        // 그룹별 통계 aggregate
        const result = await collection.aggregate([
            {
                $match : {
                    itemcode : 1078
                }
            },
            {
                $project : { // 가져올 항목(물품코드, 주문수량)
                    itemcode : 1,
                    ordercnt : 1
                }
            },
            
            {
                $group : {
                    _id : '$itemcode', // 그룹할 항목
                    count : {
                        $sum : '$ordercnt'
                    }
                }
            },

            
        ]).toArray();
    
    
        return res.send({status:200, result:result});
    }
    catch(e){
        console.error(e);
         return res.send({status : -1, message : e });
    }
  });

// 메인화면 페이지 판매순, 가격순, 할인률, 베스트
// localhost:3000/shop/select?page=1
router.get('/select', async function(req, res, next) {
  try{

    const page = Number(req.query.page);

    const dbconn = await db.connect(dburl);
    const collection = dbconn.db(dbname).collection('item1');

    // SQL 문(INSERT, UPDATE, DELETE, SELECT)
    // SQL문을 이용해서 DB연동 mybatis
    // SQL문을 저장소를(함수) DB연동 jpa
    const result = await collection.find(
        {}, // 조건없음 전체 가져오기
        {projection : {filedata : 0, filetype : 0, filename : 0, filesize : 0, regdate : 0}}
    ).sort({_id : 1}) // 정렬(물품코드를 오름차순으로)
    .skip( (page-1)*itemCount ) // 생략할 개수
    .limit(itemCount)
    .toArray();

    // for => [{0},{1}] => 위치를 i로 반복
    // for(let i=0;i<result.length;i++){
    //     result[i]['imageUrl'] = `/shop/image?code=${result[i]._id}`;
    // }

    // foreach => [{},{}] => 내용을 tmp로 반복
    for(let tmp of result){
        tmp['imageUrl'] = `/shop/image?code=${tmp._id}`;
    }

    return res.send({status:200, result:result});
  }
  catch(e){
      console.error(e);
       return res.send({status : -1, message : e });
  }
});

// 상세화면페이지
// localhost:3000/shop/selectone?code=1
router.get('/selectone', async function(req, res, next) {
    try{
  
        const code = Number(req.query.code);
    
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('item1');
    
        const result = await collection.findOne(
          {_id : code }, 
          {projection : {filedata : 0, filetype : 0, filename : 0, filesize : 0, regdate : 0}}
        );

        // find [{},{}]
        // findOne { }
        result['imageUrl'] = `/shop/image?code=${code}`;
  
        return res.send({status:200, result:result});
    }
    catch(e){
        console.error(e);
         return res.send({status : -1, message : e });
    }
  });

  // 주문하기
  // localhost:3000/shop/order

  // _id       : (PK) 주문번호 시퀀스사용
  // itemcode  : (FK) 물품내역 (물품번호, 물품과 관련된 모든정보)
  // ordercnt  : 주문수량
  // orderid   : (FK) 주문자(이메일, 고객과 관련된 모든 정보)
  // orderdate : 주문일자
  // orderstep : 100(카트), 101(주문), 102(결제), 103(배송중), 104(배송완료)

  // 주문목록(조인) : member1 + item1 + order1
  // 로그인사용자의 토큰, 물품번호, 주문수량
  router.post('/order', checkToken, async function(req, res, next){
    try{

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('sequence');

        const result = await collection.findOneAndUpdate(
            {_id:'SEQ_ORDER1_NO'},
            {$inc : {seq : 1} } 
        );

        const obj  = {
            _id : result.value.seq, // 주문번호
            itemcode : Number(req.body.itemcode), // 물품번호
            ordercnt : Number(req.body.ordercnt), // 주문수량
            orderid  : req.body.uid,   // 주문자(토큰에서)
            orderdate : new Date(), //+ (1000*60*60*9), //9시간 더하기
            orderstep : 101,
        }

        const collection1 = dbconn.db(dbname).collection('order1');
        const result1 = await collection1.insertOne(obj);
        if(result1.insertedId === obj._id){
            return res.send({status:200});
        }
        return res.send({status:0});

    }
    catch(e){
        console.error(e);
        return res.send({status : -1, message : e});
    }
});


// 이미지 가져오기
// localhost:3000/shop/image?code=1038
router.get('/image', async function(req, res, next){
    try{
        const code = Number(req.query.code);

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('item1');

        // 조회하면 나오는 키정보확인
        const result = await collection.findOne(
            {_id : code},
            {projection : {filedata : 1, filename : 1, filetype : 1, filesize : 1}}
            // 0을 넣으면 빼는거 1을 넣으면 이것만 가져오는거
        );

        res.contentType(result.filetype);
        return res.send(result.filedata.buffer);

    }
    catch(e){
        console.error(e);
        return res.send({status : -1, message : e});
    }
});

// 물품삭제
// localhost:3000/shop/orderdelete
router.delete('/orderdelete', checkToken, async function(req, res, next){
    try{
        const code = req.body.code;

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('order1');

        const result = await collection.deleteOne(
            {_id : {$in : code}, orderid:req.body.uid},
        );

        if(result.deletedCount===code.length){
            return res.send({status : 200});
        }
        return res.send({status : 0});
    }
    catch(e){
        console.error(e);
        return res.send({status : -1, message : e});
    }
});


module.exports = router;