

const xml2js = require("xml2js");
const cbor = require("cbor");
const url = require("url");
const db_sql = require("./mobius/sql_action");
const resource = require("./mobius/resource");
const responder = require("./mobius/responder");
const util = require("util");


//////////////////////////////////////////////////////////
// resource callbacks...

function check_resource_from_url(connection, ri, sri, callback) {
    if(cache_resource_url.hasOwnProperty(ri)) {
        callback(cache_resource_url[ri], 200);
    }
    else {
        db_sql.select_resource_from_url(connection, ri, sri, (err, results) => {
            if (err) {
                callback(null, 500);
            }
            else {
                if (results.length === 0) {
                    callback(null, 404);
                }
                else {
                    cache_resource_url[ri] = JSON.parse(JSON.stringify(results[0]));
                    callback(results[0], 200);
                }
            }
        });
    }
}

function get_resource_from_url(connection, ri, sri, option, callback) {
    var targetObject = {};

    check_resource_from_url(connection, ri, sri, (result, code) => {
        if(code === 200) {
            var ty = result.ty;
            targetObject[responder.typeRsrc[ty]] = result;
            var rootnm = Object.keys(targetObject)[0];
            makeObject(targetObject[rootnm]);

            if (option == '/latest') {
                // if(cache_resource_url.hasOwnProperty(ri + '/la')) {
                //
                //     ty = cache_resource_url[ri + '/la'].ty;
                //     targetObject = {};
                //     targetObject[responder.typeRsrc[ty]] = JSON.parse(JSON.stringify(cache_resource_url[ri + '/la']));
                //     rootnm = Object.keys(targetObject)[0];
                //     makeObject(targetObject[rootnm]);
                //
                //     console.log(targetObject);
                //
                //     callback(targetObject, 200);
                // }
                // else {
                var la_id = 'select_latest_resource ' + targetObject[rootnm].ri + ' - ' + require('shortid').generate();
                console.time(la_id);
                var latestObj = [];
                db_sql.select_latest_resource(connection, targetObject[rootnm], 0, latestObj, (code) => {
                    console.timeEnd(la_id);
                    if (code === '200') {
                        if (latestObj.length == 1) {

                            console.log(latestObj);

                            let strLatestObj = JSON.stringify(latestObj[0]).replace('RowDataPacket ', '');

                            latestObj[0] = JSON.parse(strLatestObj);
                            console.log(latestObj);

                            targetObject = {};
                            targetObject[responder.typeRsrc[latestObj[0].ty]] = latestObj[0];
                            makeObject(targetObject[Object.keys(targetObject)[0]]);

                            cache_resource_url[latestObj[0].pi + '/la'] = targetObject[Object.keys(targetObject)[0]];
                            console.log(cache_resource_url);

                            callback(targetObject);
                        }
                        else {
                            callback(null, 404);
                            return '0';
                        }
                    }
                    else {
                        callback(null, 500);
                        return '0';
                    }
                });
                // }
            }
            else if (option == '/oldest') {
                var oldestObj = [];
                db_sql.select_oldest_resource(connection, parseInt(ty, 10) + 1, ri, oldestObj, (code) => {
                    if (code === '200') {
                        if (oldestObj.length == 1) {
                            targetObject = {};
                            targetObject[responder.typeRsrc[oldestObj[0].ty]] = oldestObj[0];
                            makeObject(targetObject[Object.keys(targetObject)[0]]);
                            callback(targetObject);
                        }
                        else {
                            callback(null, 404);
                            return '0';
                        }
                    }
                    else {
                        callback(null, 500);
                        return '0';
                    }
                });
            }
            else if (option == '/fopt') {
                callback(targetObject, 200);
            }
            else {
                callback(targetObject, 200);
            }
        }
        else {
            callback(result, code);
        }
    });
}


//////////////////////////////////////////////////////////
// request, response callbacks...

