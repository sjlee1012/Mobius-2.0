/**
 * Copyright (c) 2018, KETI
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @file Main code of Mobius. Role of flow router
 * @copyright KETI Korea 2018, KETI
 * @author Il Yeup Ahn [iyahn@keti.re.kr]
 */

//process.env.NODE_ENV = 'production';
process.env.NODE_ENV = 'development';

const fs = require('fs');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const util = require('util');
const xml2js = require('xml2js');
const url = require('url');
const ip = require('ip');
const crypto = require('crypto');
const fileStreamRotator = require('file-stream-rotator');
const https = require('https');
const cbor = require('cbor');
const moment = require('moment');

const cors = require('cors');

global.NOPRINT = 'true';
global.ONCE = 'true';

const cb = require('./mobius/cb');
const responder = require('./mobius/responder');
const resource = require('./mobius/resource');
const security = require('./mobius/security');
const fopt = require('./mobius/fopt');
const tr = require('./mobius/tr');
const sgn = require('./mobius/sgn');

const db = require('./mobius/db_action');
const db_sql = require('./mobius/sql_action');


const {
    parse_to_json,
    parse_body_format,
    check_resource,
    check_request_query_rt,
    check_grp,
    check_resource_supported,
    get_target_url,
    check_notification,
    check_ae_notify,
    check_csr,
    check_xm2m_headers,
    check_allowed_app_ids,
    check_type_update_resource,
    check_type_delete_resource } = require("./httpCallback");

const {
    lookup_create,
    lookup_retrieve,
    lookup_update,
    lookup_delete } = require("./lookup");


const { response_error_result } = require("./errorCallback");


/////////////////////////////////////////
// global variable....
global.cache_resource_url = {};
global.usespid = '//keti.re.kr';
global.usesuperuser = 'Sponde'; //'Superman';
global.useobserver = 'Sandwich';


/////////////////////////////////////////
// const ....
const logDirectory = __dirname + '/log';
const use_clustering = 1;
const cluster = require('cluster');
const os = require('os');
const cpuCount =  3  //os.cpus().length;



const ONE_DAY = (24) * (60) * (60) * (1000);


/////////////////////////////////////////
// worker variables ....
var worker = [];
var worker_init_count = 0;


// ensure log directory exists
// create a rotating write stream
// setup the logger

fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
const accessLogStream = fileStreamRotator.getStream({
    date_format: 'YYYYMMDD',
    filename: logDirectory + '/access-%DATE%.log',
    frequency: 'daily',
    verbose: false
});


const app = express();
app.use(cors());
app.use(morgan('combined', {stream: accessLogStream}));

function make_short_nametype(body_Obj) {
    if (body_Obj[Object.keys(body_Obj)[0]]['$'] != null) {
        if (body_Obj[Object.keys(body_Obj)[0]]['$'].rn != null) {
            body_Obj[Object.keys(body_Obj)[0]].rn = body_Obj[Object.keys(body_Obj)[0]]['$'].rn;
        }
        delete body_Obj[Object.keys(body_Obj)[0]]['$'];
    }

    var arr_rootnm = Object.keys(body_Obj)[0].split(':');

    if(arr_rootnm[0] === 'hd') {
        var rootnm = Object.keys(body_Obj)[0].replace('hd:', 'hd_');
    }
    else {
        rootnm = Object.keys(body_Obj)[0].replace('m2m:', '');
    }

    body_Obj[rootnm] = body_Obj[Object.keys(body_Obj)[0]];
    delete body_Obj[Object.keys(body_Obj)[0]];

    for (var attr in body_Obj[rootnm]) {
        if (body_Obj[rootnm].hasOwnProperty(attr)) {
            if (typeof body_Obj[rootnm][attr] === 'boolean') {
                body_Obj[rootnm][attr] = body_Obj[rootnm][attr].toString();
            }
            else if (typeof body_Obj[rootnm][attr] === 'string') {
            }
            else if (typeof body_Obj[rootnm][attr] === 'number') {
                body_Obj[rootnm][attr] = body_Obj[rootnm][attr].toString();
            }
            else {
            }
        }
    }
}
function extra_api_action(connection, url, callback) {
    if (url == '/hit') {
        // for backup hit count
        if (0) {
            var _hit_old = JSON.parse(fs.readFileSync('hit.json', 'utf-8'));
            var _http = 0;
            var _mqtt = 0;
            var _coap = 0;
            var _ws = 0;

            for (var dd in _hit_old) {
                if (_hit_old.hasOwnProperty(dd)) {
                    for (var ff in _hit_old[dd]) {
                        if (_hit_old[dd].hasOwnProperty(ff)) {
                            if (Object.keys(_hit_old[dd][ff]).length > 0) {
                                for (var gg in _hit_old[dd][ff]) {
                                    if (_hit_old[dd][ff].hasOwnProperty(gg)) {
                                        if (_hit_old[dd][ff][gg] == null) {
                                            _hit_old[dd][ff][gg] = 0;
                                        }
                                        if (gg == 'H') {
                                            _http = _hit_old[dd][ff][gg];
                                        }
                                        else if (gg == 'M') {
                                            _mqtt = _hit_old[dd][ff][gg];
                                        }
                                        else if (gg == 'C') {
                                            _coap = _hit_old[dd][ff][gg];
                                        }
                                        else if (gg == 'W') {
                                            _ws = _hit_old[dd][ff][gg];
                                        }
                                    }
                                }

                                db_sql.set_hit_n(connection, dd, _http, _mqtt, _coap, _ws, (err, results) => {
                                    results = null;
                                });
                            }
                        }
                    }
                }
            }
        }

        if (0) {
            var count = 0;
            setTimeout((count) => {
                if (count > 250) {
                    return;
                }
                var dd = moment().utc().subtract(count, 'days').format('YYYYMMDD');
                var _http = 5000 + Math.random() * 50000;
                var _mqtt = 1000 + Math.random() * 9000;
                var _coap = 0;
                var _ws = 0;

                db_sql.set_hit_n(connection, dd, _http, _mqtt, _coap, _ws, (err, results) => {
                    results = null;
                    console.log(count);
                    setTimeout(random_hit, 100, ++count);
                });
            }, 100, count);
        }

        db_sql.get_hit_all(connection, (err, result) => {
            if (err) {
                callback('500-1');
            }
            else {
                callback('201', result);
            }
        });
    }
    else if (url == '/total_ae') {
        db_sql.select_sum_ae(connection, function (err, result) {
            if (err) {
                callback('500-1');
            }
            else {
                callback('201', result);
            }
        });
    }
    else if (url == '/total_cbs') {
        db_sql.select_sum_cbs(connection, function (err, result) {
            if (err) {
                callback('500-1');
            }
            else {
                callback('201', result);
            }
        });
    }
    else {
        callback('200');
    }
}

