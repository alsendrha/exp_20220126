//파일명 : config/auth.js

// 토큰발행
module.exports = {
    securitykey : '24erwefsvzsfgagagfaa',
    options : {
        algorithm : 'HS256', // 알고리즘
        expiresIn : '10h', // 만료시간
        issuer : 'DS' // 발행자
    },
}
