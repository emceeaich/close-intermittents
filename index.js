// Bulk Close All The Intermittents!

const toClose = "https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status&email1=intermittent-bug-filer%40mozilla.bugs&emailreporter1=1&emailtype1=exact&f1=longdescs.count&f2=blocked&f3=flagtypes.name&f4=OP&f5=bug_status&f6=bug_status&keywords=leave-open&keywords_type=nowords&n1=1&n4=1&o1=changedafter&o2=isempty&o3=notequals&o5=changedto&o6=changedafter&resolution=---&status_whiteboard=%28leave%20open%7Cleave-open%7Cleaveopen%7Ctest%20disabled%7Ctest-disabled%7Ctestdisabled%29&status_whiteboard_type=notregexp&v1=-3w&v3=needinfo%3F&v5=REOPENED&v6=-7d";
const putURL = "https://bugzilla.mozilla.org/rest/bug";
const fetch = require('make-fetch-happen').defaults({
    cacheManager: './bmo-cache'
});
const sliceSize = 20;

var fs = require('fs')
, ini = require('ini')
, apiKey;

main();

function main() {
    readConfiguration();
}

/*
*  Load ini file
*/
function readConfiguration() {
    fs.readFile('./config.ini', {encoding: 'utf-8'}, (err, data) => {
        if (err) {
            console.error('unable to read ./config.ini', err.code);
            return;
        }
        
        config = ini.parse(data);
        if (config.api_key) {
            apiKey = config.api_key;
        } else {
            console.error('no bugzilla api key specified, aborting');
            return;
        }
        
        getBugList();
    });
}

/*
*  Get list of bugs
*/
function getBugList() {
    var count;
    console.log('fetching bugs to close');
    
    fetch(toClose).then(res => {
        return res.json()
    }).then(body => {
        count = body.bugs.length;
        console.log('will close', count, 'bugs in', Math.ceil(count/sliceSize), 'batches of', sliceSize);  
        closeBugList(body.bugs);
    });
}

/*
*  Close batches of bugs
*/
function closeBugList(bugs) {
    var slices = Math.ceil(bugs.length/sliceSize), 
    slice, ids, i = 0;

    for(i; i < slices; i++) {
        slice = bugs.slice((i*sliceSize), (i+1)*sliceSize);
        ids = slice.map(bug => { return bug.id });
        console.log('closing', ids.join(', '));
        fetch([putURL, '/', ids[0]].join(''), // have to specify a bug id for the endpoint 
        {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'X-BUGZILLA-API-KEY': apiKey
            },
            body: JSON.stringify({
                ids: ids,
                status: 'RESOLVED',
                resolution: 'INCOMPLETE',
                keywords: {
                    add: ['bulk-close-intermittents']
                },
                comment: {
                    body: "See https://wiki.mozilla.org/Bugmasters/Projects/Bug_Handling/Bug_Husbandry#Intermittent_Test_Failure_Cleanup"
                }
            })
        })
        .then(res => {
            return res.json();
        })
        .then(json => {
            if (json.bugs) {
                console.log('updated', json.bugs.length, 'bugs');
            }
            else {
                console.log('error', json);
            }
        })
    }
}
