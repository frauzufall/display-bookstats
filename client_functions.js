var socket;
var ctx;
var months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
var weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
var oneDay = 24*60*60*1000;

function sortByProperty(objArray, prop, direction){
	if (arguments.length<2) throw new Error("ARRAY, AND OBJECT PROPERTY MINIMUM ARGUMENTS, OPTIONAL DIRECTION");
	if (!Array.isArray(objArray)) throw new Error("FIRST ARGUMENT NOT AN ARRAY");
	const clone = objArray.slice(0);
	const direct = arguments.length>2 ? arguments[2] : 1; //Default to ascending
	const propPath = (prop.constructor===Array) ? prop : prop.split(".");
	clone.sort(function(a,b){
		for (let p in propPath){
				if (a[propPath[p]] && b[propPath[p]]){
					a = a[propPath[p]];
					b = b[propPath[p]];
				}
		}
		// convert numeric strings to integers
		// a = a.match(/^\d+$/) ? +a : a;
		// b = b.match(/^\d+$/) ? +b : b;
		return ( (a < b) ? -1*direct : ((a > b) ? 1*direct : 0) );
	});
	return clone;
}

const transpose = matrix => matrix.reduce(($, row) =>
	row.map((_, i) => [...($[i] || []), row[i]]),
	[]
)

