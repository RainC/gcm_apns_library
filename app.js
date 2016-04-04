var apn = require('apn');
var gcm = require("node-gcm");
var iOS_options_developer = {};
var iOS_options_production = {};
var android_setting = {};


var express = require('express');
var app = express();

init();


function iOS_Send(token, message) {
	var myDeviceArray = token
	for (var i=0; i<results.length; i++) {
	     var token = results[i]._id;//'앞에서 Xcode로 build 하면서 획득한 아이폰 디바이스 토큰을 입력한다.'
	     var myDevice = new apn.Device(token);
	     myDeviceArray.push(myDevice);
	}
	try {
	     apnConnection.pushNotification(note, myDeviceArray);
	} catch (e) {
	     console.log("apn exception : " + e);
	}
}

function Android_Send(Tokens) { 
	var message = new gcm.Message({
		collapseKey: 'demo',
		delayWhileIdle: true,
		timeToLive: 3,
		data: {
			lecture_id:"notice",
			title:"제목입니다",
			desc: "설명입니다",
			param1: '첫번째파람',
			param2: '두번째파람'
		}
	});

	var server_access_key = android_setting.api_token;
	var sender = new gcm.Sender(server_access_key);
	var registrationIds = [ ];
	registrationIds = Tokens;
	// 푸시를 날린다!
	sender.send(message, registrationIds, 4, function (err, result) {
		console.log(err); // Show result 
	});
}

function init() {
	// Init process for Web Server
	
	//iOS init Data	
	iOS_options_developer = {
		gateway : "gateway.sandbox.push.apple.com",  // Production : gateway.sandbox.push.apple.com
	    cert: './keys2/cert_production.pem',
	    key: './keys2/key_production.pem',
	    production: false
	};
	//Android init Data
	android_setting = {
		"api_token": "API_Token",
	}

	var server = app.listen(50254, function () {
		var host = server.address().address
		var port = server.address().port
		console.log("push app listening at http://%s:%s", host, port)
	});
	app.get("/", function(req, res,next) {
		res.send("Hello world");		
	});
	app.get("/gcm", function (req, res, next) {
		Android_Send("sdf");
		res.send("Response Ok");
	});

}
