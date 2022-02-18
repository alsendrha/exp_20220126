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
            hit     : 1,                           //*************
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

// 게시판목록
//localhost:3000/board/select?page=1&text=
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
            {content : new RegExp(text, 'i') }, //조건 text 'i' 대소문자 무시      ****************
            {projection : { _id:1, title:1, content:1, writer:1, hit:1, regdate:1 } } 
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
    catch(e){
        console.error(e)
        res.send({status:-1, message:0});
    }
});

//게시판 상세내용
//localhost:3000/board/selectone?no=105
router.get('/selectone', async function(req, res, next){
    try{
        //1. 전송되는 값 받기(형변환에 주의)
        const no = Number(req.query.no);

        //2.db연결, db선택, 컬렉션선택
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('board1');

        //3. db에서 원하는 값 가져오기( findOne(1개) or find(n개) )
        const result = await collection.findOne(
            {_id : no}, //조건
            {projection : {filedata : 0, filename : 0, filesize : 0, filetype : 0}}, //필요한 컬럼만 0번주면 빠짐
        );

        // 4. 가져온 정보에서 이미지 정보를 추가함.
        // 이미지 URL, 이전글번호, 다음글번호
        result['imageurl'] = '/board/image?_id=' + no;

        // 108
        // 109  이전글
        // 113  <= 현재요청되는 글번호 위치
        // 120  다음글
        // 129
        // 130

        // {_id : {$lt : 113} } // 113미만 >
        // {_id : {$lte : 113} } // 113이하 =>
        // {_id : {$gt : 113} } // 113초과 < 
        // {_id : {$gte : 113} } // 113이상 <=


        const prev = await collection.find(
            {_id : {$lt : no} } ,//조건
            {projection : {_id : 1}} //필요한 컬럼만
        ).sort({_id:-1}).limit(1).toArray();


        console.log(prev); // [ { _id: 128 } ]  OR [](없는경우)    //개발자 확인 용도
        console.log(result); // 개발자 확인 용도

        if(prev.length > 0){ //이전글이 존재한다면
            result['prev'] = prev[0]._id;
        }
        else{ // 이전글이 존재하지 않다면
            result['prev'] = 0;
        }

        // 같은것 : find( {_id:113} ) 
        //          find( {_id : {$eq : 113} } )
        // 같지않음 : find( {_id : {$ne : 113} } )
        // 포함 : find( {_id : {$in:[113, 114, 115]} } ) 
        
        // 조건2개일치and \
        // find ( {_id:113, hit:34} ) 
        // find( {$and:[ {_id:113},{hit:77} ]} )

        // 조건2개중 1개만 or
        // find ( {$or : [ {_id:113},{hit:34} ]} )

        const next = await collection.find(
            {_id : {$gt : no}},
            {projection : {_id : 1}},
        ).sort({_id:1}).limit(1).toArray();

        console.log(next);

        if(next.length > 0){ // ===1 로해도됨
            result['next'] = next[0]._id;
        }
        else{
            result['next'] = 0;
        }

        res.send({status:200, result : result}); // 프론트로 전달함

    }
    catch(e){
        console.error(e); // 개발자가 확인하는 용도
        res.send({status:-1, message:0}); // 프론트로 전달함.
    }

});


//조회수 1씩 증가
// localhost:3000/board/updatehit?no=115
router.put('/updatehit', async function(req, res, next){
    try{
        // 1. 전달되는 값 받기
        const no = Number(req.query.no);

        // 2. db연동
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('board1');

        // 3. 조회수 증가

        const result = await collection.updateOne(
            {_id : no},//조건
            {$inc : {hit : 2} },//실제 수행할 내용 // ex)hit을 10씩 증가시킴    ******************
        );

        //DB 수행 후 반환되는 결과 값에 따라 적절한 값을 전달
        if(result.modifiedCount === 1){
            return res.send({status:200}); // 프론트로 전달함
        }
        return res.send({status : 0}); 
    }
    catch(e){
        console.error(e); // 개발자 확인용
        res.send({status:-1, message:e}); // 프론트로 전달함
    }

});

