var express = require('express');
var router = express.Router();

//CMD> npm i mongodb --save
const db = require('mongodb').MongoClient;
const dburl = require('../config/mongodb').URL;
const dbname = require('../config/mongodb').DB;

//CMD> npm i multer --save
const multer = require('multer');
const upload = multer({storage:multer.memoryStorage()});


// 특정폴더에 파일로
// 메모리 DB에 추가

//POST : insert,
//PUT : update,
//DELETE : delete,
//GET : select...

// localhost:3000/board/insert
// 전송되는 값 : title, content, writer, image
// _id, regdate
router.post('/insert', upload.single("image"), async function(req, res, next) {
    try {
        console.log(req.body);
        console.log(req.file);
        // 1.DB접속
        const dbconn = await db.connect(dburl);
        // 2. DB선택 및 컬렉션 선택
        const collection = dbconn.db(dbname).collection('sequence');
        // 3. 시퀀스에서 값을 가져오고, 그 다음을 위해서 증가
        const result = await collection.findOneAndUpdate(
            {_id:'SEQ_BOARD1_NO'}, // 가지고 오기 위한 조건
            {$inc : {seq : 1} }  //seq값을 1증가시킴
        );

        console.log('______________________');
        // 4. 정상동작 유무를 위한 결과 확인
        console.log(result.value.seq);
        console.log('______________________');

        // 추가하고자 하는 항목 설정
        const obj = {
            _id     : result.value.seq,
            title   : req.body.title,
            content : req.body.content,
            writer  : req.body.writer,
            hit     : 1,
            filename : req.file.originalname,
            filedata : req.file.buffer,
            filetype : req.file.mimetype,
            filesize : req.file.size,
            regdate : new Date()
        };

        // 추가할 컬렉션 선택
        const collection1 = dbconn.db(dbname).collection('board1');
        // 추가하기
        const result1 = await collection1.insertOne(obj);
        // 확인
        if(result1.insertedId === result.value.seq){
            return res.send({status : 200});
        }
        return res.send({status : 0});
        
    }
    catch(e) {
        console.error(e);
        res.send({status : -1, message:e});
    }
});


//localhost:3000/board/image?_id=105
// 출력하고자하는 이미지의 게시물번호를 전달
router.get('/image', async function(req, res, next) {
    try{
        const no = Number (req.query['_id']);
        //const no = req.query._id; 같은거

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('board1');

        // 이미지 정보 가져오기
        const result = await collection.findOne(
            { _id : no }, // 조건
            {projection : {filedata : 1, filetype : 1} }, // 필요한 항목만 projection
        );

        // console.log(result);
        // application/json => image/png
        res.contentType(result.filetype);
        return res.send(result.filedata.buffer);

    }
    catch(e){
        console.error(e);
        res.send({status: -1, message:e});
    }
    
});

//localhost:3000/board/select?page=1&text=검색어
router.get('/select', async function(req, res, next){
    try{
        const page = Number(req.query.page); //페이지번호
        const text = req.query.text; //검색어

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('board1');

        // find(조건).sort(정렬).Array()로 사용
        // abc => a, b, c
        const result = await collection.find(
            //{title : text } 정확히 똑같아야함
            {title : new RegExp(text, 'i') }, //조건 text 'i' 대소문자 무시
            {projection : { _id:1, title:1, writer:1, hit:1, regdate:1 } } 
        )
        .sort({ _id : -1 })
        .skip( (page-1)*10 )
        .limit( 10 )
        .toArray(); // 오라클, MYsql SQL 문 => SELECT *....


        //결과확인
        console.log(result);
        // 검색어가 포함된 전체 게시물 개수 => 페이지네이션 번호 생성시 필요
        const result1 = await collection.countDocuments(
            {title : new RegExp(text, 'i') },
        );

        return res.send({status:200, rows:result, total:result1});
    }
    catch{
        console.error(e)
        res.send({status:-1, message:0});
    }
});


module.exports = router;
