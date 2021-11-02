var express = require('express');
var request = require('request');
var app = express();
var async = require('async');
const fs = require('fs');
const bodyParser = require('body-parser');


const jdataC = require('./public/comment.json')
const jdataS = require('./public/stars.json')
const jdataE = require('./public/etc.json')

const url = 'https://openapi.gg.go.kr/Publtolt?'
const KEY = 'ca5371ba77b7415d984778cb9606abc4';
const type = 'json'
var pIndex = 1;
var pSize = 1000;
var requestURL = `${url}KEY=${KEY}&pIndex=${pIndex}&pSize=${pSize}&Type=${type}`;

app.use(bodyParser.urlencoded({extended: true}))
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express)


app.use(express.static('public'))

app.get('/', (req, res) => {
    res.render('index.ejs', {'filtered' : undefined}, function(err, html){
        if (err){
            console.log(err)
        }
        res.end(html)
    });
})



app.post('/', async function(req, res) {

    var checkGen = req.body.genFreeC;
    var checkDis = req.body.disabledC
    var checkChi = req.body.childC

    var checkDia = req.body.diaperC
    var checkSan = req.body.sanitaryC
    var checkCam = req.body.CamC

    var ELements = req.body.listElements;
    var FinalList = [];
    var searchFinished = false;

    async.whilst(function () {
        return searchFinished == false;
    },
    function (next) {
        requestURL = `${url}KEY=${KEY}&pIndex=${pIndex}&pSize=${pSize}&Type=${type}`;
        request(requestURL, (err, response, body) => {
            if (err) throw err;
            var result = JSON.parse(body)
            var toltList = result.Publtolt[1].row;

            if (ELements == undefined) {
                res.render('index.ejs', {'filtered':FinalList}, function(err, html){
                    if (err){
                        console.log(err)
                    }
                    res.end(html)
                });
            } else {

                var filtered = toltList.filter(function (entry) {
                    var match = false;
                    ELements.forEach(element => {
                        if (element == entry.PBCTLT_PLC_NM){match = true;}
                    });
                    return match;
                });
                
                if (checkGen == "on"){
                    var filtered = filtered.filter(function (entry) {
                        return entry.MALE_FEMALE_TOILET_YN === 'N';
                    });
                }
        
                if (checkDis == "on"){
                    filtered = filtered.filter(function (entry) {
                        return entry.MALE_DSPSN_WTRCLS_CNT + 
                        entry.MALE_DSPSN_UIL_CNT + entry.FEMALE_DSPSN_WTRCLS_CNT != 0;
                    });
                }
        
                if (checkChi == "on"){
                    filtered = filtered.filter(function (entry) {
                        return entry.MALE_CHILDUSE_WTRCLS_CNT + 
                        entry.MALE_CHILDUSE_UIL_CNT + entry.FEMALE_CHILDUSE_WTRCLS_CNT != 0;
                    });
                }
        
                if (checkDia == "on"){
                    filtered = filtered.filter(function (entry){
                        if (jdataE[`${entry.PBCTLT_PLC_NM}`] == undefined) { return false; }
                        else {return jdataE[`${entry.PBCTLT_PLC_NM}`].DiaperChanger > 0;}
                    })
                }
        
                if (checkSan == "on"){
                    filtered = filtered.filter(function (entry){
                        var name = entry.PBCTLT_PLC_NM;
                        if (jdataE[`${name}`] == undefined) { return false; }
                        else {return jdataE[`${name}`].Sanitary > 0;}
                    })
                }
        
                if (checkCam == "on"){
                    filtered = filtered.filter(function (entry){
                        var name = entry.PBCTLT_PLC_NM;
                        if (jdataE[`${name}`] == undefined) { return true; }
                        else {return jdataE[`${name}`].Camera == 0;}
                    })
                }
        
                filtered.forEach(element => {FinalList.push(element.PBCTLT_PLC_NM);});

                if (!searchFinished && pIndex < 7){
                    if(pIndex == 6) {pSize = 265;}
                    pIndex++;
                    next();}
                
                else if (pIndex = 7) {
                    searchFinished = true;
                    pIndex = 1;
                    pSize = 1000;

                    res.render('index.ejs', {'filtered':FinalList}, function(err, html){
                        if (err){
                            console.log(err)
                        }
                        res.end(html)
                    });
                }
            }
        });
    }

    );
});

    app.get('/search', async function(req, res) {


        res.render('search.ejs', function(err, html){
            if (err){
                console.log(err)
            }
            res.end(html)
        })
        
    });

    app.get('/:name', async function(req, res) {

        // post action으로 화장실 이름 받기
        var toltName = req.params.name;
        var info = undefined;
        var comments = jdataC[`${toltName}`]
        var stars = jdataS[`${toltName}`]
        var etc = jdataE[`${toltName}`]
        var rate = 0;


        if (stars == undefined){
            rate = -1;
        } else {
            for (var i = 0; i < stars.length; i++) {rate += stars[i];}
            rate = rate / stars.length;
            rate = rate.toFixed(1);
        }

        async.whilst(function () {
            return info == undefined;
        },
        function (next) {
            requestURL = `${url}KEY=${KEY}&pIndex=${pIndex}&pSize=${pSize}&Type=${type}`;
            request(requestURL, (err, response, body) => {
                if (err) throw err;
                var result = JSON.parse(body)
                var toltList = result.Publtolt[1].row;
                // 화장실 이름으로 화장실 정보 찾기
                info = toltList.filter(function (object) {
                    return object.PBCTLT_PLC_NM === toltName;
                })
        
                info = info[0]

                if (info == undefined && pIndex < 7){
                    if(pIndex == 6) {pSize = 265;}
                    pIndex++;
                    next();}
                
                else if (info != undefined) {
                    pIndex = 1;
                    pSize = 1000;
                    res.render('info.ejs', {'info' : info, 'comments' : comments, 'etc': etc, 'rate': rate}, function(err, html){
                        if (err){
                            console.log(err)
                        }
                        res.end(html)
                    });
                }
                else if (info == undefined && pIndex == 7) { 
                    pIndex = 1;
                    pSize = 1000;
                    info == 'notFound';
                    res.render('info.ejs', function(err, html){
                        if (err){
                            console.log(err)
                        }
                        res.send('화장실을 찾을 수 없습니다!')
                    });
            }
        });
    });


});

