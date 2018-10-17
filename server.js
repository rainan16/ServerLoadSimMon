"use strict";

// process preparation
process.title = 'ServerLoadSimulatorMonitor';
process.env.webSocketsServerPort = 1337;
process.env.CLOUDAMQP_URL = 'amqp://localhost:5672';
process.env.currentCPUusage = 0;

// RabbitMQ with amqp-lib
var amqp = require('amqplib/callback_api');
process.env.consumerReturnQueue = "ConsumerReturnQueue";
process.env.rountingKeyReturnQueue = "rountingKeyReturnQueue";
process.env.servermonExchange = "ServermonExchange";

// websocket and http server
var webSocketServer = require('websocket').server;
var http = require('http');

//cpu stat
var cpuStat = require('cpu-stat');

// list of currently connected clients
var clients = [];
var clientListOfGUID = [];
var alltext = "";
var counter = 0;


/************************
 * BUNYAN LOGGER
 ***********************/
const bunyan = require('bunyan');
const logBase = bunyan.createLogger({
	name: 'nodejs',
	streams: [{
			level: 'info',
			path: 'logs/node.log'
		},
		{
			level: 'error',
			path: 'logs/node_error.log'
		},
		{
			level: 'debug',
			stream: process.stdout
		}
	]
});

function getChildLogger(componentName) {
	return logBase.child({
		// This is the specialized name of the logger. 
		// Key can be anything you like and value is the name which you use to create a specialized logger.
		// These are logged as part of the log message
		// key: value
		component: componentName
	})
}
const log = getChildLogger("NODE");
const logWS = getChildLogger("WS");
const logAMQP = getChildLogger("AMQP");
log.info("node.js server sucessfully initialized");


/************************
 * RabbitMQ
 ***********************/
var amqpConn = null;
var amqpPubChannel = null;
var offlinePubQueue = [];

function amqpConnect() {
	amqp.connect(process.env.CLOUDAMQP_URL, function (err, conn) {
		if (err) {
			logAMQP.error(err.message);
			return setTimeout(amqpConnect, 1000);
		}

		logAMQP.debug("connection established - number of channels: " + conn.connection.channels.length);

		conn.on("error", function (err) {
			if (err.message !== "Connection closing") {
				logAMQP.error("conn error " + err.message);
			}
		});

		conn.on("close", function () {
			logAMQP.error("reconnecting");
			return setTimeout(amqpConnect, 1000);
		});

		logAMQP.info("sucessfully connected to RabbitMQ");
		amqpConn = conn;
		amqpStartPublisher();
		amqpConsumerChannel();
	});
}

function amqpDisconnect() {
	setTimeout(function () {
		amqpConn.close();
		process.exit(0)
	}, 500);
}

function amqpCloseOnErr(err) {
	if (!err) return false;
	logAMQP.error("close on error: " + err);
	amqpConn.close();
	return true;
}

function amqpStartPublisher() {
	amqpConn.createConfirmChannel(function (err, ch) {
		if (amqpCloseOnErr(err)) return;
		ch.assertExchange(process.env.servermonExchange, 'direct', {
			durable: false
		});
		logAMQP.info("channel asserted to exchange " + process.env.servermonExchange);

		//see https://www.rabbitmq.com/tutorials/tutorial-three-javascript.html
		ch.on("error", function (err) {
			logAMQP.error("channel error " + err.message);
		});
		ch.on("close", function () {
			logAMQP.info("channel closed");
		});

		amqpPubChannel = ch;
		//offlinePubQueue is an internal queue for messages that could not be sent
		//when the application was offline. The application will check this queue 
		//and send the messages in the queue if a message is added to the queue
		while (true) {
			var m = offlinePubQueue.shift();
			if (!m) break;
			publish(m[0], m[1], m[2]);
		}
	});
}

function amqpPublish(exchange, routingKey, content) {
	if (amqpConn) {
		try {
			amqpPubChannel.publish(exchange, routingKey, content, {
					persistent: true
				},
				function (err, ok) {
					if (err) {
						logAMQP.error("publish error " + err);
						offlinePubQueue.push([exchange, routingKey, content]);
						amqpPubChannel.connection.close();
					}
				});
		} catch (e) {
			logAMQP.error("publish exception " + e.message);
			offlinePubQueue.push([exchange, routingKey, content]);
		}
	}
}

function amqpConsumerChannel() {
	amqpConn.createChannel(function (err, ch) {
		if (amqpCloseOnErr(err)) return;

		ch.assertExchange(process.env.ServermonExchange, 'direct', {
			durable: false
		});

		ch.on("error", function (err) {
			logAMQP.error("consumer channel error: " + err.message);
		});
		ch.on("close", function () {
			logAMQP.info("consumer channel closed");
		});
		ch.prefetch(1);
		//see https://www.rabbitmq.com/tutorials/tutorial-three-javascript.html
		ch.assertQueue(process.env.consumerReturnQueue, {
			durable: true
		}, function (err, _ok) {
			if (amqpCloseOnErr(err)) return;
			ch.bindQueue(_ok.queue, process.env.servermonExchange, process.env.rountingKeyReturnQueue);
			ch.consume(_ok.queue, processMsg, {
				noAck: false
			});
			logAMQP.info("consumer queue started: " + process.env.consumerReturnQueue);
		});

		function processMsg(msg) {
			amqpDoConsumerWork(msg, function (ok) {
				try {
					if (ok)
						ch.ack(msg);
					else
						ch.reject(msg, true);
				} catch (e) {
					amqpCloseOnErr(e);
				}
			});
		}
	});
}

