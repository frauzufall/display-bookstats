var socket;
var ctx;
var months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
var weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
var oneDay = 24*60*60*1000;

window.onload = function() {

    var graphTime = new Dygraph(document.getElementById("graph1"),[[new Date(),0]],{labels: [ "x", "Watch time" ]});

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
        console.log(data);
        var timeline = $(".timeline");
        timeline.empty();
        if(data.log){
            var lastyear = 0;
            var lastmonth = 0;
            var lastdate = 0;
            var currentday = 0;
            var timeData = new Array();
            var daysum = 0;
            for (var i = 0; i < data.log.page.length; i++){
                var pagelog = data.log.page[i];
                var a = new Date(parseInt(pagelog.start) * 1000);
                var year = a.getFullYear();
                var month = a.getMonth();
                var date = a.getDate();
                var weekday = weekdays[a.getDay()];
                var hour = a.getHours();
                var min = a.getMinutes();
                var sec = a.getSeconds();
                if(lastyear != year || lastmonth != month || lastdate != date){
                    //new day
                    if(currentday != 0){
                        timeline.append(currentday);
                        timeData.push([new Date(lastyear, lastmonth, lastdate), daysum]);
                    }
                    daysum = 0;
                    currentday = $("<div class='day'><span class='date'>" + weekday + ", " + date + '. ' + months[month] + ' ' + year + "</span></div>");
                    lastyear = year;
                    lastmonth = month;
                    lastdate = date;
                }
                daysum += parseFloat(pagelog.end - pagelog.start) / 60.;
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
                timeline.append(currentday);
                timeData.push([new Date(lastyear, lastmonth, lastdate), daysum]);
            }
            if(timeData.length > 0){
                graphTime.updateOptions({'file': timeData});
            }
        }else{
            console.log("data.log not found");
        }
        
    });

    socket.on('ready', function (data) {

        ctx = document.getElementById('canvas').getContext('2d');

    });
}
