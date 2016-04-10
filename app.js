var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var workers = {};

// Don't use all cores in case of runaway processes
numCPUs = numCPUs / 2;

if (cluster.isMaster) {
   for (var i = 0; i < numCPUs; i++) {
      cluster.fork();
   }

   cluster.on('exit', function(worker, code, signal) {
      console.log('Worker ' + worker.process.pid + ' died.');
   });
} else {
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
		    cert: './keys/cert.pem', // should Use vaild certificate
		    key: './keys/key.unencrypted.pem', // also should use valid cert
		    production: false
		};
		//Android init Data
		android_setting = {
			"api_token": "API_Token", // Android GCM Token 
		}

		mysql_conn = mysql.createConnection({ // Use for Select GCM Regid or APM Token String
		    host    : '',
		    port : 3306,
		    user : '',
		    password : '',
		    database:'avvrDB'
		});

		mysql_conn.connect(function(err) {
		    if (err) {
		        console.error('mysql connection error');
		        console.error(err);
		        throw err;
		    }
		});


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
		note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
		note.badge = 3;
		note.alert = title;
		note.payload = message;


		
		var myDeviceArray = []

		for (var i=0; i<token.length; i++) {
		     //var tokens = results[i]; //'앞에서 Xcode로 build 하면서 획득한 아이폰 디바이스 토큰을 입력한다.'
		     var myDevice = new apn.Device(token[i]);
		     myDeviceArray.push(myDevice);
		}
		console.log(token);
		try {
		     var result = apnConnection.pushNotification(note, myDeviceArray);
		     console.log(note,myDeviceArray);
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
	function mysql_rollback() {
		mysql_conn.rollback(function () {
			console.error('rollback error');
			throw err;
		});
	}


	app.get("/", function(req, res,next) {
		res.send("Android/iOS Push Module main");		
	});

	app.get("/gcm", function (req, res, next) {
		var token = req.query.s_device_token;
		var title = req.query.s_title;
		var desc = req.query.s_desc;

		Android_Send(token, title, desc);

		res.send("Response Ok");
	});

	app.get("/push", function(req,res) {
		var token = [];
		var title = req.query.s_title;
		var desc = req.query.s_desc;
		var vm_idx = req.query.vm_idx;
		var where = {'vm_idx': vm_idx};
		
		if (vm_idx == "*") {
			mysql_conn.query("SELECT vm_devicekey,vm_device_os from vr_member", function (err, result) {
				if (err) {
					mysql_rollback();
				}
				var token_list_ios = [];
				var token_list_android = [];
				for (var i=0; i<result.length; i++)  {
					if (result[i].vm_device_os == "ios") {
						token_list_ios.push(result[i].vm_devicekey);
					} else {
						token_list_android.push(result[i].vm_devicekey);
					}
				}
				if (token_list_ios) {
					desc = {"description" : desc};
					iOS_Send(token_list_ios, title, desc);
				}
				if (token_list_android) {
					Android_Send(token_list_android, title,desc);
				}
				res.send("Send complete (all)");
			});
		} else {
			mysql_conn.query("SELECT vm_devicekey from vr_member where ?", where, function(err,result){
				if (err) {
					mysql_rollback();
				}
				mysql_conn.commit(function (err) {
				    if (err) {
				        mysql_rollback();
				    }
				});
				if (result && title && desc) {
					token = [result[0].vm_devicekey];
					desc = {"description" : desc};
					iOS_Send(token, title, desc);
					res.send("Send complete");
				}
			});
		}
		
	});
}
