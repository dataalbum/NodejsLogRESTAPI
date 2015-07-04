var http = require('http');
var restify = require('restify');
var MongoClient = require('mongodb').MongoClient;
var moment = require('moment');
var port = process.env.OPENSHIFT_NODEJS_PORT || 1337,
    ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var dbUri = process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/logs'

// Server
var server = restify.createServer();

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

//Get all logs by datetime (logs/YYYYMMDDHHmm)
server.get("/logs/temperature/:utcdatetime", function (req, res, next) {
    //db.templog.find({timestamp: {$gt: '2015-06-05'}});
    var startisodate = moment.utc(req.params.utcdatetime, 'YYYYMMDDHHmm').format();
    var endisodate = moment.utc(startisodate).add(1, 'days').format();
    
    console.log("Start date: ", startisodate);
    console.log("End date: ", endisodate)
    var cursor = coll.find({
        timestamp: {
            $gte: startisodate,
            $lt: endisodate
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

//Get all logs as xy by datetime (logs/YYYYMMDDHHmm)
server.get("/logs/temperature/timeseries/:utcdatetime", function (req, res, next) {
    //db.templog.find({timestamp: {$gt: '2015-06-05'}});
    //db.templog.aggregate([{"$match":{timestamp: {$gt: '2015-06-18'}}},{"$project":{_id:0,x: "$timestamp",y:"$value"}}])
    
    //db.templog.aggregate([{"$match":{timestamp: {$gt: '2015-06-18'}}},{$group:{_id:"$measurename", data:{$push: {x:"$timestamp",y:"$value"}}}}])
    
    var startisodate = moment.utc(req.params.utcdatetime, 'YYYYMMDDHHmm').format();
    var endisodate = moment.utc(startisodate).add(1, 'days').format();
    
    console.log("Start date: ", startisodate);
    console.log("End date: ", endisodate)
    var cursor = coll.aggregate([{
            "$match": {
                timestamp: {
                    $gt: startisodate,
                    $lt: endisodate
                }
            }
        },
        {
            $group: {
                _id: "$measurename", 
                data: {
                    $push: {
                        x: "$timestamp",
                        y: "$value"
                    }
                }
            }
        }]);
    cursor.toArray(function (err, logs) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        res.end(JSON.stringify(logs));
    });
    return next();
});



//Create log
server.post('/log', function (req, res, next) {
    var log = req.body;
    coll.insert(log,
        function (err, data) {
        /*
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        res.end(JSON.stringify(log));
        */
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
        }
        //console.log(" Record added as " + log[0]._id);
        console.log("Data: ", log);
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

server.listen(port, ip, function () {
    console.log("Server started @ ", port);
});

module.exports = server;