if (use_clustering) {
    if (cluster.isPrimary) {

        console.log(`Primary ${process.pid} is running & CPU Count:`, cpuCount);
        for (let i = 0; i < cpuCount; i++) {
            worker[i] = cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died--> start again`);
            cluster.fork();
        });

        db.createPool( usedbhost, 3306, 'root', usedbpass ) ;
        db.getConnection((code, connection) => {
            if (code === '200') {
                console.log(`db.getConnection OK`);
                db_sql.set_tuning(connection, (err, results) => {
                    if (err) {
                        console.log('[set_tuning] error');
                    }
                });
                cb.create(connection, (rsp) => {
                    console.log(`cb.createOK`);
                    console.log(JSON.stringify(rsp));

                    setInterval(db.del_req_resource, ONE_DAY);
                    setInterval(db.del_expired_resource, ONE_DAY);

                    require('./pxy_mqtt');
                    require('./pxy_coap');
                    require('./pxy_ws');

                    if (usecsetype == 'mn' || usecsetype == 'asn') {
                        global.refreshIntervalId = setInterval(() => {
                            csr_custom.emit('register_remoteCSE');
                        }, 5000);
                    }

                    connection.release();
                });

            }
            else {
                console.log('[db.connect] No Connection');
            }
        });
    }
    else {
        console.log(`Worker ${process.pid} started`);

        db.createPool( usedbhost, 3306, 'root', usedbpass ) ;
        db.getConnection((code, connection) => {
            if (code === '200' && use_secure === 'disable') {

                http.globalAgent.maxSockets = 1000000;
                http.createServer(app).listen({port: usecsebaseport, agent: false}, () => {
                    console.log('mobius server (' + ip.address() + ') running at ' + usecsebaseport + ' port');
                    cb.create(connection, (rsp) => {
                        console.log(JSON.stringify(rsp));
                        //noti_mqtt_begin();
                        connection.release();
                    });
                });

            }
            else if (code === '200' && use_secure === 'enable'  ){
                const options = {
                    key: fs.readFileSync('server-key.pem'),
                    cert: fs.readFileSync('server-crt.pem'),
                    ca: fs.readFileSync('ca-crt.pem')
                };

                https.globalAgent.maxSockets = 1000000;
                https.createServer(options, app).listen({port: usecsebaseport, agent: false}, () => {
                    console.log('mobius server (' + ip.address() + ') running at ' + usecsebaseport + ' port');
                    cb.create(connection, (rsp) => {
                        console.log(JSON.stringify(rsp));
                        //noti_mqtt_begin();
                        connection.release();
                    });
                });
            }
            else {
                console.log('[db.connect] No Connection');
            }
        });
    }

}
else {

    db.createPool( usedbhost, 3306, 'root', usedbpass ) ;
    db.getConnection((code, connection) => {
        if (code === '200' && use_secure === 'disable' ) {
            cb.create(connection, (rsp) => {
                console.log(JSON.stringify(rsp));

                http.globalAgent.maxSockets = 1000000;
                http.createServer(app).listen({port: usecsebaseport, agent: false}, () => {
                    console.log('mobius server (' + ip.address() + ') running at ' + usecsebaseport + ' port');
                    require('./pxy_mqtt');
                    //noti_mqtt_begin();

                    if (usecsetype === 'mn' || usecsetype === 'asn') {
                        global.refreshIntervalId = setInterval(() => {
                            csr_custom.emit('register_remoteCSE');
                        }, 5000);
                    }
                });

                connection.release();
            });
        }
        else if ( code === '200' && use_secure === 'disable' ) {

            cb.create(connection, (rsp) => {
                let options = {
                    key: fs.readFileSync('server-key.pem'),
                    cert: fs.readFileSync('server-crt.pem'),
                    ca: fs.readFileSync('ca-crt.pem')
                };

                https.globalAgent.maxSockets = 1000000;
                https.createServer(options, app).listen({port: usecsebaseport, agent: false}, () => {
                    console.log('mobius server (' + ip.address() + ') running at ' + usecsebaseport + ' port');
                    require('./pxy_mqtt');
                    //noti_mqtt_begin();
                    //require('./mobius/ts_agent');

                    if (usecsetype === 'mn' || usecsetype === 'asn') {
                        global.refreshIntervalId = setInterval(() => {
                            csr_custom.emit('register_remoteCSE');
                        }, 5000);
                    }
                });

                connection.release();
            });
        }
        else {
            console.log('[db.connect] No Connection');
        }
    });
}

global.get_ri_list_sri = function (request, response, sri_list, ri_list, count, callback) {
    if (sri_list.length <= count) {
        callback('200');
    }
    else {
        db_sql.get_ri_sri(request.db_connection, sri_list[count], (err, results) => {
            if (!err) {
                ri_list[count] = ((results.length == 0) ? sri_list[count] : results[0].ri);
                results = null;

                get_ri_list_sri(request, response, sri_list, ri_list, ++count, (code) => {
                    callback(code);
                });
            }
            else {
                callback('500-1');
            }
        });
    }
};
global.update_route = function (connection, cse_poa, callback) {
    db_sql.select_csr_like(connection, usecsebase, (err, results_csr) => {
        if (!err) {
            for (var i = 0; i < results_csr.length; i++) {
                var poa_arr = JSON.parse(results_csr[i].poa);
                for (var j = 0; j < poa_arr.length; j++) {
                    if (url.parse(poa_arr[j]).protocol == 'http:' || url.parse(poa_arr[j]).protocol == 'https:') {
                        cse_poa[results_csr[i].ri.split('/')[2]] = poa_arr[j];
                    }
                }
            }
            results_csr = null;
            callback('200');
        }
        else {
            callback('500-1');
        }
    });
};
global.make_json_obj = function (bodytype, str, callback) {
    try {
        if (bodytype === 'xml') {
            var message = str;
            var parser = new xml2js.Parser({explicitArray: false});
            parser.parseString(message.toString(), (err, result) => {
                if (err) {
                    console.log('[mqtt make json obj] xml2js parser error]');
                    callback('0');
                }
                else {
                    for (var prop in result) {
                        if (result.hasOwnProperty(prop)) {
                            for (var attr in result[prop]) {
                                if (result[prop].hasOwnProperty(attr)) {
                                    if (attr == '$') {
                                        delete result[prop][attr];
                                    }
                                    else if (attr == 'pc') {
                                        make_json_arraytype(result[prop][attr]);
                                    }
                                }
                            }
                        }
                    }
                    callback('1', result);
                }
            });
        }
        else if (bodytype === 'cbor') {
            cbor.decodeFirst(str, (err, result) => {
                if (err) {
                    console.log('cbor parser error]');
                }
                else {
                    callback('1', result);
                }
            });
        }
        else {
            var result = JSON.parse(str);
            callback('1', result);
        }
    }
    catch (e) {
        console.error(e.message);
        callback('0');
    }
};
global.make_json_arraytype = function (body_Obj) {
    for (var prop in body_Obj) {
        if (body_Obj.hasOwnProperty(prop)) {
            for (var attr in body_Obj[prop]) {
                if (body_Obj[prop].hasOwnProperty(attr)) {
                    if (attr == 'srv' || attr == 'aa' || attr == 'at' || attr == 'poa' || attr == 'lbl' || attr == 'acpi' || attr == 'srt' || attr == 'nu' || attr == 'mid' || attr == 'macp' || attr == 'rels') {
                        if (body_Obj[prop][attr]) {
                            body_Obj[prop][attr] = body_Obj[prop][attr].split(' ');
                        }
                        if (body_Obj[prop][attr] == '') {
                            body_Obj[prop][attr] = [];
                        }
                        if (body_Obj[prop][attr] == '[]') {
                            body_Obj[prop][attr] = [];
                        }
                    }
                    else if (attr == 'rqps') {
                        var rqps_type = getType(body_Obj[prop][attr]);
                        if (rqps_type === 'array') {

                        }
                        else if (rqps_type === 'object') {
                            var temp = body_Obj[prop][attr];
                            body_Obj[prop][attr] = [];
                            body_Obj[prop][attr].push(temp);
                        }
                        else {

                        }
                    }
                    else if (attr == 'enc') {
                        if (body_Obj[prop][attr]) {
                            if (body_Obj[prop][attr].net) {
                                if (!Array.isArray(body_Obj[prop][attr].net)) {
                                    body_Obj[prop][attr].net = body_Obj[prop][attr].net.split(' ');
                                }
                            }
                        }
                    }
                    else if (attr == 'pv' || attr == 'pvs') {
                        if (body_Obj[prop][attr]) {
                            if (body_Obj[prop][attr].acr) {
                                if (!Array.isArray(body_Obj[prop][attr].acr)) {
                                    temp = body_Obj[prop][attr].acr;
                                    body_Obj[prop][attr].acr = [];
                                    body_Obj[prop][attr].acr[0] = temp;
                                }

                                for (var acr_idx in body_Obj[prop][attr].acr) {
                                    if (body_Obj[prop][attr].acr.hasOwnProperty(acr_idx)) {
                                        if (body_Obj[prop][attr].acr[acr_idx].acor) {
                                            body_Obj[prop][attr].acr[acr_idx].acor = body_Obj[prop][attr].acr[acr_idx].acor.split(' ');
                                        }

                                        if (body_Obj[prop][attr].acr[acr_idx].hasOwnProperty('acco')) {
                                            if (!Array.isArray(body_Obj[prop][attr].acr[acr_idx].acco)) {
                                                temp = body_Obj[prop][attr].acr[acr_idx].acco;
                                                body_Obj[prop][attr].acr[acr_idx].acco = [];
                                                body_Obj[prop][attr].acr[acr_idx].acco[0] = temp;
                                            }

                                            var acco = body_Obj[prop][attr].acr[acr_idx].acco;
                                            for (var acco_idx in acco) {
                                                if (acco.hasOwnProperty(acco_idx)) {
                                                    if (acco[acco_idx].hasOwnProperty('acip')) {
                                                        if (acco[acco_idx].acip.hasOwnProperty('ipv4')) {
                                                            if (getType(acco[acco_idx].acip['ipv4']) == 'string') {
                                                                acco[acco_idx].acip['ipv4'] = acco[acco_idx].acip.ipv4.split(' ');
                                                            }
                                                        }
                                                        else if (acco[acco_idx].acip.hasOwnProperty('ipv6')) {
                                                            if (getType(acco[acco_idx].acip['ipv6']) == 'string') {
                                                                acco[acco_idx].acip['ipv6'] = acco[acco_idx].acip.ipv6.split(' ');
                                                            }
                                                        }
                                                    }
                                                    if (acco[acco_idx].hasOwnProperty('actw')) {
                                                        if (getType(acco[acco_idx].actw) == 'string') {
                                                            temp = acco[acco_idx].actw;
                                                            acco[acco_idx]['actw'] = [];
                                                            acco[acco_idx].actw[0] = temp;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            if (body_Obj[prop][attr].acr == '') {
                                body_Obj[prop][attr].acr = [];
                            }

                            if (body_Obj[prop][attr].acr == '[]') {
                                body_Obj[prop][attr].acr = [];
                            }
                        }
                    }
                }
            }
        }
    }
};

var onem2mParser = bodyParser.text(
    {
        limit: '5mb',
        type: 'application/onem2m-resource+xml;application/xml;application/json;application/vnd.onem2m-res+xml;application/vnd.onem2m-res+json'
    }
);

//////// contribution code
// Kevin Lee, Executive Director, Unibest INC, Owner of Howchip.com
// Process for CORS problem

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, X-M2M-RI, X-M2M-RVI, X-M2M-RSC, Accept, X-M2M-Origin, Locale');
    res.header('Access-Control-Expose-Headers', 'Origin, X-Requested-With, Content-Type, X-M2M-RI, X-M2M-RVI, X-M2M-RSC, Accept, X-M2M-Origin, Locale');
    (req.method == 'OPTIONS') ? res.sendStatus(200) : next();
});

// remoteCSE, ae, cnt
app.post(onem2mParser, (request, response) => {

    var fullBody = '';
    request.on('data', (chunk) => fullBody += chunk.toString() );
    request.on('end', () => {
        request.body = fullBody;
        console.log("myTest-> " + request.body);

        db.getConnection((code, connection) => {
            if (code === '200') {
                request.db_connection = connection;

                if (!request.headers.hasOwnProperty('binding')) {
                    request.headers['binding'] = 'H';
                }

                db_sql.set_hit(connection, request.headers['binding'], (err, results) => {
                    results = null;
                });

                check_xm2m_headers(request, (code) => {
                    if (code === '200') {
                        if (request.body !== "") {
                            check_resource_supported(request, response, (code) => {
                                if (code === '200') {
                                    get_target_url(request, response, (code) => {
                                        if (code === '200') {
                                            if (request.option !== '/fopt') {
                                                parse_body_format(request, response, (code) => {
                                                    if (code === '200') {
                                                        check_allowed_app_ids(request, (code) => {
                                                            if (code === '200') {
                                                                var rootnm = Object.keys(request.targetObject)[0];
                                                                var absolute_url = request.targetObject[rootnm].ri;
                                                                check_notification(request, response, (code) => {
                                                                    if (code === 'post') {
                                                                        request.url = absolute_url;
                                                                        if ((request.query.fu == 2) && (request.query.rcn == 0 || request.query.rcn == 1 || request.query.rcn == 2 || request.query.rcn == 3)) {
                                                                            lookup_create(request, response, (code) => {
                                                                                if (code === '201') {
                                                                                    responder.response_result(request, response, '201', '2001', '', () => {
                                                                                        connection.release();
                                                                                        request = null;
                                                                                        response = null;
                                                                                    });
                                                                                }
                                                                                else if (code === '201-3') {
                                                                                    responder.response_rcn3_result(request, response, '201', '2001', '', () => {
                                                                                        connection.release();
                                                                                        request = null;
                                                                                        response = null;
                                                                                    });
                                                                                }
                                                                                else if (code === '202-1') {
                                                                                    responder.response_result(request, response, '202', '1001', '', () => {
                                                                                        connection.release();
                                                                                        request = null;
                                                                                        response = null;
                                                                                    });
                                                                                }
                                                                                else if (code === '202-2') {
                                                                                    responder.response_result(request, response, '202', '1002', '', () => {
                                                                                        connection.release();
                                                                                        request = null;
                                                                                        response = null;
                                                                                    });
                                                                                }
                                                                                else {
                                                                                    responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                                        connection.release();
                                                                                        request = null;
                                                                                        response = null;
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                        else {
                                                                            code = '400-43';
                                                                            responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                                connection.release();
                                                                                request = null;
                                                                                response = null;
                                                                            });
                                                                        }
                                                                    }
                                                                    else if (code === 'notify') {
                                                                        check_ae_notify(request, response, (code, res) => {
                                                                            if (code === '200') {
                                                                                connection.release();

                                                                                if (res.headers['content-type']) {
                                                                                    response.header('Content-Type', res.headers['content-type']);
                                                                                }
                                                                                if (res.headers['x-m2m-ri']) {
                                                                                    response.header('X-M2M-RI', res.headers['x-m2m-ri']);
                                                                                }
                                                                                if (res.headers['x-m2m-rvi']) {
                                                                                    response.header('X-M2M-RVI', res.headers['x-m2m-rvi']);
                                                                                }
                                                                                if (res.headers['x-m2m-rsc']) {
                                                                                    response.header('X-M2M-RSC', res.headers['x-m2m-rsc']);
                                                                                }
                                                                                if (res.headers['content-location']) {
                                                                                    response.header('Content-Location', res.headers['content-location']);
                                                                                }

                                                                                response.statusCode = res.statusCode;
                                                                                response.send(res.body);

                                                                                res = null;
                                                                                request = null;
                                                                                response = null;
                                                                            }
                                                                            else {
                                                                                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                                    connection.release();
                                                                                    request = null;
                                                                                    response = null;
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                    else {
                                                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                            connection.release();
                                                                            request = null;
                                                                            response = null;
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                            else {
                                                                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                    connection.release();
                                                                    request = null;
                                                                    response = null;
                                                                });
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                });
                                            }
                                            else { // if (request.option === '/fopt') {
                                                check_grp(request, response, (rsc, result_grp) => { // check access right for fanoutpoint
                                                    if (rsc == '1') {
                                                        var access_value = '1';
                                                        var body_Obj = {};
                                                        security.check(request, response, request.targetObject[Object.keys(request.targetObject)[0]].ty, result_grp.macp, access_value, result_grp.cr, (code) => {
                                                            if (code === '1') {
                                                                parse_body_format(request, response, (code) => {
                                                                    if (code === '200') {
                                                                        fopt.check(request, response, result_grp, body_Obj, (code) => {
                                                                            if (code === '200') {
                                                                                responder.search_result(request, response, '200', '2000', '', () => {
                                                                                    connection.release();
                                                                                    request = null;
                                                                                    response = null;
                                                                                });
                                                                            }
                                                                            else {
                                                                                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                                    connection.release();
                                                                                    request = null;
                                                                                    response = null;
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                    else {
                                                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                            connection.release();
                                                                            request = null;
                                                                            response = null;
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                            else if (code === '0') {
                                                                response_error_result(request, response, '403-5', () => {
                                                                    connection.release();
                                                                    request = null;
                                                                    response = null;
                                                                });
                                                            }
                                                            else {
                                                                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                    connection.release();
                                                                    request = null;
                                                                    response = null;
                                                                });
                                                            }
                                                        });
                                                    }
                                                    else if (rsc == '2') {
                                                        code = '403-6';
                                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                    else {
                                                        code = '404-4';
                                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                        else if (code === '301-1') {
                                            check_csr(request, response, (code) => {
                                                if (code === '301-2') {
                                                    response.status(response.statusCode).end(response.body);
                                                    connection.release();
                                                    request = null;
                                                    response = null;
                                                }
                                                else {
                                                    responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                        connection.release();
                                                        request = null;
                                                        response = null;
                                                    });
                                                }
                                            });
                                        }
                                        else {
                                            responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                connection.release();
                                                request = null;
                                                response = null;
                                            });
                                        }
                                    });
                                }
                                else {
                                    responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                        connection.release();
                                        request = null;
                                        response = null;
                                    });
                                }
                            });
                        }
                        else {
                            response_error_result(request, response, '400-40', () => {
                                connection.release();
                                request = null;
                                response = null;
                            });
                        }
                    }
                    else {
                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                            connection.release();
                            request = null;
                            response = null;
                        });
                    }
                });
            }
            else {
                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                    request = null;
                    response = null;
                });
            }
        });
    });
});
app.get(onem2mParser, (request, response) => {
    var fullBody = '';
    request.on('data', (chunk) => {
        fullBody += chunk.toString();
    });

    request.on('end', () => {
        request.body = fullBody;

        db.getConnection((code, connection) => {
            if (code === '200') {
                request.db_connection = connection;

                extra_api_action(connection, request.url, (code, result) => {
                    if (code === '200') {
                        if (!request.headers.hasOwnProperty('binding')) {
                            request.headers['binding'] = 'H';
                        }

                        db_sql.set_hit(request.db_connection, request.headers['binding'], (err, results) => {
                            results = null;
                        });

                        check_xm2m_headers(request, (code) => {
                            if (code === '200') {
                                get_target_url(request, response, (code) => {
                                    if (code === '200') {
                                        if (request.option !== '/fopt') {
                                            var rootnm = Object.keys(request.targetObject)[0];
                                            request.url = request.targetObject[rootnm].ri;
                                            if ((request.query.fu == 1 || request.query.fu == 2) && (request.query.rcn == 1 || request.query.rcn == 4 || request.query.rcn == 5 || request.query.rcn == 6 || request.query.rcn == 7)) {
                                                lookup_retrieve(request, response, (code) => {
                                                    if (code === '200') {
                                                        responder.response_result(request, response, '200', '2000', '', () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                    else if (code === '200-1') {
                                                        responder.search_result(request, response, '200', '2000', '', () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                    else {
                                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                });
                                            }
                                            else {
                                                response_error_result(request, response, '400-44', () => {
                                                    connection.release();
                                                    request = null;
                                                    response = null;
                                                });
                                            }
                                        }
                                        else { //if (request.option === '/fopt') {
                                            check_grp(request, response, (rsc, result_grp) => { // check access right for fanoutpoint
                                                if (rsc == '1') {
                                                    var access_value = (request.query.fu == 1) ? '32' : '2';
                                                    var body_Obj = {};
                                                    security.check(request, response, request.targetObject[Object.keys(request.targetObject)[0]].ty, result_grp.macp, access_value, result_grp.cr, (code) => {
                                                        if (code === '1') {
                                                            fopt.check(request, response, result_grp, body_Obj, (code) => {
                                                                if (code === '200') {
                                                                    responder.search_result(request, response, '200', '2000', '', () => {
                                                                        connection.release();
                                                                        request = null;
                                                                        response = null;
                                                                    });
                                                                }
                                                                else {
                                                                    responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                        connection.release();
                                                                        request = null;
                                                                        response = null;
                                                                    });
                                                                }
                                                            });
                                                        }
                                                        else if (code === '0') {
                                                            response_error_result(request, response, '403-5', () => {
                                                                connection.release();
                                                                request = null;
                                                                response = null;
                                                            });
                                                        }
                                                        else {
                                                            responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                connection.release();
                                                                request = null;
                                                                response = null;
                                                            });
                                                        }
                                                    });
                                                }
                                                else if (rsc == '2') {
                                                    code = '403-6';
                                                    responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                        connection.release();
                                                        request = null;
                                                        response = null;
                                                    });
                                                }
                                                else {
                                                    response_error_result(request, response, '404-4', () => {
                                                        connection.release();
                                                        request = null;
                                                        response = null;
                                                    });
                                                }
                                            });
                                        }
                                    }
                                    else if (code === '301-1') {
                                        check_csr(request, response, (code) => {
                                            if (code === '301-2') {
                                                connection.release();
                                                response.status(response.statusCode).end(response.body);
                                                request = null;
                                                response = null;
                                            }
                                            else {
                                                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                    connection.release();
                                                    request = null;
                                                    response = null;
                                                });
                                            }
                                        });
                                    }
                                    else {
                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                            connection.release();
                                            request = null;
                                            response = null;
                                        });
                                    }
                                });
                            }
                            else {
                                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                    connection.release();
                                    request = null;
                                    response = null;
                                });
                            }
                        });
                    }
                    else if (code === '201') {
                        connection.release();
                        response.header('Content-Type', 'application/json');
                        response.status(200).end(JSON.stringify(result, null, 4));
                        result = null;
                    }
                    else {
                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                            connection.release();
                            request = null;
                            response = null;
                        });
                    }
                });
            }
            else {
                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                    request = null;
                    response = null;
                });
            }
        });
    });
});
app.put(onem2mParser, (request, response) => {
    var fullBody = '';
    request.on('data', (chunk) => {
        fullBody += chunk.toString();
    });

    request.on('end', () => {
        request.body = fullBody;

        db.getConnection((code, connection) => {
            if (code === '200') {
                request.db_connection = connection;

                if (!request.headers.hasOwnProperty('binding')) {
                    request.headers['binding'] = 'H';
                }

                db_sql.set_hit(request.db_connection, request.headers['binding'], (err, results) => {
                    results = null;
                });

                check_xm2m_headers(request, (code) => {
                    if (code === '200') {
                        if (request.body !== "") {
                            check_resource_supported(request, response, (code) => {
                                if (code === '200') {
                                    get_target_url(request, response, (code) => {
                                        if (code === '200') {
                                            if (request.option !== '/fopt') {
                                                parse_body_format(request, response, (code) => {
                                                    if (code === '200') {
                                                        check_type_update_resource(request, (code) => {
                                                            if (code === '200') {
                                                                var rootnm = Object.keys(request.targetObject)[0];
                                                                request.url = request.targetObject[rootnm].ri;
                                                                if ((request.query.fu == 2) && (request.query.rcn == 0 || request.query.rcn == 1)) {
                                                                    lookup_update(request, response, (code) => {
                                                                        if (code === '200') {
                                                                            responder.response_result(request, response, '200', '2004', '', () => {
                                                                                connection.release();
                                                                                request = null;
                                                                                response = null;
                                                                            });
                                                                        }
                                                                        else {
                                                                            responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                                connection.release();
                                                                                request = null;
                                                                                response = null;
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                                else {
                                                                    response_error_result(request, response, '400-45', () => {
                                                                        connection.release();
                                                                        request = null;
                                                                        response = null;
                                                                    });
                                                                }
                                                            }
                                                            else {
                                                                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                    connection.release();
                                                                    request = null;
                                                                    response = null;
                                                                });
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                });
                                            }
                                            else { // if (request.option === '/fopt') {
                                                check_grp(request, response, (rsc, result_grp) => { // check access right for fanoutpoint
                                                    if (rsc == '1') {
                                                        var access_value = '4';
                                                        var body_Obj = {};
                                                        security.check(request, response, request.targetObject[Object.keys(request.targetObject)[0]].ty, result_grp.macp, access_value, result_grp.cr, (code) => {
                                                            if (code === '1') {
                                                                parse_body_format(request, response, (code) => {
                                                                    if (code === '200') {
                                                                        fopt.check(request, response, result_grp, body_Obj, (code) => {
                                                                            if (code === '200') {
                                                                                responder.search_result(request, response, '200', '2000', '', () => {
                                                                                    connection.release();
                                                                                    request = null;
                                                                                    response = null;
                                                                                });
                                                                            }
                                                                            else {
                                                                                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                                    connection.release();
                                                                                    request = null;
                                                                                    response = null;
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                    else {
                                                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                            connection.release();
                                                                            request = null;
                                                                            response = null;
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                            else if (code === '0') {
                                                                response_error_result(request, response, '403-5', () => {
                                                                    connection.release();
                                                                    request = null;
                                                                    response = null;
                                                                });
                                                            }
                                                            else {
                                                                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                    connection.release();
                                                                    request = null;
                                                                    response = null;
                                                                });
                                                            }
                                                        });
                                                    }
                                                    else if (rsc == '2') {
                                                        code = '403-6';
                                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                    else {
                                                        response_error_result(request, response, '404-4', () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                        else if (code === '301-1') {
                                            check_csr(request, response, (code) => {
                                                if (code === '301-2') {
                                                    connection.release();
                                                    response.status(response.statusCode).end(response.body);
                                                    request = null;
                                                    response = null;
                                                }
                                                else {
                                                    responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                        connection.release();
                                                        request = null;
                                                        response = null;
                                                    });
                                                }
                                            });
                                        }
                                        else {
                                            responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                connection.release();
                                                request = null;
                                                response = null;
                                            });
                                        }
                                    });
                                }
                                else {
                                    responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                        connection.release();
                                        request = null;
                                        response = null;
                                    });
                                }
                            });
                        }
                        else {
                            response_error_result(request, response, '400-40', () => {
                                connection.release();
                                request = null;
                                response = null;
                            });
                        }
                    }
                    else {
                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                            connection.release();
                            request = null;
                            response = null;
                        });
                    }
                });
            }
            else {
                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                    request = null;
                    response = null;
                });
            }
        });
    });
});
app.delete(onem2mParser, (request, response) => {
    var fullBody = '';
    request.on('data', (chunk) => {
        fullBody += chunk.toString();
    });

    request.on('end', () => {
        request.body = fullBody;

        db.getConnection((code, connection) => {
            if (code === '200') {
                request.db_connection = connection;

                if (!request.headers.hasOwnProperty('binding')) {
                    request.headers['binding'] = 'H';
                }

                db_sql.set_hit(request.db_connection, request.headers['binding'], (err, results) => {
                    results = null;
                });

                check_xm2m_headers(request, (code) => {
                    if (code === '200') {
                        get_target_url(request, response, (code) => {
                            if (code === '200') {
                                if (request.option !== '/fopt') {
                                    check_type_delete_resource(request, (code) => {
                                        if (code === '200') {
                                            var rootnm = Object.keys(request.targetObject)[0];
                                            request.url = request.targetObject[rootnm].ri;
                                            request.pi = request.targetObject[rootnm].pi;
                                            if ((request.query.fu == 2) && (request.query.rcn == 0 || request.query.rcn == 1)) {
                                                lookup_delete(request, response, (code) => {
                                                    if (code === '200') {
                                                        if(cache_resource_url.hasOwnProperty(request.url)) {
                                                            delete cache_resource_url[request.url];
                                                        }

                                                        if(cache_resource_url.hasOwnProperty(request.url + '/la')) {
                                                            delete cache_resource_url[request.url + '/la'];
                                                        }

                                                        if(cache_resource_url.hasOwnProperty(request.pi + '/la')) {
                                                            delete cache_resource_url[request.pi + '/la'];
                                                        }

                                                        responder.response_result(request, response, '200', '2002', '', () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                    else {
                                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                            connection.release();
                                                            request = null;
                                                            response = null;
                                                        });
                                                    }
                                                });
                                            }
                                            else {
                                                response_error_result(request, response, '400-46', () => {
                                                    connection.release();
                                                    request = null;
                                                    response = null;
                                                });
                                            }
                                        }
                                        else {
                                            responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                connection.release();
                                                request = null;
                                                response = null;
                                            });
                                        }
                                    });
                                }
                                else { // if (request.option === '/fopt') {
                                    check_grp(request, response, (rsc, result_grp) => { // check access right for fanoutpoint
                                        if (rsc == '1') {
                                            var access_value = '8';
                                            var body_Obj = {};
                                            security.check(request, response, request.targetObject[Object.keys(request.targetObject)[0]].ty, result_grp.macp, access_value, result_grp.cr, (code) => {
                                                if (code === '1') {
                                                    fopt.check(request, response, result_grp, body_Obj, (code) => {
                                                        if (code === '200') {
                                                            responder.search_result(request, response, '200', '2000', '', () => {
                                                                connection.release();
                                                                request = null;
                                                                response = null;
                                                            });
                                                        }
                                                        else {
                                                            responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                                connection.release();
                                                                request = null;
                                                                response = null;
                                                            });
                                                        }
                                                    });
                                                }
                                                else if (code === '0') {
                                                    response_error_result(request, response, '403-5', () => {
                                                        connection.release();
                                                        request = null;
                                                        response = null;
                                                    });
                                                }
                                                else {
                                                    responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                        connection.release();
                                                        request = null;
                                                        response = null;
                                                    });
                                                }
                                            });
                                        }
                                        else if (rsc == '2') {
                                            code = '403-6';
                                            responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                                connection.release();
                                                request = null;
                                                response = null;
                                            });
                                        }
                                        else {
                                            response_error_result(request, response, '404-4', () => {
                                                connection.release();
                                                request = null;
                                                response = null;
                                            });
                                        }
                                    });
                                }
                            }
                            else if (code === '301-1') {
                                check_csr(request, response, (code) => {
                                    if (code === '301-2') {
                                        connection.release();
                                        response.status(response.statusCode).end(response.body);
                                        request = null;
                                        response = null;
                                    }
                                    else {
                                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                            connection.release();
                                            request = null;
                                            response = null;
                                        });
                                    }
                                });
                            }
                            else {
                                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                                    connection.release();
                                    request = null;
                                    response = null;
                                });
                            }
                        });
                    }
                    else {
                        responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                            connection.release();
                            request = null;
                            response = null;
                        });
                    }
                });
            }
            else {
                responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
                    request = null;
                    response = null;
                });
            }
        });
    });
});

function notify_http(hostname, port, path, method, headers, bodyString, callback) {
    let options = {
        hostname: hostname,
        port: port,
        path: path,
        method: method,
        headers: headers
    };

    const req = http.request(options, (res) => {
        let fullBody = '';
        res.on('data', (chunk) => {
            fullBody += chunk.toString();
        });
        res.on('end', () => {
            console.log('--------------------------------------------------------------------------');
            console.log(fullBody);
            console.log('[notify_http response : ' + res.statusCode + ']');
            callback('200', res);
        });
    });
    req.on('error', (e) => {
        console.log('[forward_http] problem with request: ' + e.message);
        callback('404-7');
    });

    console.log(method + ' - ' + path);
    console.log(bodyString);

    // write data to request body
    if ((method.toLowerCase() == 'get') || (method.toLowerCase() == 'delete')) {
        req.write('');
    }
    else {
        req.write(bodyString);
    }
    req.end();
}
function forward_http(forwardcbhost, forwardcbport, f_url, f_method, f_headers, f_body, callback) {
    var options = {
        hostname: forwardcbhost,
        port: forwardcbport,
        path: f_url,
        method: f_method,
        headers: f_headers
    };

    var req = http.request(options, (res) => {
        var fullBody = '';

        res.on('data', (chunk) => {
            fullBody += chunk.toString();
        });

        res.on('end', () => {
            res.body = fullBody;

            console.log('--------------------------------------------------------------------------');
            console.log(res.url);
            console.log(res.headers);
            console.log(res.body);
            console.log('[Forward response : ' + res.statusCode + ']');

            callback('200', res);
        });
    });

    req.on('error', (e) => {
        console.log('[forward_http] problem with request: ' + e.message);

        callback('404-3');
    });

    console.log(f_method + ' - ' + f_url);
    console.log(f_headers);
    console.log(f_body);

    // write data to request body
    if ((f_method.toLowerCase() == 'get') || (f_method.toLowerCase() == 'delete')) {
        req.write('');
    }
    else {
        req.write(f_body);
    }
    req.end();
}
function scheduleGc() {
    if (!global.gc) {
        console.log('Garbage collection is not exposed');
        return;
    }

    // schedule next gc within a random interval (e.g. 15-45 minutes)
    // tweak this based on your app's memory usage
    let nextMinutes = Math.random() * 30 + 15;

    setTimeout(() => {
        global.gc();
        console.log('Manual gc', process.memoryUsage());
        scheduleGc();
    }, nextMinutes * 60 * 1000);
}

if (process.env.NODE_ENV == 'production') {
    console.log("Production Mode");
}
else if (process.env.NODE_ENV == 'development') {
    console.log("Development Mode");
}
else {
    console.log("Unknown Mode");
}

// call this in the startup script of your app (once per process)
scheduleGc();