window.onload = function() {

	var graphTime = new Dygraph(document.getElementById("graph1"),[[new Date(),0]],{
		labels: [ "x", "Watch time" ],
		underlayCallback: function(canvas, area, g) {

			canvas.fillStyle = "rgba(255, 255, 102, 1.0)";

			function highlight_period(x_start, x_end) {
			  var canvas_left_x = g.toDomXCoord(x_start);
			  var canvas_right_x = g.toDomXCoord(x_end);
			  var canvas_width = canvas_right_x - canvas_left_x;
			  canvas.fillRect(canvas_left_x, area.y, canvas_width, area.h);
			}

			var min_data_x = g.getValue(0,0);
			var max_data_x = g.getValue(g.numRows()-1,0);

			// get day of week
			var d = new Date(min_data_x);
			var dow = d.getUTCDay();

			var w = min_data_x;
			// starting on Sunday is a special case
			if (dow === 0) {
			  highlight_period(w,w+12*3600*1000);
			}
			// find first saturday
			while (dow != 6) {
			  w += 24*3600*1000;
			  d = new Date(w);
			  dow = d.getUTCDay();
			}
			// shift back 1/2 day to center highlight around the point for the day
			w -= 12*3600*1000;
			while (w < max_data_x) {
			  var start_x_highlight = w;
			  var end_x_highlight = w + 2*24*3600*1000;
			  // make sure we don't try to plot outside the graph
			  if (start_x_highlight < min_data_x) {
				start_x_highlight = min_data_x;
			  }
			  if (end_x_highlight > max_data_x) {
				end_x_highlight = max_data_x;
			  }
			  highlight_period(start_x_highlight,end_x_highlight);
			  // calculate start of highlight for next Saturday
			  w += 7*24*3600*1000;
			}
		}
	});

	var graphWeek = new Dygraph(document.getElementById("graph2"),[[0]],{
		labels: [ "x" ],
		stackedGraph: false,
		width: 480,
		height: 320,
		stackedGraph: false,
		highlightCircleSize: 2,
		strokeWidth: 1,
		strokeBorderWidth: 1,
		highlightSeriesOpts: {
			  strokeWidth: 3,
			  strokeBorderWidth: 1,
			  highlightCircleSize: 5
		  }});

	var graphPages = new Dygraph(document.getElementById("graph3"),[[0]],{
		labels: [ "x" ],
		stackedGraph: false,
		width: 680,
		height: 320,
		stackedGraph: false,
		highlightCircleSize: 2,
		strokeWidth: 1,
		strokeBorderWidth: 1,
		highlightSeriesOpts: {
			  strokeWidth: 3,
			  strokeBorderWidth: 1,
			  highlightCircleSize: 5
		  }});

	$("#canvas").on("click", function(){
		if($(this).hasClass("small")){
			$(this).removeClass("small");
		}else{
			$(this).addClass("small");
		}
	});

	socket = io('/viewer');

	socket.emit("client-connected");

	socket.on('disconnect', function () {
		$(".msg").text("Die Verbindung zum Server wurde getrennt.");
		$(".msg").removeClass("success");
		$(".msg").removeClass("error");
		$(".dimmer-msg").show();
	});

	socket.on('image', function (data) {
		var img = new Image();
		img.src = 'data:image/jpeg;base64,' + data.buffer;
		ctx.drawImage(img, 0, 0);
	});

	socket.on('log', function (data) {
		data = JSON.parse(data);
		//console.log(data);
		var timeline = $(".timeline");
		timeline.empty();
		if(data.log){
			log = sortByProperty(data.log, 'start');
			// const resultsByObjectIdDescending = sortByProperty(results, 'attributes.OBJECTID', -1);
			var lastyear = 0;
			var lastmonth = 0;
			var lastdate = 0;
			var lastday = 0;
			var currentday = 0;
			var currentmonth = 0;
			var timeData = new Array();
			var weekData = new Array();
			weekData.push([0,1,2,3,4,5,6]);
			var currentweek = [0,0,0,0,0,0,0];
			var pagesData = new Array();
			var pagesNum = 62;
			for( var i = 0; i < pagesNum; i++) {
				pagesData.push([i, 0]);
			}
			var daysum = 0;
			for (var i = 0; i < log.length; i++){
				var pagelog = log[i];
				var a = new Date(parseInt(pagelog.start) * 1000);
				var year = a.getFullYear();
				var month = a.getMonth();
				var date = a.getDate();
				var day = a.getDay();
				var weekday = weekdays[day];
				var hour = a.getHours();
				var min = a.getMinutes();
				var sec = a.getSeconds();
				if(lastyear != year || lastmonth != month || lastdate != date){
					//new day
					if(currentday != 0){
						currentmonth.append(currentday);
						timeData.push([new Date(lastyear, lastmonth, lastdate), daysum]);
						currentweek[day] = daysum;
					}
					if(lastday > day) {
						if(currentweek.length > 0) {
							weekData.push(currentweek);
							currentweek = [0,0,0,0,0,0,0];
						}
					}
					if(lastmonth != month) {
						if(currentmonth != 0){
							timeline.append(currentmonth);
						}
						currentmonth = $("<div class='month'><span class='name'>" + months[month] + ' ' + year + "</span></div>");
					}
					daysum = 0;
					currentday = $("<div class='day'><span class='date'>" + weekday + ", " + date + '. ' + months[month] + ' ' + year + "</span></div>");
					lastyear = year;
					lastmonth = month;
					lastdate = date;
					lastday = day;
				}
				var assumedViewingTime = Math.min(parseFloat(pagelog.end - pagelog.start) / 60., 2.);
				daysum += assumedViewingTime;
				pagesData[parseInt(pagelog.id)][1] += assumedViewingTime;
				var thisday = new Date(year, month, date);
				var width = (parseFloat(pagelog.end - pagelog.start)*1000)/parseFloat(oneDay)*100;
				var left = parseFloat(a - thisday) / parseFloat(oneDay) * 100;
				currentday.append("<span class='page page"
					+ parseInt(pagelog.id) + "' style='width:" + width + "%; left: " + left + "%;'>"
					+ "<span class='tooltip'>page "
					+ parseInt(pagelog.id) + ",<br /> "
					+ hour + ":" + min + ":" + sec + "</span></span>");
			}
			if(currentday != 0){
				currentmonth.append(currentday);
				timeData.push([new Date(lastyear, lastmonth, lastdate), daysum]);
				currentweek[day] = daysum;
			}
			if(currentweek.length > 0) {
				weekData.push(currentweek);
			}
			if(currentmonth != 0){
				timeline.append(currentmonth);
			}
			if(timeData.length > 0){
				graphTime.updateOptions({'file': timeData});
				var labels = ['x'];
				for (var i = 0; i < weekData.length; ++i) {
					var label = '' + i;
					label = 's' + '000'.substr(label.length) + label;
					labels[i] = label;
				}
				graphWeek.updateOptions({'labels': labels.slice()});
				graphWeek.updateOptions({'file': transpose(weekData)});
				graphWeek.updateOptions({clickCallback: onclick}, true);
				graphPages.updateOptions({'labels': ["page number", "viewing time"], 'file': pagesData});
				graphPages.updateOptions({clickCallback: onclick}, true);
			}
		}else{
			console.log("data.log not found");
		}

		$(".month").on("click", function(){
			$(this).find(".day").toggle();
		});

	});

	socket.on('ready', function (data) {

		ctx = document.getElementById('canvas').getContext('2d');

	});
}
