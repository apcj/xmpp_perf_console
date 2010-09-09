var BOSH_SERVICE = 'http://localhost/http-bind/';
var connection = null;

var latencies = new TimeSeries();   
var throughput = new TimeSeries();   
var cpuLoad = new TimeSeries();

var throughputAgentOne = new TimeSeries();   
var latencyAgentOne = new TimeSeries();

                           
function createChart(timeseries, chartReference) {
  	var chart = new SmoothieChart();
	chart.addTimeSeries(timeseries, { strokeStyle: 'rgba(0, 255, 0, 1)', fillStyle: 'rgba(0, 255, 0, 0.2)', lineWidth: 4 });
	chart.streamTo(chartReference, 500);  
	return chart;
}

function createTimeline() {
	var throughputChart = createChart(throughput, document.getElementById("throughputChart"));
	var latencyChart = createChart(latencies, document.getElementById("latencyChart"));
	var cpuLoadChart = createChart(cpuLoad, document.getElementById("cpuLoadChart"));	
	var throughputAgentOneChart = createChart(throughputAgentOne, document.getElementById("throughputAgentOneChart"));	
	var latencyAgentOneChart = createChart(latencyAgentOne, document.getElementById("latencyAgentOneChart"));
}

function log(msg) 
{
    $('#log').append('<div></div>').append(document.createTextNode(msg));
}

function onConnect(status)
{
    if (status == Strophe.Status.CONNECTING) {
	log('Strophe is connecting.');
    } else if (status == Strophe.Status.CONNFAIL) {
	log('Strophe failed to connect.');
	$('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.DISCONNECTING) {
	log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
	log('Strophe is disconnected.');
	$('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.CONNECTED) {
	log('Strophe is connected.');
	log('ECHOBOT: Send a message to ' + connection.jid + 
	    ' to talk to me.');

	// connection.addHandler(onMessage, null, 'message', null, null,  null); 
	connection.send($pres().tree());                
	connection.muc.join($('#chatroomid').get(0).value, "console", onMessage, onMessage, "console");
    }
}

var latestMeasurements = {};

function onMessage(msg) {
    var to = msg.getAttribute('to');
    var from = msg.getAttribute('from');
    var type = msg.getAttribute('type');
    var elems = msg.getElementsByTagName('body');
	var tagname = msg.tagName;

    if ((type == "chat" || type == "groupchat") && elems.length > 0) {
		var body = elems[0];
		var bodyText = Strophe.getText(body);
		
		if (bodyText.indexOf('{') === 0) {
			var measurement = JSON.parse(bodyText);

			var currentTime = new Date().getTime();
			
			if (measurement.cpuUsage) {
				updateChart(cpuLoad, currentTime, measurement.cpuUsage, $("#cpuLoadPercent"), '%')
			}          
			if (measurement.throughput) {                                                  
				updateChart(throughput, currentTime, measurement.throughput, $("#throughputNumber"), ' / sec')
				throughputAgentOne.append(currentTime, measurement.throughput);
			}
			if (measurement.latency) {                                                  
				updateChart(latencies, currentTime, measurement.latency, $("#latencyNumber"), ' ms')				
				latencyAgentOne.append(currentTime, measurement.latency);
			}
			// latestMeasurements[from] = { throughput: throughput, latency: latency };
			// recaluateAggregates();
		}
	}
	else {
		log('ECHOBOT: I got a message that I did not understand from ' + from + ': ' + 
		    Strophe.getText(body));
	}	
    
	// we must return true to keep the handler alive.  
    // returning false would remove it after it finishes.
    return true;
} 

// var recaluateAggregates = function() {
// 	var totalThroughput = 0
// 	for (from in latestMeasurements) {
// 		
// 	}
// }
function updateChart(series, time, updateToMake, element, message) {
	 series.append(time, updateToMake);			
	 element.html(updateToMake + message);
}
    
function onDisconnect(msg) {
	connection.disconnect();
	return true;
}             


$(document).ready(function () {
    connection = new Strophe.Connection(BOSH_SERVICE);

    // Uncomment the following lines to spy on the wire traffic.
    //connection.rawInput = function (data) { log('RECV: ' + data); };
    //connection.rawOutput = function (data) { log('SEND: ' + data); };

    // Uncomment the following line to see all the debug output.
    // Strophe.log = function (level, msg) { log('LOG: ' + msg); };


    $('#connect').bind('click', function () {
	var button = $('#connect').get(0);
	if (button.value == 'connect') {
	    button.value = 'disconnect';

	    connection.connect($('#jid').get(0).value,
			       $('#pass').get(0).value,
			       onConnect);
	} else {
	    button.value = 'connect';  
		connection.muc.leave("performance@chatrooms.jalewis.thoughtworks.com", "console", onDisconnect);
	}
    });
});
