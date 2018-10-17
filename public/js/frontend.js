"use strict";
var wClientGUID = uuidv4();
var wCounter = 0;

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

function initClientData() {
    var client = $('#clientGUID');
    client.text("Client GUID  " + window.wClientGUID);
    $("#checkRAM").prop('checked', false);
    $("#checkCPU").prop('checked', false);
    $("#checkDB").prop('checked', false);
}


function startSim() {
    // for better performance - to avoid searching in DOM
    var content = $('#resultContent');
    var status = $('#status');

    // my name sent to the server
    var myName = false;

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    status.text("Connecting ...");
    status.show();
    $('#statusLabel').show();
    status.removeClass("label label-success");
    status.addClass("secondary label");
    $("#btnsim").prop('disabled', true);
    $("#btnsim").text("Simulating ...");

    // open connection
    var connection = new WebSocket('ws://127.0.0.1:1337');

    connection.onopen = function () {
        status.text("Connection established, waiting for results.");

        var simType = "#";
        var numberProcRAM = 0;
        var numberProcCPU = 0;
        var numberProcDB = 0;
        window.wCounter = 0;

        if ($("#checkRAM").prop('checked')) {
            simType = simType + "RAM#";
            numberProcRAM = $("#numRAM").val();
            window.wCounter = parseInt(window.wCounter) + parseInt(numberProcRAM);
        }
        if ($("#checkCPU").prop('checked')) {
            simType = simType + "CPU#";
            numberProcCPU = $("#numCPU").val();
            window.wCounter = parseInt(window.wCounter) + parseInt(numberProcCPU);
        }
        if ($("#checkDB").prop('checked')) {
            simType = simType + "DB#";
            numberProcDB = $("#numDB").val();
            window.wCounter = parseInt(window.wCounter) + parseInt(numberProcDB);
        }

        connection.send(JSON.stringify({
            fromGUID: window.wClientGUID,
            type: simType,
            clientTime: new Date(),
            numberProcRAM: numberProcRAM,
            numberProcCPU: numberProcCPU,
            numberProcDB: numberProcDB
        }));
    };

    connection.onerror = function (error) {
        status.text("connection error " + error.code);
    };

    connection.onclose = function (event) {
        var reason = "";
        if (event.code == 1000)
            reason = "Finished.";
        else if (event.code == 1001)
            reason = "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.";
        else if (event.code == 1002)
            reason = "An endpoint is terminating the connection due to a protocol error";
        else if (event.code == 1003)
            reason = "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
        else if (event.code == 1004)
            reason = "Reserved. The specific meaning might be defined in the future.";
        else if (event.code == 1005)
            reason = "No status code was actually present.";
        else if (event.code == 1006)
            reason = "The connection failed or was closed abnormally.";
        else if (event.code == 1007)
            reason = "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).";
        else if (event.code == 1008)
            reason = "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.";
        else if (event.code == 1009)
            reason = "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
        else if (event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
            reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + event.reason;
        else if (event.code == 1011)
            reason = "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
        else if (event.code == 1015)
            reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
        else
            reason = "Unknown reason";

        if (event.code != 1000) {
            status.removeClass("secondary label");
            status.addClass("label label-error");
        }
        else {
            status.removeClass("label label-error");
            status.removeClass("secondary label");
            status.addClass("label label-success");
        }

        status.text(reason);
        $("#statusLabel").hide();
        $("#btnsim").prop('disabled', false);
        $("#btnsim").text("Start simulation");
    };

    // handle incoming messages
    connection.onmessage = function (message) {
        window.wCounter = window.wCounter - 1;

        console.log(message);
        var data = JSON.parse(message.data);
        content.html("DEBUG Info<br>Run #" + data.counter + ", wait for " +  window.wCounter + " processes, last start: " + data.nodejsTimeStart + ", end: " + data.nodejsTimeEnd + ", nodeRAM: " + data.nodejsRAMused + "MB, consumerRAM: " + data.consumerRAMused + "MB, databaseTime: " + data.duration + "ms, consumerCPU: " + data.consumerCPUused + "%");
        if ($("#checkCPU").prop('checked')) {
            if (data.consumerCPUused !== undefined) {
                $("#resultBarCPU-item").attr("data-tooltip", "CPU = " + data.consumerCPUused + " %");
                $("#resultBarCPU-item").text("CPU = " + data.consumerCPUused + " %");
                $("#resultBarCPU-item").width(data.consumerCPUused + "%")
                $("#resultBarCPU").show("fast");
            }
        }
        else {
            $("#resultBarCPU").hide("fast");
        }

        if ($("#checkRAM").prop('checked')) {
            if (data.consumerRAMused !== undefined) {
                $("#resultBarRAM-item").attr("data-tooltip", "RAM consumer = " + data.consumerRAMused + " MB");
                $("#resultBarRAM-item").text("RAM consumer = " + data.consumerRAMused + " MB");
                $("#resultBarRAM-item").width(data.consumerRAMused + "%")
                $("#resultBarRAMnodeJS-item").attr("data-tooltip", "Node.js = " + data.nodejsRAMused + " MB");
                $("#resultBarRAMnodeJS-item").text("Node.js = " + data.nodejsRAMused + " MB");
                $("#resultBarRAMnodeJS-item").width(data.nodejsRAMused + "%")
                $("#resultBarRAM").show("fast");
            }
        }
        else {
            $("#resultBarRAM").hide("fast");
        }

        if ($("#checkDB").prop('checked')) {
            if (data.duration !== undefined) {
                $("#resultBarDB-item").attr("data-tooltip", "Timespan = " + data.duration + " ms");
                $("#resultBarDB-item").text("Time = " + data.duration + " ms");
                $("#resultBarDB-item").width(data.duration / $("#numDB").val() / 10 + "%")
                $("#resultBarDB").show("fast");
            }
        }
        else {
            $("#resultBarDB").hide("fast");
        }
        
        if (window.wCounter <= 0) {
            connection.close();
        }
        setTimeout(function timeout() {
            console.log("ws timeout");
        }, 300);
    };
}

function toggleCheckboxDB(element) {
    if ($("#checkDB").prop('checked')) {
        $("#numDB").removeClass('disabled');
    }
    else {
        $("#numDB").addClass('disabled');
    }
}

function toggleCheckboxRAM(element) {
    if ($("#checkRAM").prop('checked')) {
        $("#numRAM").removeClass('disabled');
    }
    else {
        $("#numRAM").addClass('disabled');
    }    
}

function toggleCheckboxCPU(element) {
    if ($("#checkCPU").prop('checked')) {
        $("#numCPU").removeClass('disabled');
    }
    else {
        $("#numCPU").addClass('disabled');
    }      
}