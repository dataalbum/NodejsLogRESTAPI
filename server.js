var http = require('http');
var restify = require('restify');
var MongoClient = require('mongodb').MongoClient;
var moment = require('moment');
var port = process.env.OPENSHIFT_NODEJS_PORT || 1337,
    ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var dbUri = process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/logs'

// Server
var server = restify.createServer();

//date
var currentDate = moment().format('YYYY-MM-DD');
console.log('Today is ', currentDate);

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.fullResponse());

//Db connection
MongoClient.connect(dbUri, function (err, db) {
    if (err) throw err;
    console.log("Connected to Database");
    coll = db.collection('templog');
});

//Get all logs
server.get("/logs", function (req, res, next) {
    var cursor = coll.find();
    cursor.toArray(function (err, products) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        res.end(JSON.stringify(products));
    });
    return next();
});

//Get all logs from today
server.get("/logs/today", function (req, res, next) {
    //db.templog.find({timestamp: {$gt: '2015-06-05'}});
    var cursor = coll.find({
        timestamp: {
            $gte: currentDate
        }
    });
    cursor.toArray(function (err, products) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        res.end(JSON.stringify(products));
    });
    return next();
});

//Get log per id
server.get('/log/:id', function (req, res, next) {
    MongoClient.connect(dbUri, function (err, db) {
        if (err) throw err;
        console.log(" Connected to Database");
        db.collection('templog').findOne({
            id: req.params.id
        }, function (err, data) {
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8'
            });
            res.end(JSON.stringify(data));
        });
        return next();
        db.close();
    });
});

//Create log
server.post('/log', function (req, res, next) {
    var log = req.body;
    coll.insert(log,
        function (err, data) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        res.end(JSON.stringify(log));
/* 
         if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            res.json({
                type: true,
                data: log
            })
        }*/
    });
    return next();
});

//Update log
server.put('/log/:id', function (req, res, next) {
    MongoClient.connect(dbUri, function (err, db) {
        if (err) throw err;
        console.log(" Connected to Database");
        // get the existing log
        db.collection('templog').findOne({
            id: req.params.id
        }, function (err, data) {
            // merge req.params/log with the server/log
            
            var updLog = {}; // updated logs 
            // logic similar to jQuery.extend(); to merge 2 objects.
            for (var n in data) {
                updLog[n] = data[n];
            }
            for (var n in req.params) {
                updLog[n] = req.params[n];
            }
            db.collection('templog').update({
                id: req.params.id
            }, updLog, {
                multi: false
            }, function (err, data) {
                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8'
                });
                res.end(JSON.stringify(data));
            });
        });
        return next();
        db.close();
    });

});

//Delete log
server.del('/log/:id', function (req, res, next) {
    MongoClient.connect(dbUri, function (err, db) {
        if (err) throw err;
        console.log(" Connected to Database");
        db.collection('templog').remove({
            id: req.params.id
        }, function (err, data) {
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8'
            });
            res.end(JSON.stringify(true));
        });
        return next();
        db.close();
    });
});
/*
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');
}).listen(port);*/

server.listen(port, ip, function () {
    console.log("Server started @ ", port);
});

module.exports = server;