function parse_to_json(request, response, callback) {
    if (request.usebodytype === 'xml') {
        try {
            var parser = new xml2js.Parser({explicitArray: false});
            parser.parseString(request.body.toString(), (err, result) => {
                if (err) {
                    callback('400-5');
                }
                else {
                    request.bodyObj = result;
                    make_short_nametype(request.bodyObj);
                    make_json_arraytype(request.bodyObj);

                    request.headers.rootnm = Object.keys(request.bodyObj)[0];
                    callback('200');
                }
            });
        }
        catch (e) {
            callback('400-5');
        }
    }
    else if (request.usebodytype === 'cbor') {
        try {
            var encoded = request.body;
            cbor.decodeFirst(encoded, (err, result) => {
                if (err) {
                    callback('400-6');
                }
                else {
                    request.bodyObj = result;
                    make_short_nametype(request.bodyObj);
                    //make_json_arraytype(request.bodyObj);

                    request.headers.rootnm = Object.keys(request.bodyObj)[0];
                    callback('200');
                }
            });
        }
        catch (e) {
            callback('400-6');
        }
    }
    else {
        try {
            request.bodyObj = JSON.parse(request.body.toString());
            make_short_nametype(request.bodyObj);

            if (Object.keys(request.bodyObj)[0] == 'undefined') {
                callback('400-7');
            }
            else {
                request.headers.rootnm = Object.keys(request.bodyObj)[0];
                callback('200');
            }
        }
        catch (e) {
            callback('400-7');
        }
    }
}