//글삭제
//localhost:3000/board/delete?no=115
router.delete('/delete', async function(req, res, next){
    try{
        // 1.전달되는 값 받기
        const no = Number(req.query.no);

        // 2. db연결
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('board1');

        // 3. 삭제 수행
        const result = await collection.deleteOne(
            {_id : no},
        );

        // 4. 결과 반환
        if(result.deletedCount === 1){
            return res.send({status : 200});
        }
        return res.send({status : 0});

    }
    catch(e){
        console.error(e)
        res.send({status : -1, message : e});

    }
});


//글수정 : 글번호(조건),  내용(제목, 내용, 작성자)
//localhost:3000/board/update?no=118
router.put('/update', async function(req, res, next){
    try{
        // 1.전달되는 값 받기
        const no = Number(req.query.no); // query
        const title = req.body.title; // body
        const content = req.body.content; // body
        const writer = req.body.writer; // body

        // 2. db연결
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('board1');

        // 3.  수행
        const result = await collection.updateOne(
            {_id : no},
            { $set : {title : title, content : content, writer : writer}},
        );

        // 4. 결과 반환
        if(result.modifiedCount === 1){
            return res.send({status : 200});
        }
        return res.send({status : 0});

    }
    catch(e){
        console.error(e)
        res.send({status : -1, message : e});

    }
});


//답글쓰기
// (기본키 : 답글번호(X)  - 줄별 데이터를 구분하는 고유한 값
//내용, 작성자            - 데이터 
// 외래키 : 원본글번호(board1) - 다른곳(board1의 글번호) 로만 사용 가능
// 등록일(X))                 - 데이터

//localhost:3000/board/insertreply
router.post('/insertreply', async function(req, res, next){
    try{
        // const content = req.body.content; //내용                     아래꺼
        // const writer = req.body.writer; //작성자
        // const boardno = Number(req.body.boardno); //원본글번호

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('sequence');

        const result = await collection.findOneAndUpdate(
            {_id : 'SEQ_BOARDREPLY1_NO'}, // 가지고 오기 위한 조건
            {$inc : {seq : 1}}            // 다음 값을 위해 srq값 1증가
        );

        const obj = {
            _id : result.value.seq, // 기본키 - 답글번호            위에꺼랑 연동
            content : req.body.content,     // 답글내용         content : content 
            writer : req.body.writer,        // 답글작성자       writer : writer
            boardno : Number(req.body.boardno),      // 외래키(답글써야될 번호)  boardno : boardno
            regdate : new Date()    // 답글 작성일자
        }

        const collection1 = dbconn.db(dbname).collection('boardreply1');
        const result1 = await collection1.insertOne(obj);

        if(result1.insertedId === result.value.seq){
            return res.send({status : 200});
        }
        return res.send({status : 0});
    }
    catch(e){
        console.error(e);
        res.send({status : -1, message : e});
    }
});


//답글조회
//localhost:3000/board/selectreply?no=121
router.get('/selectreply', async function(req, res, next){
    try{
        const no = Number(req.query.no)       

        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('boardreply1');

        const result = await collection.find(
            {boardno : no}, 
        ).toArray();

        return res.send({status:200, result:result});
    }
    catch(e){
        console.error(e);
        res.send({status : -1, message : e});
    }
});

//localhost:3000/board/deletereply?no=${no}
router.delete('/deletereply', async function(req, res, next){
    try{
        const no = Number(req.query.no);
        
        const dbconn = await db.connect(dburl);
        const collection = dbconn.db(dbname).collection('boardreply1');

        const result = await collection.deleteOne(
            {_id : no},
        );

        if(result.deletedCount === 1){
            return res.send({status : 200, result:result});
        }
        return res.send({status : 0});
    }
    catch(e){
        console.error(e);
        res.send({status : -1, message : e});
    }
});



module.exports = router;
