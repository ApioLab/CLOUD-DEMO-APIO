var crypto = require("crypto");
// var fs = require("fs");
// var request = require("request");
var http = require("http");

module.exports = function (app, dbStore, socketStore_Service) {

    app.post("/downloadApp", function (req, res) {
        console.log("Inside the download route:");
        console.log(req.body);
        console.log("Controllo l'utente");

        socketStore_Service.emit("queryMongo", {
            collection: "Users",
            query: {email: req.body.username},
            apioId: req.body.apioId
        });

        req.pause();
        var cb = function (data) {
            if (data.apioId == req.body.apioId) {
                console.log("risposta mongo");
                //console.log("data.data.apioId",data.data.apioId);
                //console.log("req.body.apioId",req.body.apioId);
                // console.log(data);
                if (!data.result || data.err) {
                    console.log("error or no data found");
                    res.send({
                        status: false
                    });
                    socketStore_Service.removeListener("responseMongo", cb);
                } else if (data.result) {
                    var hash = crypto.createHash('sha256').update(req.body.password).digest('base64');
                    if (data.result.password == hash) {
                        console.log("L'utente è stato autenticato con successo");
                        if (data.result.email == "info@apio.cc") {
                            console.log("Posso far partire diretto il download");
                            var downloadData = {};
                            downloadData.url = "http://demo.apio.cloud:8086/root/" + req.body.appId + "/repository/archive.tar.gz?ref=master"
                            downloadData.apioId = req.body.apioId;
                            socketStore_Service.emit("downloadApp", downloadData)
                            socketStore_Service.removeListener("responseMongo", cb);

                        } else {
                            var checkApioId = false;
                            console.log("Controllo l'ApioID");
                            data.result.apioId.forEach(function (value, index, arr) {
                                console.log(value.code + "==" + req.body.apioId);
                                if (value.code == req.body.apioId) {
                                    //console.log("Anche l'apioID è presente");
                                    checkApioId = true;
                                }
                            })
                            if (checkApioId) {
                                console.log("Posso far partire diretto il download");
                                var downloadData = {};
                                if (typeof req.body.data == "undefined") {
                                    var path = "http://store.apio.cloud:8086/root/" + req.body.appId + "/raw/master/manifest.json";
                                    http.get(path, function (response) {
                                        // Continuously update stream with data
                                        var body = '';
                                        response.on('data', function (d) {
                                            body += d;
                                        });
                                        response.on('end', function () {
                                            // Data reception is done, do whatever with it!
                                            var string = body;
                                            // console.log("string: ", string);
                                            try {
                                                downloadData.data = {protocol:JSON.parse(string).protocol,eep:JSON.parse(string).appId};
                                            } catch (err) {
                                                string = string.replace(/(\n\t)([^:]+)(:)/gi, "\"$2\":");
                                                string = string.replace(/\n/, "");
                                                downloadData.data = {protocol:JSON.parse(string).protocol,eep:JSON.parse(string).appId};
                                            }
                                            downloadData.url = "http://store.apio.cloud:8086/root/" + req.body.appId + "/repository/archive.tar.gz?ref=master";
                                            downloadData.apioId = req.body.apioId;
                                            downloadData.message = "downloadApp";
                                            // console.log("downloadData1",downloadData);
                                            res.status(200).send(downloadData);
                                            // socketStore_Service.emit("downloadApp", downloadData);
                                            socketStore_Service.emit("store_to_gateway", downloadData);
                                            socketStore_Service.removeListener("responseMongo", cb);
                                        });
                                    });

                                } else {
                                    downloadData.data = req.body.data;
                                    downloadData.url = "http://store.apio.cloud:8086/root/" + req.body.appId + "/repository/archive.tar.gz?ref=master";
                                    downloadData.apioId = req.body.apioId;
                                    downloadData.message = "downloadApp";
                                    // console.log("downloadData2",downloadData);
                                    res.status(200).send(downloadData);
                                    socketStore_Service.emit("store_to_gateway", downloadData);
                                    socketStore_Service.removeListener("responseMongo", cb);
                                }

                            }
                            else {
                                socketStore_Service.removeListener("responseMongo", cb);
                                console.log("Password errata");
                                res.send({
                                    status: false,
                                    errors: [{
                                        type: 'Board not synced'
                                    }]
                                });
                                var downloadData = {};
                                downloadData.apioId = req.body.apioId;
                                downloadData.error = 'Board not synced';
                                downloadData.message = "downloadApp";
                                // socketStore_Service.emit("downloadApp", downloadData);
                                socketStore_Service.emit("store_to_gateway", downloadData);
                            }
                        }
                    } else {
                        console.log("Password errata");
                        res.send({
                            status: false,
                            errors: [{
                                type: 'CredentialError'
                            }]
                        });
                        var downloadData = {};
                        downloadData.apioId = req.body.apioId;
                        downloadData.error = 'CredentialError';
                        downloadData.message = "downloadApp";
                        // socketStore_Service.emit("downloadApp", downloadData);
                        socketStore_Service.emit("store_to_gateway", downloadData);
                        socketStore_Service.removeListener("responseMongo", cb);

                    }
                }
            }
        }
        socketStore_Service.on("responseMongo", cb);

        req.on("close", function () {
            socketStore_Service.removeListener("responseMongo", cb);
        });

        req.on("end", function () {
            socketStore_Service.removeListener("responseMongo", cb);
        });

        req.on("timeout", function () {
            socketStore_Service.removeListener("responseMongo", cb);
        });

        req.on("error", function () {
            socketStore_Service.removeListener("responseMongo", cb);
        });

        //VECCHIO
        // dbApioCloud.collection('Users').findOne({email: req.body.username}, function (err, data) {
        //     if (err || !data) {
        //         res.send({
        //             status: false
        //         });
        //     } else {
        //         var hash = crypto.createHash('sha256').update(req.body.password).digest('base64');
        //         if (data.password == hash) {
        //             console.log("L'utente è stato autenticato con successo");
        //             if (data.email == "info@apio.cc") {
        //                 console.log("Posso far partire diretto il download");
        //                 var downloadData = {};
        //                 downloadData.url = "http://demo.apio.cloud:8086/root/" + req.body.appId + "/repository/archive.tar.gz?ref=master"
        //                 downloadData.apioId = req.body.apioId;
        //                 socketStore_Service.emit("downloadApp", downloadData)
        //             } else {
        //                 var checkApioId = false;
        //                 console.log("Controllo l'ApioID");
        //                 data.apioId.forEach(function (value, index, arr) {
        //                     console.log(value.code + "==" + req.body.apioId);
        //                     if (value.code == req.body.apioId) {
        //                         //console.log("Anche l'apioID è presente");
        //                         checkApioId = true;
        //                     }
        //                 })
        //                 if (checkApioId) {
        //                     console.log("Posso far partire diretto il download");
        //                     //http://store.apio.cloud:8086/root/Security/repository/archive.tar.gz?ref=master
        //                     var downloadData = {};
        //                     downloadData.url = "http://store.apio.cloud:8086/root/" + req.body.appId + "/repository/archive.tar.gz?ref=master"
        //                     downloadData.apioId = req.body.apioId;
        //                     downloadData.message = "downloadApp";
        //                     res.status(200).send(downloadData);
        //                     // socketStore_Service.emit("downloadApp", downloadData);
        //                     socketStore_Service.emit("store_to_gateway", downloadData);
        //
        //                 }
        //             }
        //         } else {
        //             console.log("Password errata");
        //             res.send({
        //                 status: false,
        //                 errors: [{
        //                     type: 'CredentialError'
        //                 }]
        //             });
        //             var downloadData = {};
        //             downloadData.apioId = req.body.apioId;
        //             downloadData.error = 'CredentialError';
        //             downloadData.message = "downloadApp";
        //             // socketStore_Service.emit("downloadApp", downloadData);
        //             socketStore_Service.emit("store_to_gateway", downloadData);
        //         }
        //     }
        // });
    });

    app.post("/compatibility", function (req, res) {
        console.log("sono in category");
        var data = {};
        dbStore.collection("compatibility").find().toArray(function (err, result) {
            if (err) {
                console.log("error while searching: ", err);
            } else if (result) {
                var index_0 = 0;
                result.forEach(function (category, index, categories) {
                    data[category.id] = category.base;
                    var index_1 = 0;
                    data[category.id].forEach(function (elem, index, ref_array) {
                        var path = "http://store.apio.cloud:8086/root/" + elem.appId + "/raw/master/manifest.json";
                        console.log("elem.appId", elem.appId);
                        http.get(path, function (response) {
                            // Continuously update stream with data
                            var body = '';
                            response.on('data', function (d) {
                                body += d;
                            });
                            response.on('end', function () {
                                // Data reception is done, do whatever with it!
                                var string = body;
                                // console.log("string: ", string);
                                try {
                                    elem.manifest = JSON.parse(string);
                                } catch (err) {
                                    string = string.replace(/(\n\t)([^:]+)(:)/gi, "\"$2\":");
                                    string = string.replace(/\n/, "");
                                    elem.manifest = JSON.parse(string);
                                }
                                console.log("elem.manifest: ", elem.manifest);
                                if (index_1++ == ref_array.length - 1) {
                                    console.log("1 ", index_0, " 2 ", result.length - 1)
                                    if (index_0++ == result.length - 1) {
                                        console.log("data", data);
                                        data.apioId = req.body.apioId;
                                        data.message = "compatibilities";
                                        res.status(200).send(data);
                                        // socketStore_Service.emit("category", data);
                                        socketStore_Service.emit("store_to_gateway", data);

                                    }
                                }
                            });
                        });

                    });
                })
            }
        });

    });

    app.post("/compatibility/:id", function (req, res) {
        console.log("sono in compatibility/id");
        var data = {};

        ///////OPERAZIONI FIND SU DB//////////////


        dbStore.collection("compatibility").findOne({"id": req.params.id}, function (err, result) {
            if (err) {
                console.log("error while searching: ", err);
            } else if (result) {
                data.list = result.base;
                /////////////////

                var index_1 = 0;
                data.list.forEach(function (elem, index, ref_array) {
                    var path = "http://store.apio.cloud:8086/root/" + elem.appId + "/raw/master/manifest.json";
                    http.get(path, function (response) {
                        // Continuously update stream with data
                        var body = '';
                        response.on('data', function (d) {
                            body += d;
                        });
                        response.on('end', function () {
                            // Data reception is done, do whatever with it!
                            var string = body;
                            console.log("string: ", string);
                            try {
                                elem.manifest = JSON.parse(string);
                            } catch (err) {
                                string = string.replace(/(\n\t)([^:]+)(:)/gi, "\"$2\":");
                                string = string.replace(/\n/, "");
                                elem.manifest = JSON.parse(string);
                            }
                            console.log("elem.manifest: ", elem.manifest);
                            if (index_1++ == ref_array.length - 1) {
                                console.log("data", data);
                                data.apioId = req.body.apioId;
                                data.message = "compatibility";
                                res.status(200).send(data);
                                // socketStore_Service.emit("category", data);
                                socketStore_Service.emit("store_to_gateway", data);
                            }
                        });
                    });

                });
            }

        });

    });

    app.post("/app", function (req, res) {
        var private_key = "XjQyoMXEiiL7bdpyCAxc";
        console.log("ritorna la lista di tutte le app sullo store");

        var options = {
            host: 'store.apio.cloud',
            port: 8086,
            path: '/api/v3/projects',
            headers: {
                "PRIVATE-TOKEN": private_key
            }
        };
        http.get(options, function (response) {
            console.log("dentro get");
            var body = '';
            response.on('data', function (d) {
                console.log("arriva");
                body += d;
            });
            response.on('end', function () {
                console.log("arrivata la risposta");
                var apps = [];
                var json = JSON.parse(body);
                // console.log(json);
                var index_1 = 0;
                json.forEach(function (elem, index, ref_array) {
                    if (elem.name !== "TIPS_TRICKS") {
                        var path = "http://store.apio.cloud:8086/root/" + elem.name + "/raw/master/manifest.json";
                        http.get(path, function (response) {
                            // Continuously update stream with data
                            var body = '';
                            response.on('data', function (d) {
                                body += d;
                            });
                            response.on('end', function () {
                                // Data reception is done, do whatever with it!
                                var string = body;
                                // console.log("string: ", string);
                                try {
                                    elem.manifest = JSON.parse(string);
                                } catch (err) {
                                    string = string.replace(/(\n\t)([^:]+)(:)/gi, "\"$2\":");
                                    string = string.replace(/\n/, "");
                                    elem.manifest = JSON.parse(string);
                                }
                                console.log("elem.manifest: ", elem.manifest);
                                // apps.push(elem);
                                apps.push(elem.manifest);
                                // console.log("1 ", index_1, "2 ", ref_array.length - 1);
                                if (index_1++ == ref_array.length - 1 - 1) {
                                    var data = {};
                                    data.apps = apps;
                                    res.status(200).send(data);
                                    if (req.body.apioId) {
                                        data.apioId = req.body.apioId;
                                        data.message = "app";
                                        // socketStore_Service.emit("objects", data);
                                        socketStore_Service.emit("store_to_gateway", data);
                                    }

                                }
                            });
                        });
                    }

                });
            });

        })
    });

    app.post("/category", function (req, res) {
        console.log("sono in category");
        var data = {};

        var options = {
            hostname: 'store.apio.cloud',
            path: '/app',
            method: "post"/*,
             headers: {
             'Content-Type': 'application/x-www-form-urlencoded'
             }*/
        };
        var request = http.request(options, function (response) {
            var json;
            console.log('Status: ' + res.statusCode);
            console.log('Headers: ' + JSON.stringify(res.headers));
            response.setEncoding('utf8');
            response.on('data', function (body) {
                console.log('Body: ' + body);
                json = body;
            });
            response.on("end", function () {
                var categories = [];
                json = JSON.parse(json);
                var index = 0;
                json.apps.forEach(function (app, index0) {
                    app.category.forEach(function (category) {
                        if (categories.indexOf(category) == -1) {
                            dbStore.collection("category").findOne({"id": category}, function (err, result) {
                                if (err) {
                                    console.log("error while searching: ", err);
                                } else if (result) {
                                    categories.push({"category": category, "description": result.description});
                                    index++;
                                    if (index == app.category.length) {
                                        index = 0;
                                        if (index0 == json.apps.length - 1) {
                                            var data = {};
                                            data.categories = categories;
                                            res.status(200).send(data);
                                            data.apioId = req.body.apioId;
                                            data.message = "categories";
                                            socketStore_Service.emit("store_to_gateway", data);
                                        }
                                    }
                                }
                            });
                        } else {
                            index++;
                            if (index == app.category.length) {
                                index = 0;
                                if (index0 == json.apps.length - 1) {
                                    var data = {};
                                    data.categories = categories;
                                    res.status(200).send(data);
                                    data.apioId = req.body.apioId;
                                    data.message = "categories";
                                    socketStore_Service.emit("store_to_gateway", data);
                                }
                            }
                        }

                    });
                });


            });


        });
        request.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
// write data to request body
//         req.write('{}');
        request.end();
    });

    app.post("/category/:category", function (req, res) {
        console.log("sono in category/:id");
        var data = {};

        var options = {
            hostname: 'store.apio.cloud',
            path: '/app',
            method: "post"/*,
             headers: {
             'Content-Type': 'application/x-www-form-urlencoded'
             }*/
        };
        var request = http.request(options, function (response) {
            var json;
            console.log('Status: ' + res.statusCode);
            console.log('Headers: ' + JSON.stringify(res.headers));
            response.setEncoding('utf8');
            response.on('data', function (body) {
                console.log('Body: ' + body);
                json = body;
            });
            response.on("end", function () {
                var apps = [];
                json = JSON.parse(json);
                json.apps.forEach(function (app) {
                    app.category.forEach(function (category) {
                        if (category.indexOf(req.params.category) !== -1) {
                            apps.push(app);
                        }

                    });
                });
                var data = {};
                data.apps = apps;
                res.status(200).send(data);
                data.apioId = req.body.apioId;
                data.message = "category";
                socketStore_Service.emit("store_to_gateway", data);


            });


        });
        request.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
// write data to request body
//         req.write('{}');
        request.end();
    });

}
;
/////////////////////////////////////////

//Rotte da implementare
//  GET  /app Ritorna tutte le APP con le informazioni contenute nel file, manifest.json
//  GET  /category/:category  Ritorna tutte le APP di una determinata categoria
//  GET  /category/ Ritorna tutte le categorie, le categorie devono avere anche una collection con una descrizione della categoria e le app
//					in quella categoria
//	GET  /app/:name Ritorna tutte le informazioni di una determinata, App con i link per le immagini e i link per le icone.
//	GET  /compability/:ID ritorna tutte le app compatibili con quell'oggetto...


