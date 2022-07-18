
const tr = require("./mobius/tr");
const security = require("./mobius/security");
const resource = require("./mobius/resource");

//////////////////////////////////////////////////////////
// help

function check_request_query_rt(request, response, callback) {
    //var ri = url.parse(request.url).pathname;

    //var url_arr = ri.split('/');
    //var last_url = url_arr[url_arr.length-1];
    //var op = 'direct';

    if (request.query.rt == 3) { // default, blocking
        callback('200');
    }
    else if (request.query.rt == 1 || request.query.rt == 2) { // nonblocking
        if (request.query.rt == 2 && request.headers['x-m2m-rtu'] == null && request.headers['x-m2m-rtu'] == '') {
            callback('400-21');
        }
        else {
            // first create request resource under CSEBase
            var temp_rootnm = request.headers.rootnm;
            var temp_body_Obj = JSON.parse(JSON.stringify(request.bodyObj));
            var temp_ty = request.ty;


            request.ty = '17';
            var rt_body_Obj = {req: {}};
            request.headers.rootnm = 'req';
            request.bodyObj = rt_body_Obj;
            request.query.rt = 3;

            resource.create(request, response, (code) => {
                if (code === '200') {
                    request.ty = temp_ty;
                    request.headers.rootnm = temp_rootnm;
                    request.bodyObj = temp_body_Obj;
                    request.query.rt = 1;
                    callback(code);
                }
                else {
                    callback(code);
                }
            });
        }
    }
    else {
        callback('405-4');
    }
}


//////////////////////////////////////////////////////////
// lookup

function lookup_create(request, response, callback) {
    check_request_query_rt(request, response, (code) => {
        if (code === '200') {
            var parentObj = request.targetObject[Object.keys(request.targetObject)[0]];

            tr.check(request, (code) => {
                if (code === '200') {
                    if ((request.ty == 1) && (parentObj.ty == 5 || parentObj.ty == 16 || parentObj.ty == 2)) { // accessControlPolicy
                    }
                    else if ((request.ty == 9) && (parentObj.ty == 5 || parentObj.ty == 16 || parentObj.ty == 2)) { // group
                    }
                    else if ((request.ty == 16) && (parentObj.ty == 5)) { // remoteCSE
                        if (usecsetype == 'asn' && request.headers.csr == null) {
                            callback('400-28');
                            return;
                        }
                    }
                    else if ((request.ty == 10) && (parentObj.ty == 5)) { // locationPolicy
                    }
                    else if ((request.ty == 2) && (parentObj.ty == 5)) { // ae
                    }
                    else if ((request.ty == 3) && (parentObj.ty == 5 || parentObj.ty == 2 || parentObj.ty == 3)) { // container
                    }
                    else if ((request.ty == 23) && (parentObj.ty == 5 || parentObj.ty == 16 || parentObj.ty == 2 || parentObj.ty == 3 || parentObj.ty == 24 || parentObj.ty == 29 || parentObj.ty == 9 || parentObj.ty == 1 || parentObj.ty == 27 || parentObj.ty == 28)) { // sub
                    }
                    else if ((request.ty == 4) && (parentObj.ty == 3)) { // contentInstance
                    }
                    else if ((request.ty == 24) && (parentObj.ty == 2 || parentObj.ty == 3 || parentObj.ty == 4 || parentObj.ty == 29)) { // semanticDescriptor
                    }
                    else if ((request.ty == 29) && (parentObj.ty == 5 || parentObj.ty == 16 || parentObj.ty == 2)) { // timeSeries
                    }
                    else if ((request.ty == 30) && (parentObj.ty == 29)) { // timeSeriesInstance
                    }
                    else if ((request.ty == 27) && (parentObj.ty == 2 || parentObj.ty == 16)) { // multimediaSession
                    }
                    else if ((request.ty == 14) && (parentObj.ty == 5)) { // node
                    }
                    else if ((request.ty == 13) && (parentObj.ty == 14)) { // mgmtObj
                    }
                    else if ((request.ty == 38) && (parentObj.ty == 5 || parentObj.ty == 16 || parentObj.ty == 2 || parentObj.ty == 3 || parentObj.ty == 24 || parentObj.ty == 29 || parentObj.ty == 9 || parentObj.ty == 1 || parentObj.ty == 27)) { // transaction
                    }
                    else if ((request.ty == 39) && (parentObj.ty == 5 || parentObj.ty == 16 || parentObj.ty == 2 || parentObj.ty == 3 || parentObj.ty == 24 || parentObj.ty == 29 || parentObj.ty == 9 || parentObj.ty == 1 || parentObj.ty == 27)) { // transaction
                    }
                    else if ((request.ty == 28) && (parentObj.ty == 5 || parentObj.ty == 2 || parentObj.ty == 3 || parentObj.ty == 28)) { // flexcontainer
                    }
                    else if ((request.ty == 98 || request.ty == 97 || request.ty == 96 || request.ty == 95 || request.ty == 94 || request.ty == 93 || request.ty == 92 || request.ty == 91) && (parentObj.ty == 28)) { // flexcontainer
                    }
                    else {
                        callback('403-2');
                        return;
                    }

                    if (((request.ty == 4) && (parentObj.ty == 3)) || ((request.ty == 30) && (parentObj.ty == 29))) { // contentInstance
                        if (parseInt(parentObj.mni) == 0) {
                            callback('406-1');
                            return;
                        }
                        else if (parseInt(parentObj.mbs) == 0) {
                            callback('406-2');
                            return;
                        }
                        else if (parentObj.disr == true) {
                            callback('405-6');
                            return;
                        }

                        request.headers.mni = parentObj.mni;
                        request.headers.mbs = parentObj.mbs;
                        request.headers.cni = parentObj.cni;
                        request.headers.cbs = parentObj.cbs;
                        request.headers.st = parentObj.st;
                    }

                    if (parentObj.length == 0) {
                        parentObj = {};
                        parentObj.cr = '';
                        console.log('no creator');
                    }
                    else {
                        if (parentObj.ty == 2) {
                            parentObj.cr = parentObj.aei;
                        }
                    }

                    if (request.ty == 23) {
                        var access_value = '3';
                    }
                    else {
                        access_value = '1';
                    }

                    var tid = 'security.check - ' + require('shortid').generate();
                    console.time(tid);
                    security.check(request, response, parentObj.ty, parentObj.acpi, access_value, parentObj.cr, (code) => {
                        console.timeEnd(tid);
                        if (code === '1') {
                            resource.create(request, response, (code) => {
                                callback(code);
                            });
                        }
                        else if (code === '0') {
                            callback('403-3');

                        }
                        else {
                            callback(code);
                        }
                    });
                }
                else {
                    callback(code);
                }
            });
        }
        else {
            callback(code);
        }
    });
}

