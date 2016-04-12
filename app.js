var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

var workers = {};
var iOS_options_developer = {};
var iOS_options_production = {};
var android_setting = {};
var mysql_conn = {};
var send_schedule = {};
var send_messages = {};


// Don't use all cores in case of runaway processes
numCPUs = numCPUs / 2;



function init() {
	//
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
		// "api_token": "", // Android GCM Token 
	}
	// MySQL Setting
	mysql_conn = mysql.createConnection({ // Use for Select GCM Regid or APM Token String
	    host    : 'localhost',
	    port : 3306,
	    user : 'test',
	    password : 'test12345',
	    database:'db'
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


function manual_sync() { // Schedule Update for jobs
	// Init Schedule datas
	send_schedule = {};
	send_messages = {};

	mysql_conn.query("SELECT vp_member_sel , vp_member_data, vp_no, vp_device_type, vp_senddate, vp_message from vr_push where vp_status = 'S' and NOW() < vp_senddate order by vp_senddate DESC", function (err, result) {
		console.log(result);
		result.forEach(function(result_each){
			if (result_each.vp_senddate) {
				var date = new Date(result_each.vp_senddate);
				var vp_no = result_each.vp_no;
				
				switch(result_each.vp_member_sel) {
					case "1":
						send_messages[date] = { "message" : result_each.vp_message , "vp_no" : vp_no, "device_type" : result_each.vp_device_type};
						break;
					case "2":
						send_messages[date] = { "message" : result_each.vp_message , "vp_no" : vp_no, "device_type" : result_each.vp_device_type , "vp_member_data" : result_each.vp_member_data};
						break;
				}

				new schedule.scheduleJob(date, function(){
					console.log(send_messages[date]);
					if (result_each.vp_member_sel == "1") {
						var result = send_push(send_messages[date].device_type, date, send_messages[date].vp_no, send_messages[date].message , "");
					} else {
						var result = send_push(send_messages[date].device_type, date, send_messages[date].vp_no, send_messages[date].message, send_messages[date].vp_member_data);
					}
					if (result) {
						console.log("true");

					} else {
						console.log("False");
					}
				});
			}
		});

		console.log(send_messages);
		console.log("Send Messages of list");
		if (err) {
			return false;
		}
	});
	return true;
}

function iOS_Send(token, title, message) {
	var apnConnection = new apn.Connection(iOS_options_developer);
	var note = new apn.Notification();
	note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
	note.badge = 3;
	note.alert = title;
	note.payload = message;

	var myDeviceArray = [];
	token.forEach(function(each_token){
		var myDevice = new apn.Device(each_token);
		myDeviceArray.push(myDevice);
	});

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
			desc: description, // contain vp_no
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

function send_push(device_os, datetime, vp_no, vp_message, vp_member_data) {
	var add_query = "";
	var set_device = "";
	var success_cnt = 0;
	// request('https://api.telegram.org/bot132762052:AAHiggMnGHZcMp-fSpEv2AcBsQ2rPrMsvAM/sendMessage?chat_id=46867995&text=asdf', function (error, response, body) {
	//   if (!error && response.statusCode == 200) {
	//     console.log(body) // Show the HTML for the Google homepage. 
	//   }
	// });
	switch (device_os) {
		case "3":
			add_query = "and vm_device_os = 'ios'";
			break;
		case "2":
			add_query = "and vm_device_os = 'android'";
			break;
	}

	if (!vp_member_data == "") {
		var res_member = vp_member_data.split(",");
		var token_list_ios = [];
		var token_list_android = [];
		var desc = {"vp_no" : vp_no};
		var ItemProcessed = 0;
		console.log("res_member"); 
		console.log(res_member);
		res_member.forEach(function(each_member){
			success_cnt = success_cnt + 1;
			mysql_conn.query("SELECT vm_devicekey, vm_device_os from vr_member where vm_noti_set=true and vm_idx = '" + each_member + "' " + add_query, function(err, result){
				console.log("SELECT vm_devicekey, vm_device_os from vr_member where vm_noti_set=true and vm_idx = '" + each_member + "' " + add_query);
				console.log("DB List");
				console.log(result);
				result.forEach(function(record){
					switch (record.vm_device_os) {
						case "ios":
							token_list_ios.push(record.vm_devicekey);
							console.log("item count + 1");
							ItemProcessed = ItemProcessed + 1;
							break;
						case "android":
							token_list_android.push(record.vm_devicekey); 
							console.log("DB List");
							ItemProcessed = ItemProcessed + 1;
							break;
					}
				});
				if (res_member.length == ItemProcessed) {
					console.log("End process");
					if (token_list_ios.length > 0) {
						console.log("Query");
						console.log("ios sending");
						iOS_Send(token_list_ios, vp_message, desc);
					}
					if (token_list_android.length > 0) {
						console.log("android sending");
						Android_Send(token_list_android, vp_message , desc);
					}
				}
			});
			
		});
		

	} else {
		mysql_conn.query("SELECT vm_devicekey, vm_device_os, count(*) as count from vr_member where vm_noti_set=true " + add_query , function (err, result) {
			console.log("DB Result");
			console.log(result);
			var token_list_ios = [];
			var token_list_android = [];
			var desc = {"vp_no" : vp_no};


			result.forEach(function(record){
				switch (record.vm_device_os) {
					case "ios":
						token_list_ios.push(record.vm_devicekey); 
						success_cnt = success_cnt + 1;
						break;
					case "android":
						token_list_android.push(record.vm_devicekey);
						success_cnt = success_cnt + 1;
						break;
				}
			});

			// send push with vp_no
			if (token_list_ios) {
				console.log("ios sending 2 ");
				iOS_Send(token_list_ios, vp_message, desc);
			}
			if (token_list_android) {
				console.log("android sending 2 ");
				Android_Send(token_list_android, vp_message , desc);
			}
		});
	}

	mysql_conn.query("UPDATE vr_push set vp_status = 'E', vp_success_cnt = '" + success_cnt + "' WHERE vp_no = '" + vp_no + "'", function (err, result) {
		return true;
	});
	
}


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
	var shortid = require('shortid');
	var schedule = require('node-schedule');
	var request = require('request');
	// var j = schedule.scheduleJob(date, function(){
	// 	console.log('The world is going to end today.');
	// });
	
	// Keep Alive SQL (10 seconds loop)
	setInterval(function () {
	    mysql_conn.query('SELECT 1');
	}, 10000);

	var express = require('express');
	var app = express();

	init();

	app.get("/", function(req, res,next) {
		res.send("Android/iOS Push Module main");		
	});

	app.get("/sync", function (req,res,next){
		var result_sync = manual_sync();
		var result = {"success" : true , "message": "Sync & init completed" }
		if (result_sync) {
			res.send(result);
		} else {
			res.send("on error to sync");
		}
	});
	app.get("/gcm", function (req, res, next) { // for test..
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
		var where = {'vm_idx': vm_idx, 'vm_noti_set' : true};
		
		if (vm_idx == "30") {
			var uniqid = shortid.generate();

			mysql_conn.query("SELECT vm_devicekey,vm_device_os from vr_member where vm_noti_set=true", function (err, result) {
				if (err) {
					mysql_conn.rollback(function () {
						console.error('rollback error');
						throw err;
					});
				}
				var token_list_ios = [];
				var token_list_android = [];
				result.forEach(function(record){
					if (record.vm_device_os == "ios") {
						token_list_ios.push(record.vm_devicekey); 
					} else {
						token_list_android.push(record.vm_devicekey);
					}
				});

				if (token_list_ios) {
					desc = {"description" : desc};

					console.log("token : " + token_list_ios);
					iOS_Send(token_list_ios, title, desc);
				}
				if (token_list_android) {
					Android_Send(token_list_android, title,desc);
				}
				res.send("Send complete (all)");
			});

		} 
		
	});
}
