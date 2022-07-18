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
 * @file
 * @copyright KETI Korea 2018, KETI
 * @author Il Yeup Ahn [iyahn@keti.re.kr]
 */

const mysql = require('mysql');
const db_sql = require("./sql_action");
const moment = require("moment/moment");
var mysql_pool = null;


function executeQuery(pool, query, connection, callback) {
    connection.query({sql:query, timeout:60000}, function (err, rows, fields) {
        if (err) {
            return callback(err, null);
        }
        return callback(null, rows);
    });
}


createPool = function(host, port, user, password) {
    mysql_pool = mysql.createPool({
        host: host,
        port: port,
        user: user,
        password: password,
        database: 'mobiusdb',
        connectionLimit: 100,
        waitForConnections: true,
        debug: false,
        acquireTimeout: 50000,
        queueLimit: 0
    });
    if (mysql_pool) return '1';
}

connect = function (host, port, user, password, callback) {
    mysql_pool = mysql.createPool({
        host: host,
        port: port,
        user: user,
        password: password,
        database: 'mobiusdb',
        connectionLimit: 100,
        waitForConnections: true,
        debug: false,
        acquireTimeout: 50000,
        queueLimit: 0
    });

    if (mysql_pool) callback('1');
};

getConnection = function(callback) {
    if(mysql_pool) {
        mysql_pool.getConnection((err, connection) => {
            if (err) {
                callback('500-5');
            } else {
                callback('200', connection);
            }
        });
    }
    else {
        callback('500-5');
    }
};

getResult = function(query, connection, callback) {
    if(mysql_pool == null) {
        console.error("mysql is not connected");
        return '0';
    }

    executeQuery(mysql_pool, query, connection, (err, rows) => {
        if (!err) {
            callback(null, rows);
        }
        else {
            callback(true, err);
        }
    });
};


del_req_resource = function (connection) {
    getConnection((connection) => {
        db_sql.delete_req(connection, (err, delete_Obj) => {
            if (!err) {
                console.log('deleted ' + delete_Obj.affectedRows + ' request resource(s).');
            }
        });
    });
}

del_expired_resource =  function (connection) {
    getConnection((connection) => {
        // this routine is that delete resource expired time exceed et of resource
        var et = moment().utc().format('YYYYMMDDTHHmmss');
        db_sql.delete_lookup_et(connection, et, (err) => {
            if (!err) {
                console.log('---------------');
                console.log('delete resources expired et');
                console.log('---------------');
            }
        });
    });
}


//////////////////////////////////////////////////////////
// module exports

module.exports = {
    createPool,
    connect,
    getConnection,
    getResult,
    del_req_resource,
    del_expired_resource
};
