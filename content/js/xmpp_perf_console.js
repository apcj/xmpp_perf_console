var BOSH_SERVICE = 'http://localhost/http-bind/';
var connection = null;

var latencies = new TimeSeries();   
var throughput = new TimeSeries();   
var cpuLoad = new TimeSeries();
                           
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
} 

var addAgentCharts = function(agentJid, throughputTimeseries, latencyTimeseries) {                                                    
	var agentDiv = $('.prototype').clone();
	$('#right-column').append(agentDiv);
	agentDiv.removeClass('prototype');
	agentDiv.attr('id', agentJid);
	agentDiv.find('.agentJid').html(agentJid);
		
	createChart(throughputTimeseries, agentDiv.find('.throughputChart').get(0));	
	createChart(latencyTimeseries, agentDiv.find('.latencyChart').get(0));
}  

function log(msg) 
{
	console.log(msg);
    // $('#log').append('<div></div>').append(document.createTextNode(msg));
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
		log('XMPP Performance Console: Send a message to ' + connection.jid + 
		    ' to talk to me.');

		// connection.addHandler(onMessage, null, 'message', null, null,  null); 
		connection.send($pres().tree());                
		connection.muc.join($('#chatroomid').get(0).value, "console", onMessage, onPresence, "console");
    }
}

var latestMeasurements = {};

function onPresence(msg) {
	var to = msg.getAttribute('to');
    var from = msg.getAttribute('from');
	var tagname = msg.tagName;
	
	if (msg.type == 'unavailable') {
		console.log(tagname + ' unavailable from ' + from + ' to ' + to);
	}                                                                               
    return true;
}                            

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
				updateAgents(from, measurement);                                                  
				updateChart(throughput, currentTime, aggregate('throughput'), $("#throughputNumber"), ' / sec');
				agents[from].timeseries.throughput.append(currentTime, measurement.throughput);
			}
			if (measurement.latency) {                                                  
				updateAgents(from, measurement);         
				updateChart(latencies, currentTime, aggregate('latency'), $("#latencyNumber"), ' ms');
				agents[from].timeseries.latency.append(currentTime, measurement.latency);
			}			
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

var agents = { };
  
var updateAgents = function(agentJid, measurement) {
	
	if (agents[agentJid]) { 
		agents[agentJid].latestMeasurement = measurement;
	}                            
	else {
		//add agent into hash along with a new timeseries thingy               		
		//add a new agent div into the panel and start streaming
		agents[agentJid] = { timeseries: { throughput: new TimeSeries(), latency: new TimeSeries() }, chartId: agentJid, latestMeasurement: measurement };
		addAgentCharts(agentJid, agents[agentJid].timeseries.throughput, agents[agentJid].timeseries.latency);
	}
	
}

var aggregate = function(field) {
	var accumulator = 0;
	for (agentJid in agents) {
		accumulator += agents[agentJid].latestMeasurement[field];
	}
	return accumulator;
}

function updateChart(series, time, value, element, suffix) {
	 series.append(time, value);			
	 element.html(value.toFixed(0) + suffix);
}
    
function onDisconnect(msg) {
	connection.disconnect();
	return true;
}             

$(document).ready(function () {
    connection = new Strophe.Connection(BOSH_SERVICE);

    $('#connect').bind('click', function () {
	var button = $('#connect').get(0);
	if (button.value == 'connect') {
	    button.value = 'disconnect';

	    connection.connect($('#jid').get(0).value,
			       $('#pass').get(0).value,
			       onConnect);
		createTimeline();
	} else {
	    button.value = 'connect';  
		connection.muc.leave("performance@chatrooms.jalewis.thoughtworks.com", "console", onDisconnect);
	}
    });
});