function amqpDoConsumerWork(msg, cb) {
	logAMQP.debug("consumer got message: " + msg.content.toString());

	try {
		var clientData = JSON.parse(msg.content.toString());
		clientData.nodejsTimeEnd = new Date();
		clientData.finish = false;
		if (Number(clientData.numberProcDB) > 0) {
			clientData.duration = new Date() - new Date(clientData.nodejsTimeStart);
		}
		var sendIndex = clientListOfGUID.indexOf(clientData.fromGUID);
		if (sendIndex >= 0) {
			logWS.info("Send JSON from consumer" + clientData.type + "to client");
			logWS.debug(JSON.stringify(clientData));
			clients[sendIndex].sendUTF(JSON.stringify(clientData));
			cb(true);
		} else {
			logAMQP.error('error: consumer did not find client socket for GUID ' + clientData.fromGUID);
			cb(true);
			logAMQP.error('discarded queue "' + process.env.consumerReturnQueue + '" message for GUID ' + clientData.fromGUID);
		}
	} catch (e) {
		log.error("error consumer: " + e);
		cb(true);
	}	
}
log.info("starting connection to RabbitMQ");
amqpConnect();


/************************
 * HTTP server
 ***********************/
var server = http.createServer(function (request, response) {
	log.info('request: ' + request.method + ' | response: ' + response.url);
});
server.listen(process.env.webSocketsServerPort, function () {
	log.info("node.js server listening on port: " + process.env.webSocketsServerPort);
});


/************************
 * WebSocket server
 ***********************/
var wsServer = new webSocketServer({
	httpServer: server
});

wsServer.on('connect', function (ws) {
	logWS.info('connection established from ' + ws.remoteAddress);
	setCPUusage()
});

function setCPUusage() {
	cpuStat.usagePercent({
		sampleMs: 100
	}, function (err, percent, seconds) {
		if (err) {
			return console.log(err);
		}
		process.env.currentCPUusage = percent;
	});
}
// This callback function is called every time someone tries to connect to the WebSocket server
wsServer.on('request', function (request) {
	logWS.info('request from origin ' + request.origin);

	// accept connection - check 'request.origin' to make sure that client is connecting from original website (http://en.wikipedia.org/wiki/Same_origin_policy)
	var connection = request.accept(null, request.origin);

	// we need to know client index to remove them on 'close' event
	var index = clients.push(connection) - 1;
	logWS.info('connection accepted (#' + index + ')');

	// user sent message
	connection.on('message', function (message) {
		var startupTime = new Date();		
		logWS.info('incoming message');
		setCPUusage();
		if (message.type === 'utf8') {
			logWS.debug('received message raw data: ' + message.utf8Data);

			counter++;
			var clientData = {};
			clientData = JSON.parse(message.utf8Data);
			if (clientListOfGUID.indexOf(clientData.fromGUID) === -1) {
				clientListOfGUID.splice(index, 0, clientData.fromGUID);
			}
			logWS.debug('message from clientGUID: ' + clientListOfGUID[index]);
			clientData.counter = counter;
			clientData.fromGUID = clientListOfGUID[index];
			clientData.nodejsTimeStart = startupTime;

			var routingKEY = "";
			var numberProc = 0;
			for (var i = 1; i <= 3; i++) {
				routingKEY = "";
				numberProc = 0;
				if (i == 1 && clientData.type.indexOf("#RAM#") > -1) {
					routingKEY = "routingKeyRAM";
					numberProc = clientData.numberProcRAM;
				} else if (i == 2 && clientData.type.indexOf("#CPU#") > -1) {
					routingKEY = "routingKeyCPU";
					numberProc = clientData.numberProcCPU;
				} else if (i == 3 && clientData.type.indexOf("#DB#") > -1) {
					routingKEY = "routingKeyDB";
					numberProc = clientData.numberProcDB;
				}
				//TODO parse number of processes and fire amqpPublish() x-times (e.g. #RAM,3#)
				if (routingKEY !== "") {
					logWS.debug("publish to RabbitMQ, routing key: " + routingKEY);
					for (var j = 1; j <= numberProc; j++) {
						setCPUusage();
						clientData.nodejsRAMused = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
						clientData.nodejsCPUusage = process.env.currentCPUusage;
						amqpPublish(process.env.servermonExchange, routingKEY, new Buffer(JSON.stringify(clientData)));
					}
				}
			}			
		}
	});

	// user disconnected
	connection.on('close', function (connection) {
		logWS.info("client disconnected with " + connection);
		// remove user from the list of connected clients
		clients.splice(index, 1);
		clientListOfGUID.splice(index, 1);
	});
});