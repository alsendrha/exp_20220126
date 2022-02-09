//파일명 : routes/seller.js
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

const multer = require('multer');
const upload = multer({storage:multer.memoryStorage()});




// 물품일괄수정
// localhost:3000/seller/update
router.put('/update', checkToken, upload.array("image"), async function(req, res, next){
    try{

        // db연결
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('item1');

        // req.body => {code : [1015, 1016], title : ['a', 'b']}
        // req.files => [{  }, {  }]

        let cnt = 0; //실제적으로 변경한 개수를 누적할 변수
        for(let i=0;i<req.body.title.length;i++){
            let.obj ={
                name : req.body.title[i],
                price : req.body.price[i],
                quantity : req.body.quantity[i],
                content : req.body.content[i],
            };

            // 이미지 첨부하면 키를 4개더 추가 8개
            if(typeof req.files[i] !== 'undefind') {
                obj['filename'] = req.files[i].originalname;
                obj['filedata'] = req.files[i].buffer;
                obj['filetype'] = req.files[i].mimetype;
                obj['filesize'] = req.files[i].size;
            }    

            const result = await collection.updateOne(
                {_id  : req.body.code[i] },//조건
                {$set : obj }, // 변경내용
            );
            cnt += result.matchedCount;
        }

        // 실제 변경된 개수 === 처음 변경하기 위해 반복했던 개수 일치유무
        if(cnt === req.body.title.length){
            return res.send({status : 200});
        }

        return res.send({status : 0});
    }
    catch(e){
        console.error(e);
        return res.send({status : -1, message : e});
    }
});



// 물품일괄삭제 : 
// localhost:3000/seller/delete
router.delete('/delete', checkToken, async function(req, res, next){
    try{
        // {"code":[1027,1028,1029]}
        const code = req.body.code;
        console.log(code);

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('item1');

        // {$in : [1,2,3,4]} 포함 된 항목
        const result = await collection.deleteMany(
            {_id : {$in : code} }
        )

        console.log(result);
        if(result.deletedCount===1){
            return res.send({status:200});
        }
        return res.send({status : 0});

    }
    catch(e){
        console.error(e);
        return res.send({status : -1, message : e});
    }
});


// 물품등록 : 로그인, 이미지를 포함하여 n개
// localhost:3000/seller/insert
// 로그인을 한 사용자가 판매자
router.post('/insert', upload.array("image"), checkToken, async function(req, res, next) {
    try{

        console.log(req.body); // 물품명, 가격, 수량, 내용
        //전송1 body = {key:[1,2], key1:[2,3]}

        //전송참고 body = {key, key1}//1개일때

        //전송2 files = [{  }, {  }]
        //최종 arr = [{  }, {  }]
        

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('sequence');
        
        
        const arr =[];
        for(let i=0;i<req.body.title.length;i++){
            const result = await collection.findOneAndUpdate(
                {_id:'SEQ_ITEM1_NO'},
                {$inc : {seq : 1} } 
            );

            arr.push({
                _id : result.value.seq,
                name : req.body.title[i],
                price : req.body.price[i],
                quantity : req.body.quantity[i],
                content : req.body.content[i],

                filename : req.files[i].originalname,
                filedata : req.files[i].buffer,
                filetype : req.files[i].mimetype,
                filesize : req.files[i].size,
                regdate : new Date(),
                seller : req.body.uid, // checktoken에 넣어줌
            });
            

        }
        console.log(arr); // 물품명, 가격, 수량, 내용

        const collection1 = dbconn.db(dbname).collection('item1');
        const result1 = await collection1.insertMany(arr);
        console.log(result1);
        if(result1.insertedCount === req.body.title.length){
        return res.send({status : 200});
        }
        return res.send({status : 0});
       
    }
    catch(e){
        console.error(e);
        return res.send({status : -1, message : e});
        
    }
});

// 믈품1개 조회(물품코드가 전달되면)
// localhost:3000/seller/selectone?code=1038
router.get('/selectone', checkToken, async function(req, res, next){
    try{
        const email = req.body.uid;
        const code = Number(req.query.code);

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('item1');

        const result = await collection.findOne(
            {_id : code, seller : email},
            {projection : {filedata : 0, filename : 0, filetype : 0, filesize : 0}}
        );

             //없는 변수만들어야됨, 있는 변수(키)로 만들면 변경됨
        result['imageurl'] = `/seller/image?code=${code}`;
       // result.imageurl = `/seller/image?code=${code}`; 위에랑 같은거

        console.log(result);
        return res.send({status:200, result:result});

    }
    catch(e){
        console.error(e);
        return res.send({status : -1, message : e});
    }
});

