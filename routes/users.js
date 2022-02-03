var express = require('express');
var router = express.Router();

// localhist:3000/users/
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// localhist:3000/users/a1
router.get('/a1', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