function lookup_retrieve(request, response, callback) {
    check_request_query_rt(request, response, (code) => {
        if (code === '200') {
            var resultObj = request.targetObject[Object.keys(request.targetObject)[0]];

            if(!resultObj.hasOwnProperty('acpi')) {
                resultObj.acpi = [];
            }

            tr.check(request, (code) => {
                if (code === '200') {
                    if (resultObj.ty == 2) {
                        resultObj.cr = resultObj.aei;
                    }
                    else if (resultObj.ty == 16) {
                        resultObj.cr = resultObj.csi;
                    }

                    if (request.query.fu == 1) {
                        security.check(request, response, resultObj.ty, resultObj.acpi, '32', resultObj.cr, (code) => {
                            if (code === '1') {
                                resource.retrieve(request, response, (code) => {
                                    callback(code);
                                });
                            }
                            else if (code === '0') {
                                callback('403-3');
                            }
                            else {
                                callback(code);
                            }
                        });
                    }
                    else {
                        security.check(request, response, resultObj.ty, resultObj.acpi, '2', resultObj.cr, (code) => {
                            if (code === '1') {
                                resource.retrieve(request, response, (code) => {
                                    callback(code);
                                });
                            }
                            else if (code === '0') {
                                callback('403-3');
                            }
                            else {
                                callback(code);
                            }
                        });
                    }
                }
                else {
                    callback(code);
                }
            });
        }
        else {
            callback(code);
        }
    });
}

function lookup_update(request, response, callback) {
    check_request_query_rt(request, response, (code) => {
        if (code === '200') {
            var resultObj = request.targetObject[Object.keys(request.targetObject)[0]];

            tr.check(request, (code) => {
                if (code === '200') {
                    if (resultObj.ty == 2) {
                        resultObj.cr = resultObj.aei;
                    }
                    else if (resultObj.ty == 16) {
                        resultObj.cr = resultObj.csi;
                    }

                    var acpi_check = 0;
                    var other_check = 0;
                    for (var rootnm in request.bodyObj) {
                        if (request.bodyObj.hasOwnProperty(rootnm)) {
                            for (var attr in request.bodyObj[rootnm]) {
                                if (request.bodyObj[rootnm].hasOwnProperty(attr)) {
                                    if (attr == 'acpi') {
                                        acpi_check++;
                                    }
                                    else {
                                        other_check++;
                                    }
                                }
                            }
                        }
                    }

                    if (other_check > 0) {
                        security.check(request, response, resultObj.ty, resultObj.acpi, '4', resultObj.cr, (code) => {
                            if (code === '1') {
                                resource.update(request, response, (code) => {
                                    callback(code)
                                });
                            }
                            else if (code === '0') {
                                callback('403-3');
                            }
                            else {
                                callback(code);
                            }
                        });
                    }
                    else {
                        resource.update(request, response, (code) => {
                            callback(code)
                        });
                    }
                }
                else {
                    callback(code);
                }
            });
        }
        else {
            callback(code);
        }
    });
}

function lookup_delete(request, response, callback) {
    check_request_query_rt(request, response, (code) => {
        if (code === '200') {
            var resultObj = request.targetObject[Object.keys(request.targetObject)[0]];

            tr.check(request, (code) => {
                if (code === '200') {
                    if (resultObj.ty == 2) {
                        resultObj.cr = resultObj.aei;
                    }
                    else if (resultObj.ty == 16) {
                        resultObj.cr = resultObj.csi;
                    }

                    security.check(request, response, resultObj.ty, resultObj.acpi, '8', resultObj.cr, (code) => {
                        if (code === '1') {
                            resource.delete(request, response, (code) => {
                                callback(code);
                            });
                        }
                        else if (code === '0') {
                            callback('403-3');
                        }
                        else {
                            callback(code);
                        }
                    });
                }
                else {
                    callback(code);
                }
            });
        }
        else {
            callback(code);
        }
    });
}


module.exports = {
    lookup_create,
    lookup_retrieve,
    lookup_update,
    lookup_delete
};
