const bodyParser = require("body-parser");
const moment = require("moment/moment");
const util = require("util");
const cluster = require("cluster");


const onem2mParser = bodyParser.text(
    {
        limit: '5mb',
        type: 'application/onem2m-resource+xml;application/xml;application/json;application/vnd.onem2m-res+xml;application/vnd.onem2m-res+json'
    }
);
console.log( onem2mParser );


let until = moment().utc().subtract(0, 'year').format('YYYYMMDD');
console.log(until);

let et = moment().utc().format('YYYYMMDDTHHmmss');
console.log(et);

var sql = util.format("select ri from lookup where et < \'%s\' and ty <> \'2\' and ty <> \'3\' and ty <> \'5\'", et);
console.log(sql);

const result = new Date().toLocaleDateString('sv').replaceAll('-', '');
console.log(result); // 👉️ "20220119" (today is Jan 19th, 2022)

cluster.on('death', (worker) => {
    console.log('worker' + worker.pid + ' died --> start again');
    cluster.fork();
});

let ty_arr = 'Type: application/   vnd.onem2m res+xml; ty=2';
console.log(ty_arr.replace(/ /g, '').split('='));


// const schedule = require('node-schedule');
//
// const job = schedule.scheduleJob('5 * * * *', function(){
//     console.log('The answer to life, the universe, and everything!');
// });
//
