var apn = require('apn');
var gcm = require("node-gcm");
var mysql = require('mysql');
var iOS_options_developer = {};
var iOS_options_production = {};
var android_setting = {};
var mysql_conn = {};


var express = require('express');
var app = express();

init();

function init() {
	console.log("Init Started.");
	// Init process for Web Server
	
	//iOS init Data	
	iOS_options_developer = {
		gateway : "gateway.sandbox.push.apple.com",  // Production : gateway.sandbox.push.apple.com
	    cert: './keys2/cert_production.pem', // should Use vaild certificate
	    key: './keys2/key_production.pem', // also should use valid cert
	    production: false
	};
	//Android init Data
	android_setting = {
		"api_token": "API_Token", // Android GCM Token 
	}

	mysql_conn = mysql.createConnection({ // Use for Select GCM Regid or APM Token String
	    host    : 'localhost',
	    port : 3306,
	    user : 'terry',
	    password : 'asdf1234',
	    database:'terry'
	});

	// mysql_conn.connect(function(err) {
	//     if (err) {
	//         console.error('mysql connection error');
	//         console.error(err);
	//         throw err;
	//     }
	// });


	//HTTP Server for node
	var server = app.listen(50254, function () {
		var host = server.address().address
		var port = server.address().port
		console.log("push app listening at http://%s:%s", host, port)
	});
}

function iOS_Send(token, title, message) {
	var apnConnection = new apn.Connection(iOS_options_developer);
	var note = new apn.Notification();
	note.badge = 3;
	note.alert = title;
	note.payload = {'message': message};

	
	var myDeviceArray = []

	for (var i=0; i<token.length; i++) {
	     //var tokens = results[i]; //'앞에서 Xcode로 build 하면서 획득한 아이폰 디바이스 토큰을 입력한다.'
	     var myDevice = new apn.Device(token[i]);
	     myDeviceArray.push(myDevice);
	}
	try {
	     apnConnection.pushNotification(note, myDeviceArray);
	} catch (e) {
	     console.log("apn exception : " + e);
	}
}

function Android_Send(Tokens, title, description) { 
	var message = new gcm.Message({
		collapseKey: 'demo',
		delayWhileIdle: true,
		timeToLive: 3,
		data: {
			lecture_id:"notice",
			title:title,
			desc: description,
			param1: '첫번째파람',
			param2: '두번째파람'
		}
	});

	var server_access_key = android_setting.api_token;
	var sender = new gcm.Sender(server_access_key);
	var registrationIds = [ ];
	registrationIds = Tokens;

	sender.send(message, registrationIds, 4, function (err, result) {
		console.log(err); // Show result 
		console.log(server_access_key);
	});
}


app.get("/", function(req, res,next) {
	res.send("Hello world");		
});

app.get("/gcm", function (req, res, next) {
	var token = req.query.s_device_token;
	var title = req.query.s_title;
	var desc = req.query.s_desc;

	Android_Send(token, title, desc);

	res.send("Response Ok");
});

app.get("/apns", function(req,res) {
	var token = [req.query.s_apns];
	var title = req.query.s_title;
	var desc = req.query.s_desc;

	iOS_Send(token, title, desc);

	res.send("Response Ok");
});