app.post('/:name', async function(req, res) {
    var toltName = req.params.name;

    var info = undefined;
    var comments = jdataC[`${toltName}`]
    var stars = jdataS[`${toltName}`]
    var etc = jdataE[`${toltName}`]
    var rate = 0;

    var star = parseInt(req.body.star_rating);
    var newComment = req.body.contents;
    var IsdiaperChanger = req.body.diaperChanger;
    var IsSanitary = req.body.sanitary;
    var IsCamera = req.body.camera;

    if (stars == undefined){
        jdataS[`${toltName}`] = [];
        jdataS[`${toltName}`].push(star);
        stars = jdataS[`${toltName}`]
    } else { stars.push(star);}
    fs.writeFileSync("./public/stars.json", JSON.stringify(jdataS, undefined, 0))

    var obj = {'DiaperChanger': 0, 'Sanitary': 0, 'Camera': 0, 'Total': 0}

    if (etc == undefined) {etc = obj; jdataE[`${toltName}`] = etc; fs.writeFileSync("./public/etc.json", JSON.stringify(jdataE, undefined, 4));}
    if (IsdiaperChanger != undefined) {if (IsdiaperChanger == "on") {jdataE[`${toltName}`].DiaperChanger += 1;}}
    if (IsSanitary != undefined) {if (IsSanitary == "on") {jdataE[`${toltName}`].Sanitary += 1;}}
    if (IsCamera != undefined) {if (IsCamera == "on") {jdataE[`${toltName}`].Camera += 1;}}
    jdataE[`${toltName}`].Total += 1;
    fs.writeFileSync("./public/etc.json", JSON.stringify(jdataE, undefined, 4));
    etc = jdataE[`${toltName}`];
    

    if (newComment != "") {
        if (comments == undefined){
            jdataC[`${toltName}`] = [];
            jdataC[`${toltName}`].push(newComment);
            comments = jdataC[`${toltName}`]
        } else { comments.push(newComment);}
        fs.writeFileSync("./public/comment.json", JSON.stringify(jdataC, undefined, 4))
    }

    for (var i = 0; i < stars.length; i++) {rate += stars[i];}
    rate = rate / stars.length;
    rate = rate.toFixed(1);

    async.whilst(function () {
        return info == undefined;
    },
    function (next) {
        requestURL = `${url}KEY=${KEY}&pIndex=${pIndex}&pSize=${pSize}&Type=${type}`;
        request(requestURL, (err, response, body) => {
            if (err) throw err;
            var result = JSON.parse(body)
            var toltList = result.Publtolt[1].row;
            // 화장실 이름으로 화장실 정보 찾기
            info = toltList.filter(function (object) {
                return object.PBCTLT_PLC_NM === toltName;
            })
    
            info = info[0]

            if (info == undefined && pIndex < 7){
                if(pIndex == 6) {pSize = 265;}
                pIndex++;
                next();}
            
            else if (info != undefined) {
                pIndex = 1;
                pSize = 1000;
                res.render('info.ejs', {'info' : info, 'comments' : comments, 'rate': rate, 'etc': etc}, function(err, html){
                    if (err){
                        console.log(err)
                    }
                    res.end(html)
                });
            }
            else if (info == undefined && pIndex == 7) { 
                pIndex = 1;
                pSize = 1000;
                info == 'notFound';
                res.render('info.ejs', function(err, html){
                    if (err){
                        console.log(err)
                    }
                    res.send('화장실을 찾을 수 없습니다!')
                });
            }
        });
    });

});

var port = 3000;
app.listen(port, function(){
    console.log('server on! htttp://localhost:'+port);
});
