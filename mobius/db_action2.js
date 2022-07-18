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

// https://nodeman.tistory.com/9

const mysql = require('mysql2');


function createPoolOption(host, port, user, password, database='mobiusdb') {
    let options = {
        host: host,
        port: port,
        user: user,
        password: password,
        database: database,
        connectionLimit: 100,
        waitForConnections: true,
        queueLimit: 0,
        debug: false,
    };

    return options;
}

const options = createPoolOption('127.0.0.1', 3306, 'root','admin' );
const pool = mysql.createPool(options);

const promisePool = pool.promise();

async function findById(id) {
    try {
        const result = await promisePool.query('SELECT * FROM lookup;', [id]);
        return result;
    } catch (err) {
        return err;
    }
}

result = findById('1');
console.log(result);



//
// const connection = mysql.createConnection({
//     host: '127.0.01',
//     port: 3306,
//     user: 'root',
//     password: 'admin',
//     database: 'mobiusdb'
// });
// connection.query(
//     'SELECT * FROM lookup', [],
//     function(err, results, fields){
//         console.log(results); // results는 서버로부터 반환된 행들을 포함한다.
//         console.log(fields); // fields는 results에 관한 부가적인 메타데이터들을 포함한다.
//     }
// );
//
