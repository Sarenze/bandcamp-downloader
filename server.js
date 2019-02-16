let express = require('express');
let request = require('request');
let cheerio = require('cheerio');
let app		= express();

let cors_proxy = require('cors-anywhere').createServer()

app.use(express.static('bower_components'));
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

app.get('/start/', function(req, res) {
	let url = req.query.url;

	makeRequest(url, function(html) {
		const $ = cheerio.load(html);

		let albumData = parseAlbumData($);

		let metaData = getMetadata($);

		let fileList = getFileList(albumData, metaData);

		res.send(fileList);
	});
	
});

app.get('/get', (req, res) => {
	let url = req.query.url;

	makeRequest(url, (html) => {
		res.send({
			'src': html
		});
	});
});

app.get('/isup', (req, res) => {
	res.send("OK");
});

app.get('/proxy/:proxyUrl*', (req, res) => {
	req.url = req.url.replace('/proxy/', '/')
	cors_proxy.emit('request', req, res)
})

let server = app.listen(process.env.PORT || 5000, () => {
	let host = server.address().address
	let port = server.address().port

	console.log('Server is listening on port %d in %s mode', port, app.settings.env);
})

exports = module.exports = app;








function makeRequest(url, callback) {
	request(url, function(error, response, html) {
		if (!error) {
			callback(html);
		} else {
			new Error('Failed to load page, status code: ' + response.statusCode);
		}
	});
} 

function parseAlbumData($) {
	return $('script:contains("TralbumData")').html();
}

function getFileList(albumData, metaData) {
	let list = {
		artist: metaData.artist,
		album: metaData.album,
		image: '/proxy/' + metaData.image,
		tracks: []
	};
	let tmpArr = albumData.match(/(\[{)(.)+(}\])/g)[0];
	let tmpList = JSON.parse(tmpArr);

    for (let i = 0; i < tmpList.length; i++) {
        if (tmpList.length > 0) {
            if (tmpList[i].track_num < 10) {
            	tmpList[i].track_num = tmpList[i].track_num;
            }
            
            let data = {
                'title': tmpList[i].title,
                'artist': metaData.artist,
            	'album': metaData.album,
            	'year': metaData.year,
            	// 'image': 'http://jamador-cors-anywhere.herokuapp.com/' + metaData.image,
            	'track': tmpList[i].track_num,
                'file': '/proxy/' + tmpList[i].file['mp3-128'],
                'filename': tmpList[i].track_num + ' - ' + tmpList[i].title
            };

            list.tracks.push(data);
        }
    }
    return list;
}

function getMetadata($) {
	let artist 	= $("span[itemprop='byArtist']").text().trim() || '';
	let album 	= $(".trackTitle[itemProp='name']").text().trim() || '';
	let year 	= $("meta[itemprop='datePublished']").attr('content').substr(0,4) || '';
	let image 	= $('#tralbumArt > a > img').attr('src') || '';

	return {
		artist: artist,
		album: album,
		year: year,
		image: image
	};
}