function parse_body_format(request, response, callback) {
    parse_to_json(request, response, (code) => {
        if (code === '200') {
            var body_Obj = request.bodyObj;
            for (var prop in body_Obj) {
                if (body_Obj.hasOwnProperty(prop)) {
                    for (var attr in body_Obj[prop]) {
                        if (body_Obj[prop].hasOwnProperty(attr)) {
                            if (attr == 'aa' || attr == 'at' || attr == 'poa' || attr == 'acpi' || attr == 'srt' ||
                                attr == 'nu' || attr == 'mid' || attr == 'macp' || attr == 'rels' || attr == 'rqps' || attr == 'srv') {
                                if (!Array.isArray(body_Obj[prop][attr])) {
                                    callback('400-8');
                                    return;
                                }
                            }
                            else if (attr == 'lbl') {
                                if (body_Obj[prop][attr] == null) {
                                    body_Obj[prop][attr] = [];
                                }
                                else if (!Array.isArray(body_Obj[prop][attr])) {
                                    callback('400-9');
                                    return;
                                }
                            }
                            else if (attr == 'enc') {
                                if (body_Obj[prop][attr].net) {
                                    if (!Array.isArray(body_Obj[prop][attr].net)) {
                                        callback('400-10');
                                        return;
                                    }
                                }
                                else {
                                    callback('400-11');
                                    return;
                                }
                            }
                            else if (attr == 'pv' || attr == 'pvs') {
                                if (body_Obj[prop][attr].hasOwnProperty('acr')) {
                                    if (!Array.isArray(body_Obj[prop][attr].acr)) {
                                        callback('400-12');
                                        return;
                                    }
                                    var acr = body_Obj[prop][attr].acr;
                                    for (var acr_idx in acr) {
                                        if (acr.hasOwnProperty(acr_idx)) {
                                            if (acr[acr_idx].acor) {
                                                if (!Array.isArray(acr[acr_idx].acor)) {
                                                    callback('400-13');
                                                    return;
                                                }
                                            }
                                            if (acr[acr_idx].acco) {
                                                if (!Array.isArray(acr[acr_idx].acco)) {
                                                    callback('400-14');
                                                    return;
                                                }
                                                for (var acco_idx in acr[acr_idx].acco) {
                                                    if (acr[acr_idx].acco.hasOwnProperty(acco_idx)) {
                                                        var acco = acr[acr_idx].acco[acco_idx];
                                                        if (acco.acip) {
                                                            if (acco.acip['ipv4']) {
                                                                if (!Array.isArray(acco.acip['ipv4'])) {
                                                                    callback('400-15');
                                                                    return;
                                                                }
                                                            }
                                                            else if (acco.acip['ipv6']) {
                                                                if (!Array.isArray(acco.acip['ipv6'])) {
                                                                    callback('400-16');
                                                                    return;
                                                                }
                                                            }
                                                        }
                                                        if (acco.actw) {
                                                            if (!Array.isArray(acco.actw)) {
                                                                callback('400-17');
                                                                return;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            else if (attr == 'uds') {
                                if (body_Obj[prop][attr].can && body_Obj[prop][attr].sus) {
                                }
                                else {
                                    callback('400-18');
                                    return;
                                }
                            }
                            else if (attr == 'cas') {
                                if (body_Obj[prop][attr].can && body_Obj[prop][attr].sus) {
                                }
                                else {
                                    callback('400-18');
                                    return;
                                }
                            }
                            else {
                            }
                        }
                    }
                }
            }
            callback(code);
        }
        else {
            callback(code);
        }
    });
}

function check_resource(request, response, callback) {
    var ri = url.parse(request.url).pathname;

    var chk_fopt = ri.split('/fopt');
    if (chk_fopt.length == 2) {
        ri = chk_fopt[0];
        db_sql.select_grp_lookup(request.db_connection, ri, (err, result_Obj) => {
            if (!err) {
                if (result_Obj.length == 1) {
                    result_Obj[0].acpi = JSON.parse(result_Obj[0].acpi);
                    result_Obj[0].lbl = JSON.parse(result_Obj[0].lbl);
                    result_Obj[0].aa = JSON.parse(result_Obj[0].aa);
                    result_Obj[0].at = JSON.parse(result_Obj[0].at);

                    request.targetObj = JSON.parse(JSON.stringify(result_Obj[0]));
                    result_Obj = null;

                    callback('200');
                }
                else {
                    callback('404-4');
                }
            }
            else {
                callback('500-3');
            }
        });
    }
    else {
        console.log('X-M2M-Origin: ' + request.headers['x-m2m-origin']);
        callback('200');
    }
}

function check_grp(request, response, callback) {
    var result_Obj = request.targetObject;
    var rootnm = Object.keys(result_Obj)[0];

    if (result_Obj[rootnm].ty == 9) {
        if (result_Obj[rootnm].mid.length == 0) {
            result_Obj = {};
            result_Obj['dbg'] = 'NO_MEMBERS: memberID in parent group is empty';
            responder.response_result(request, response, '403', result_Obj, '4109', request.url, result_Obj['dbg']);
            callback('2');
            return '0';
        }
        else {
            callback('1', result_Obj[rootnm]);
            return '1';
        }
    }
    else {
        result_Obj = {};
        result_Obj['dbg'] = '[check_grp] resource does not exist';
        responder.response_result(request, response, '404', result_Obj, '4004', request.url, result_Obj['dbg']);
        callback('0');
        return '0';
    }
}

function check_resource_supported(request, response, callback) {
    make_json_obj(request.usebodytype, request.body, (err, body) => { //body is json object.
        try {
            var arr_rootnm = Object.keys(body)[0].split(':');

            if(arr_rootnm[0] === 'hd') {
                var rootnm = Object.keys(body)[0].replace('hd:', 'hd_');
            }
            else {
                rootnm = Object.keys(body)[0].replace('m2m:', '');
            }

            var checkCount = 0;
            for (var key in responder.typeRsrc) {
                if (responder.typeRsrc.hasOwnProperty(key)) {
                    if (responder.typeRsrc[key] == rootnm) {
                        request.ty = key;
                        break;
                    }
                    checkCount++;
                }
            }
            body = null;

            if (checkCount >= Object.keys(responder.typeRsrc).length) {
                callback('400-3');
            }
            else {
                callback('200');
            }
        }
        catch (e) {
            callback('400-4');
        }
    });
}

function get_target_url(request, response, callback) {
    request.url = request.url.replace('%23', '#'); // convert '%23' to '#' of url
    request.hash = url.parse(request.url).hash;

    var absolute_url = request.url.replace('\/_\/', '\/\/').split('#')[0];
    absolute_url = absolute_url.replace(usespid, '/~');
    absolute_url = absolute_url.replace(/\/~\/[^\/]+\/?/, '/');
    var absolute_url_arr = absolute_url.split('/');

    console.log('\n' + request.method + ' : ' + request.url);
    request.bodyObj = {};

    request.option = '';
    request.sri = absolute_url_arr[1].split('?')[0];
    if (absolute_url_arr[absolute_url_arr.length - 1] == 'la') {
        if (request.method.toLowerCase() == 'get' || request.method.toLowerCase() == 'delete') {
            request.ri = absolute_url.split('?')[0];
            request.ri = request.ri.substr(0, request.ri.length-3);
            request.option = '/latest';
        }
        else {
            callback('409-1');
        }
    }
    else if (absolute_url_arr[absolute_url_arr.length - 1] == 'latest') {
        if (request.method.toLowerCase() == 'get' || request.method.toLowerCase() == 'delete') {
            request.ri = absolute_url.split('?')[0];
            request.ri = request.ri.substr(0, request.ri.length-7);
            request.option = '/latest';
        }
        else {
            callback('409-1');
        }
    }
    else if (absolute_url_arr[absolute_url_arr.length - 1] == 'ol') {
        if (request.method.toLowerCase() == 'get' || request.method.toLowerCase() == 'delete') {
            request.ri = absolute_url.split('?')[0];
            request.ri = request.ri.substr(0, request.ri.length-3);
            request.option = '/oldest';
        }
        else {
            callback('409-2')
        }
    }
    else if (absolute_url_arr[absolute_url_arr.length - 1] == 'oldest') {
        if (request.method.toLowerCase() == 'get' || request.method.toLowerCase() == 'delete') {
            request.ri = absolute_url.split('?')[0];
            request.ri = request.ri.substr(0, request.ri.length-7);
            request.option = '/oldest';
        }
        else {
            callback('409-2')
        }
    }
    else if (absolute_url_arr[absolute_url_arr.length - 1] == 'fopt') {
        request.ri = absolute_url.split('?')[0].replace('/fopt', '');
        request.option = '/fopt';
    }
    else {
        request.ri = absolute_url.split('?')[0];
        request.option = '';
    }

    request.absolute_url = absolute_url;
    absolute_url = null;
    var tid = require('shortid').generate();
    console.time('get_resource_from_url' + ' (' + tid + ') - ' + request.absolute_url);
    get_resource_from_url(request.db_connection, request.ri, request.sri, request.option, (targetObject, status) => {
        console.timeEnd('get_resource_from_url' + ' (' + tid + ') - ' + request.absolute_url);
        if (status == 404) {
            if (url.parse(request.absolute_url).pathname.split('/')[1] == usecsebase) {
                callback('404-1');
            }
            else {
                callback('301-1');
            }
        }
        else if (status == 500) {
            callback('500-1');
        }
        else {
            if (targetObject) {
                request.targetObject = JSON.parse(JSON.stringify(targetObject));
                targetObject = null;

                callback('200');
            }
            else {
                callback('404-1');
            }
        }
    });
}

function check_notification(request, response, callback) {
    if (request.headers.hasOwnProperty('content-type')) {
        if (request.headers['content-type'].includes('ty')) { // post
            callback('post');
        }
        else {
            if (request.headers.rootnm == 'sgn') {
                callback('notify');
            }
            else {
                callback('400-19');
            }
        }
    }
    else {
        callback('400-20');
    }
}

function check_ae_notify(request, response, callback) {
    var ri = request.targetObject[Object.keys(request.targetObject)[0]].ri;
    console.log('[check_ae_notify] : ' + ri);
    db_sql.select_ae(ri, (err, result_ae) => {
        if (!err) {
            if (result_ae.length == 1) {
                var point = {};
                var poa_arr = JSON.parse(result_ae[0].poa);
                for (var i = 0; i < poa_arr.length; i++) {
                    var poa = url.parse(poa_arr[i]);
                    if (poa.protocol == 'http:') {
                        console.log('send notification to ' + poa_arr[i]);
                        notify_http(poa.hostname, poa.port, poa.path, request.method, request.headers, request.body, (code, res) => {
                            callback(code, res)
                        });
                    }
                    else if (poa.protocol == 'coap:') {
                        console.log('send notification to ' + poa_arr[i]);
                        callback('405-12');
                    }
                    else if (poa.protocol == 'mqtt:') {
                        callback('405-10');
                    }
                    else if (poa.protocol == 'ws:') {
                        callback('405-11');
                    }
                    else {
                        callback('400-47');
                    }
                }
            }
            else {
                callback('404-6');
            }
        }
        else {
            console.log('[check_ae_notify] query error: ' + result_ae.message);
            callback('500-1');
        }
    });
}

function check_csr(request, response, callback) {
    var ri = util.format('/%s/%s', usecsebase, url.parse(request.absolute_url).pathname.split('/')[1]);
    console.log('[check_csr] : ' + ri);
    db_sql.select_csr(request.db_connection, ri, (err, result_csr) => {
        if (!err) {
            if (result_csr.length == 1) {
                var point = {};
                point.forwardcbname = result_csr[0].cb.replace('/', '');
                var poa_arr = JSON.parse(result_csr[0].poa);
                for (var i = 0; i < poa_arr.length; i++) {
                    var poa = url.parse(poa_arr[i]);
                    if (poa.protocol == 'http:') {
                        point.forwardcbhost = poa.hostname;
                        point.forwardcbport = poa.port;

                        console.log('csebase forwarding to ' + point.forwardcbname);

                        forward_http(point.forwardcbhost, point.forwardcbport, request.url, request.method, request.headers, request.body, (code, _res) => {
                            if (code === '200') {
                                var res = JSON.parse(JSON.stringify(_res));
                                _res = null;
                                if (res.headers.hasOwnProperty('content-type')) {
                                    response.setHeader('Content-Type', res.headers['content-type']);
                                }

                                if (res.headers.hasOwnProperty('x-m2m-ri')) {
                                    response.setHeader('X-M2M-RI', res.headers['x-m2m-ri']);
                                }

                                if (res.headers.hasOwnProperty('x-m2m-rvi')) {
                                    response.setHeader('X-M2M-RVI', res.headers['x-m2m-rvi']);
                                }

                                if (res.headers.hasOwnProperty('x-m2m-rsc')) {
                                    response.setHeader('X-M2M-RSC', res.headers['x-m2m-rsc']);
                                }

                                if (res.headers.hasOwnProperty('content-location')) {
                                    response.setHeader('Content-Location', res.headers['content-location']);
                                }

                                response.body = res.body;
                                response.statusCode = res.statusCode;

                                callback('301-2');
                            }
                            else {
                                callback(code);
                            }
                        });
                    }
                    else if (poa.protocol == 'mqtt:') {
                        point.forwardcbmqtt = poa.hostname;
                        console.log('forwarding with mqtt is not supported');

                        callback('301-3');
                    }
                    else {
                        console.log('protocol in poa of csr is not supported');

                        callback('301-4');
                    }
                }
                result_csr = null;
            }
            else {
                result_csr = null;
                callback('404-3');
            }
        }
        else {
            console.log('[check_csr] query error: ' + result_csr.message);
            callback('404-3');
        }
    });
}

//////////////////////////////////////////////////////////
// request callbacks...

function check_xm2m_headers(request, callback) {
    // Check X-M2M-RI Header
    if (request.headers.hasOwnProperty('x-m2m-ri')) {
        if (request.headers['x-m2m-ri'] === '') {
            callback('400-1');
            return;
        }
    }
    else {
        callback('400-1');
        return;
    }

    // Check X-M2M-RVI Header
    if (!request.headers.hasOwnProperty('x-m2m-rvi')) {
        request.headers['x-m2m-rvi'] = uservi;  //2a
    }

    request.ty = '99'; // init type....
    if (request.headers.hasOwnProperty('content-type')) {
        let content_type = request.headers['content-type'].split(';');
        for (let i in content_type) {
            if (content_type.hasOwnProperty(i)) {
                let ty_arr = content_type[i].replace(/ /g, '').split('=');
                if (ty_arr[0].replace(/ /g, '') == 'ty') {
                    request.ty = ty_arr[1].replace(' ', ''); //remove space
                    content_type = null;
                    break;
                }
            }
        }

        if (request.ty == '5') { //CSEBase
            callback('405-1');
            return;
        }

        if (request.ty == '17') { //polling channel
            callback('405-2');
            return;
        }

        if (request.headers['content-type'].includes('xml')) {
            request.usebodytype = 'xml';
        }
        else if (request.headers['content-type'].includes('cbor')) {
            request.usebodytype = 'cbor';
        }
        else {
            request.usebodytype = 'json';
        }
    }
    else {
        request.usebodytype = 'json';
    }

    // Check X-M2M-Origin Header
    if (request.headers.hasOwnProperty('x-m2m-origin')) {
        if (request.headers['x-m2m-origin'] === '') {
            if (request.ty == '2' || request.ty == '16') {  //ty is AE or nodeinfo
                request.headers['x-m2m-origin'] = 'S';
            }
            else {
                callback('400-2');
                return;
            }
        }
    }
    else {
        callback('400-2');
        return;
    }

    if (!request.query.hasOwnProperty('fu')) {
        request.query.fu = 2;
    }

    if (!request.query.hasOwnProperty('rcn')) {
        request.query.rcn = 1;
    }

    if (!request.query.hasOwnProperty('rt')) {
        request.query.rt = 3;
    }

    let allow = 1;
    if (allowed_ae_ids.length > 0) {
        allow = 0;
        for (let idx in allowed_ae_ids) {
            if (allowed_ae_ids.hasOwnProperty(idx)) {
                if (usecseid == request.headers['x-m2m-origin']) {
                    allow = 1;
                    break;
                }
                else if (allowed_ae_ids[idx] == request.headers['x-m2m-origin']) {
                    allow = 1;
                    break;
                }
            }
        }

        if (allow == 0) {
            callback('403-1');
            return;
        }
    }

    if (!responder.typeRsrc.hasOwnProperty(request.ty)) {
        callback('405-3');
        return;
    }

    callback('200');
}

function check_allowed_app_ids(request, callback) {
    if (responder.typeRsrc[request.ty] != Object.keys(request.bodyObj)[0]) {
        if (responder.typeRsrc[request.ty] == 'mgo') {
            var support_mgo = 0;
            for (var prop in responder.mgoType) {
                if (responder.mgoType.hasOwnProperty(prop)) {
                    if (responder.mgoType[prop] == Object.keys(request.bodyObj)[0]) {
                        support_mgo = 1;
                        break;
                    }
                }
            }

            if (support_mgo == 0) {
                callback('400-42');
                return;
            }
        }
        else {
            callback('400-42');
            return;
        }
    }

    if (request.ty == '2') {
        var allow = 1;
        if (allowed_app_ids.length > 0) {
            allow = 0;
            for (var idx in allowed_app_ids) {
                if (allowed_app_ids.hasOwnProperty(idx)) {
                    if (allowed_app_ids[idx] == request.bodyObj.ae.api) {
                        allow = 1;
                        break;
                    }
                }
            }
            if (allow == 0) {
                callback('403-4');
                return;
            }
        }
    }

    callback('200');
}

function check_type_update_resource(request, callback) {
    for (var ty_idx in responder.typeRsrc) {
        if (responder.typeRsrc.hasOwnProperty(ty_idx)) {
            if ((ty_idx == 4) && (responder.typeRsrc[ty_idx] == Object.keys(request.bodyObj)[0])) {
                callback('405-7');
                return;
            }
            else if ((ty_idx != 4) && (responder.typeRsrc[ty_idx] == Object.keys(request.bodyObj)[0])) {
                if ((ty_idx == 17) && (responder.typeRsrc[ty_idx] == Object.keys(request.bodyObj)[0])) {
                    callback('405-8');
                    return;
                }
                else {
                    request.ty = ty_idx;
                    break;
                }
            }
            else if (ty_idx == 13) {
                for (var mgo_idx in responder.mgoType) {
                    if (responder.mgoType.hasOwnProperty(mgo_idx)) {
                        if ((responder.mgoType[mgo_idx] == Object.keys(request.bodyObj)[0])) {
                            request.ty = ty_idx;
                            break;
                        }
                    }
                }
            }
        }
    }

    if (url.parse(request.targetObject[Object.keys(request.targetObject)[0]].ri).pathname == ('/' + usecsebase)) {
        callback('405-9');
        return;
    }

    callback('200');
}

function check_type_delete_resource(request, callback) {
    if (url.parse(request.targetObject[Object.keys(request.targetObject)[0]].ri).pathname == ('/' + usecsebase)) {
        callback('405-9');
    }
    else {
        callback('200');
    }
}


//////////////////////////////////////////////////////////
// module exports

module.exports = {
    parse_to_json,
    parse_body_format,
    check_resource,
    check_grp,
    check_resource_supported,
    get_target_url,
    check_notification,
    check_ae_notify,
    check_csr,
    check_xm2m_headers,
    check_allowed_app_ids,
    check_type_update_resource,
    check_type_delete_resource
};
