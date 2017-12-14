var express = require('express');
var app = express();
var http = require("http");
var bodyParser = require("body-parser");
var querystring = require("querystring")

// var cloudServer = "www.apio.cloud"
// var cloudServer = "dev.apio.cloud"
var cloudServer = "experimental2036.cloudapp.net" 
var exclusive = true;
var socketStore_Service = require("socket.io-client")("http://" + cloudServer + ":8088", {query: querystring.stringify({associate: "STORE"})});
socketStore_Service.on('connect', function (socket) {
    console.log('Connected!');
    // dbApioCloud.collection('Users').findOne({email: "riccardo.italiani1992@yahoo.it"}, function (err, data) {
    //     if (err || !data) {
    //         res.send({
    //             status: false
    //         });
    //     } else {
    //     }
    // });
    if (socketStore_Service && dbStore && exclusive) {
        exclusive = false;
        require('./routes/core.store.js')(app, dbStore, socketStore_Service);
    }
});
socketStore_Service.on("send_to_store", function (data) {
    console.log("ritornato allo store");
    //console.log("data.data.apioId",data.data.apioId);
    //console.log("req.body.apioId",req.body.apioId);
    console.log(data);
});

app.use(bodyParser.json({
    limit: "50mb"
}));

app.use(bodyParser.urlencoded({
    limit: "50mb",
    extended: true
}));
//Questa si connette al DB APIO CLOUD
var MongoClient = require("mongodb").MongoClient;

// Connessione al DB store
var dbStore = undefined;
MongoClient.connect("mongodb://127.0.0.1:27017/store", function (error, db) {
    if (error) {
        console.log("Unable to connect to: mongodb://127.0.0.1:27017/store", error);
    } else if (db) {
        console.log("Connected to: mongodb://127.0.0.1:27017/store");
        dbStore = db;
        if (socketStore_Service && dbStore && exclusive) {
            exclusive = false;
            require('./routes/core.store.js')(app, dbStore, socketStore_Service);
        }
    }
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

//MAIL SERVICE

var server = http.createServer(app);

server.listen(8086, function () {
    console.log('ApioStore listening on port 8086!');
});
