// Bulk Close All The Intermittents!

const toClose = "https://bugzilla.mozilla.org/rest/bug?include_fields=id&email1=intermittent-bug-filer%40mozilla.bugs&emailreporter1=1&emailtype1=exact&f1=longdescs.count&f2=blocked&f3=flagtypes.name&keywords=leave-open&keywords_type=nowords&limit=0&n1=1&o1=changedafter&o2=isempty&o3=notequals&resolution=---&status_whiteboard=%28leave%20open%7Cleave-open%7Cleaveopen%7Ctest%20disabled%7Ctest-disabled%7Ctestdisabled%29&status_whiteboard_type=notregexp&tweak=1&v1=-3w&v3=needinfo%3F"

const putURL = "https://bugzilla.mozilla.org/rest/bug";

const fetch = require('make-fetch-happen').defaults({
    cacheManager: './bmo-cache'
});

var bugs;

/*
 *  Load ini file
 */

var fs = require('fs')
  , ini = require('ini')
  , apiKey;

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
        console.log('will close', count, 'bugs in', Math.ceil(count/10), 'batches of 10.');  
        closeBugList(body.bugs);
    });
}

/*
 *  Close batches of bugs
 */
function closeBugList(bugs) {
    var i = 0
  , slices = Math.ceil(bugs.length/10)
  , slice, ids;

    for(i; i < 1; i++) {
        slice = bugs.slice((i*10), (i+1)*10);
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
                    }
                })
            }
        ).then(res => { 
            return res.json();
        }).then(json => {
            console.log('updated', json.bugs.length, 'bugs');
        });   
    }
}