// 물품전체 조회(판매자 토큰에 해당하는 것만)
// localhost:3000/seller/selectlist
router.get('/selectlist', checkToken, async function(req, res, next){
    try{
        //키가 uid 인 이유는 로그인시에 토큰생성시 사용했던 키정보
        const email = req.body.uid;

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('item1');

        // 조회하면 나오는 키정보확인
        const result = await collection.find(
            {seller : email},
            {projection : {filedata : 0, filename : 0, filetype : 0, filesize : 0}}
        ).sort( {_id : -1} ).toArray(); // 정렬

        // result => [{insert[0]},{insert[1]},{insert[2]},{insert[3]},]
        // 변수에 없는키를 넣어야 추가 됨. 있는 키는 변경

        // 이미지 반복문으로 불러옴
        for(let i=0;i<result.length;i++){
            result[i]['imageurl'] = `/seller/image?code=${result[i]._id}`;

        }

        console.log(result);
        return res.send({status:200, result:result});

    }
    catch(e){
        console.error(e);
        return res.send({status : -1, message : e});
    }
});

// 물품 이미지 표시(물품코드가 전달되면 이미지 표시)
// localhost:3000/seller/image?code=1038
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

// console.log(req) 모르겠으면 req찍어보기
// 조회 get => req.query => URL에 정보가 포함
// 추가 post => req.body => URL에 정보가 없으면
// 변경 put => 
// 삭제 delete => 

// 물품번호 n개에 해당하는 항목 조회(물품코드 배열로 전달)
// localhost:3000/seller/selectcode?c=1037&c=1038
// {code : [1021, 1022]}
router.get('/selectcode', async function(req, res, next){
    try{
        let code = req.query.c;

        // 반복문을 통해서 문자를 숫자로 변경(n개)
        for(let i=0;i<code.length;i++){
            code[i] = Number(code[i]);
        }
        console.log(code);

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('item1');

        // 조회하면 나오는 키정보확인
        const result = await collection.find(
            {_id :  {$in : code}},
            {projection : {filedata : 0, filename : 0, filetype : 0, filesize : 0}}
        ).sort( {_id : 1} ).toArray(); // 정렬

        for(let i=0;i<result.length;i++){
            result[i]['imageurl'] = `/seller/image?code=${result[i]._id}`;
        }

        console.log(result);
        return res.send({status:200, result:result});

    }
    catch(e){
        console.error(e);
        return res.send({status : -1, message : e});
    }
});


// 서버이지미 등록하기(n개)
// 물품에 따라서 개수가 다 다르다.
// 게시판원본글(게시글번호, 1) ---------- (N)원본글에다는댓글(게시판글번호)
// 물품(물품번호, 1) ---------------- (N)서버이미지(물품번호)
// localhost:3000/seller/subimage
router.post('/subimage', upload.array("image"), checkToken, async function(req, res, next) {
    try{
        
        const code = Number(req.body.code); // 원본 물품번호
        // [ { }, { }, { } ]
        //console.log(req.files);

        // 시퀀스를 가져오기 위한 db연결
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('sequence');

        let arr = [];
        for(let i=0;i<req.files.length;i++){
            const result = await collection.findOneAndUpdate(
                {_id:'SEQ_ITEMIMG1_NO'},
                {$inc : {seq : 1} } 
            );

            arr.push({
                _id      : result.value.seq,  //PK 기본키
                filename : req.files[i].originalname,
                filedata : req.files[i].buffer,
                filetype : req.files[i].mimetype,
                filesize : req.files[i].size,
                itemcode : code,   //FK 외래키 물품코드
                regdate  : new Date(),
            });
        }

        // [ { }, { }, { } ] => insertMany(arr)

        const collection1 = dbconn.db(dbname).collection('itemimg1');
        const result1 = await collection1.insertMany(arr);
        console.log(result1);
        if(result1.insertedCount === req.files.length){
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
