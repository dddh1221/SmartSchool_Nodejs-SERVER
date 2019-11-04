var net = require('net');
var mysql = require("mysql");
var fs = require('fs');

var autoDoor_socket;
var classTable_socket;

const AUTO_DOOR = "192.168.0.102";
const CLASS_TABLE = "192.168.0.31";

console.log("# MariaDB와 연동을 시도합니다.");

var school_data = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    port: "3306",
    database: "School_data"
})

var classroom_data = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    port: "3306",
    database: "Classroom_data"
})

var classroom_studentlist = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    port: "3306",
    database: "Classroom_studentList"
})

var student_timetable = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    port: "3306",
    database: "student_timetable"
})

var student_attendance = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    port: "3306",
    database: "Student_attendance"
})

var school_bus = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    port: "3306",
    database: "School_bus"
})

var teacher_timetable = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    port: "3306",
    database: "Teacher_timetable"
})

console.log("# 데이터베이스와 연동에 성공했습니다.");

const DELAY_TIME = 3;             // 시간이 업데이트될 시간 (초 단위)
const START_HOUR = 9;             // 하루의 시작 시간
const LAST_HOUR = 16;             // 하루의 마지막 시간
const LAST_MINUTE = 59;           // 마지막 분

const ONE_MINUTE = 60000;         // 1분의 밀리초
const ONE_HOUR = ONE_MINUTE * 60; // 1시간의 밀리초
const ONE_DAY = ONE_HOUR * 24;    // 하루의 밀리초

console.log("# 서버 시간 객체를 생성합니다.");

// 출결 상태 "결석"으로 변경
var ChangeStudentAttendance = function() {
    var sql = "select * from Student_user";
    school_data.query(sql, function(err, result, fields){
        if(!err && result[0] != null) {
            for(i = 0; i < result.length ; i++) {
                var student_num = result[i].num;
                var date = year + "." + month + "." + day;

                var sql2 = "select class_" + class_time + " from student_timetable.S_" + student_num + " where week='" + week + "'";    // 과목이름
                var sql3 = "select room_" + class_time + " from student_timetable.S_" + student_num + " where week='" + week + "'";     // 강의실명
                var sql4 = "select classroom from Classroom_data." + week + " where name=(" + sql3 + ")";                               // 강의실코드

                var time = (class_time != 7)? class_time - 1 : class_time;

                //UPDATE [테이블] SET [열] = '변경할값' WHERE [조건]
                //SELECT * FROM join_table WHERE if( CHAR_LENGTH(name) = 2, 'Y', 'N' ) = 'Y';
                //var sql5 = "insert into S_" + student_num + " values ('" + date + "', '" + week +"', " + class_time + ", (" + sql4 + "), (" + sql2 + "), 0)";
                var sql5 = "update S_" + student_num + " set state=3 where date='" + date + "' and time=" + time + " and classroom=(" + sql4 + ") and subject=(" + sql2 + ") and if(state=0, 'Y', 'N') = 'Y'"

                student_attendance.query(sql5, function(err, result, fields){
                    if(err) {
                        console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 23");
                        console.log(err);
                    }
                })
            }
        }
        else {
            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 22");
            console.log(err);
        }
    })
}

// "미출석" 상태 일일 출석부 생성
var CreateAttendance = function() {
    var sql = "select * from Student_user";
    school_data.query(sql, function(err, result, fields){
        if(!err && result[0] != null) {
            for(i = 0; i < result.length ; i++) {
                var student_num = result[i].num;
                var date = year + "." + month + "." + day;

                for(j = 1; j <= 7 ; j++) {
                    var sql2 = "select class_" + j + " from student_timetable.S_" + student_num + " where week='" + week + "'";    // 과목이름
                    var sql3 = "select room_" + j + " from student_timetable.S_" + student_num + " where week='" + week + "'";     // 강의실명
                    var sql4 = "select classroom from Classroom_data." + week + " where name=(" + sql3 + ")";                               // 강의실코드
                    var sql5 = "insert into S_" + student_num + " values ('" + date + "', '" + week + "', " + j + ", (" + sql4 + "), (" + sql2 + "), 0)";

                    student_attendance.query(sql5, function(err, result, fields) {
                        if(err) {
                            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 25");
                            console.log(err);
                        }
                    })
                }
            }
        }
        else {
            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 24");
            console.log(err);
        }
    })
}

// 시간을 변경하는 타이머 함수
timeUpdate = setInterval(function(){
    var sql = "SELECT * FROM server_time";
    school_data.query(sql, function(err, result, fields){
        if(!err){
            year = result[0].year;
            month = result[0].month;
            day = result[0].day;

            hour = result[0].hour;
            minute = result[0].minute;
            week = result[0].week;
            class_time = result[0].classTime;

            var server_date = new Date(year, month - 1, day, hour, minute, 0, 0);
            var now = server_date.getTime();

            if(minute < LAST_MINUTE && hour < LAST_HOUR) {
                // 60분이 되기 전
                minute += 1;
                var sql = "UPDATE server_time SET minute=" + minute;
                school_data.query(sql);
                
            }
            else {
                // 60분이 지난 후
                ChangeStudentAttendance();      // 결석 상태로 변경

                if(hour < LAST_HOUR - 1){
                    // 하루의 마지막 시간이 아니라면
                    hour += 1;
                    var sql = "UPDATE server_time SET hour=" + hour;
                    var sql2 = "UPDATE server_time SET minute=" + (minute = 0);

                    school_data.query(sql);
                    school_data.query(sql2);
                }
                else {
                    // 하루의 마지막 시간이 지났다면
                    var sql = "UPDATE server_time SET hour=" + (hour = START_HOUR);
                    var sql2 = "UPDATE server_time SET minute=" + (minute = 0);

                    school_data.query(sql);
                    school_data.query(sql2);

                    console.log("[#] 하루가 지난 날짜로 설정합니다.");
                    server_date.setTime(now + ONE_DAY);
                    
                    console.log("[#] 날짜가 주말인 경우 평일로 건너뜁니다.");

                    // 주말일 경우 평일로 건너뛰기
                    if(server_date.getDay() == 0 || server_date.getDay() == 6) {
                        while(server_date.getDay() != 1) server_date.setTime(now += ONE_DAY);
                    }

                    console.log("[#] 하루가 지난 날짜의 정보를 불러옵니다.");
                    year = server_date.getFullYear();
                    month = server_date.getMonth() + 1;
                    day = server_date.getDate();
                    week = server_date.getDay();

                    console.log("[-] " + year + "년 " + month + "월 " + day + "일");

                    console.log("[#] 요일의 숫자 데이터를 문자열로 변경합니다.");
                    switch(week) {
                        case 1: week = "월"; break;
                        case 2: week = "화"; break;
                        case 3: week = "수"; break;
                        case 4: week = "목"; break;
                        case 5: week = "금"; break;
                    }

                    console.log("[#] 변경된 날짜 정보를 DB에 적용합니다.");
                    var sql = "UPDATE server_time SET year=" + year + ", month=" + month + ", day=" + day + ", week='" + week + "'";
                    school_data.query(sql);

                    CreateAttendance();     // 미출석 상태의 일일 출석부 생성
                }

                switch(hour) {
                    case 9:     class_time = 1; break;      // 1교시
                    case 10:    class_time = 2; break;      // 2교시
                    case 11:    class_time = 3; break;      // 3교시
                    case 12:    class_time = 4; break;      // 4교시
                    case 13:    class_time = 5; break;      // 5교시
                    case 14:    class_time = 6; break;      // 6교시
                    case 15:    class_time = 7; break;      // 7교시
                    default:    class_time = 0; break;      // 정해진 시간이 없을 때
                }

                var sql = "UPDATE server_time SET classTime=" + class_time;
                school_data.query(sql);
            }
            
        } else {
            console.log("[!] 쿼리문에 에러가 있습니다. 에러 코드 : 1");
            console.log(err);
        }
    })
}, DELAY_TIME * 1000);

console.log("# 서버 소켓을 생성합니다.");

var server = net.createServer(function(socket){
    console.log('[!] ' + socket.remoteAddress.substring(7) + " 가 연결되었습니다.");
    socket.setEncoding("utf8");

    if(socket.remoteAddress.substring(7) == AUTO_DOOR){
        autoDoor_socket = socket;
        console.log("# 자동문이 연결되었습니다.");
        autoDoor_socket.write("# 자동문이 연결되었습니다.");
    }
    else if(socket.remoteAddress.substring(7) == CLASS_TABLE){
        classTable_socket = socket;
        console.log("[#] 교탁이 연결되었습니다.");
    }

    socket.on('data', function(data){
        
        var temp = data;
        var command = data.split(" ");
        
        var d = new Date();
        var serverYear = d.getFullYear();
        var serverMonth = d.getMonth() + 1;
        var serverDate = d.getDate();
        var serverHour = d.getHours();
        var serverMinute = d.getMinutes();
        var serverSecond = d.getSeconds();

        var serverToday = serverYear + "/" + serverMonth + "/" + serverDate;
        var serverTime = serverHour + ":" + serverMinute + ":" + serverSecond;

        console.log("[" + serverToday + "-" + serverTime + "] " + socket.remoteAddress.substring(7) + " : " + data);
        var sql = "SELECT * FROM server_time";
        school_data.query(sql, function(err, result, fields){
            if(!err){
                year = result[0].year;
                month = result[0].month;
                day = result[0].day;

                hour = result[0].hour;  
                minute = result[0].minute;
                week = result[0].week;
                class_time = result[0].classTime;
            
                if(command[0] == "get"){
                    if(command[1] == "time"){
                        if(hour < 10) hour = "0" + hour.toString();
                        if(minute <10) minute = "0" + minute.toString();
        
                        var send = hour + ":" + minute;
                        socket.write(send);
                    }
                    
                    else if(command[1] == "date"){
                        //if(month < 10) month = "0" + month.toString();
                        //if(day < 10) day = "0" + day.toString();

                        var send = year + "-" + month + "-" + day + "-" + week;
                        socket.write(send);
                    }

                    else if(command[1] == "classTime"){
                        socket.write(class_time.toString());  
                    }
        
                    else if(command[1] == "classroom"){
                        var classroom, resultData;
                        var sql = "SELECT * FROM classroom_PC WHERE IP='" + socket.remoteAddress.substring(7) + "'";

                        school_data.query(sql, function(err, result, fields){
                            if(!err && result[0] != null){
                                classroom = result[0].classroom.toString();

                                var sql = "SELECT * FROM " + week + " WHERE classroom=" + classroom;
                                classroom_data.query(sql, function(err, result, fields){
                                    if(!err){
                                        resultData = result;

                                        if(command[2] == "name"){
                                            var send = resultData[0].name.toString();
                                            socket.write(send);
                                        }
                                            
                                        else if(command[2] == "subject"){
                                            switch(class_time){
                                                case 1:
                                                    var send = resultData[0].class_1.toString(); break;
                                                case 2:
                                                    var send = resultData[0].class_2.toString(); break;
                                                case 3:
                                                    var send = resultData[0].class_3.toString(); break;
                                                case 4:
                                                    var send = resultData[0].class_4.toString(); break;
                                                case 5:
                                                    var send = resultData[0].class_5.toString(); break;
                                                case 6:
                                                    var send = resultData[0].class_6.toString(); break;
                                                case 7:
                                                    var send = resultData[0].class_7.toString(); break;
                                            }
                                            socket.write(send);
                                        }
                                            
                                        else if(command[2] == "teacher"){
                                            switch(class_time){
                                                case 1:
                                                    var send = resultData[0].teacher_1.toString(); break;
                                                case 2:
                                                    var send = resultData[0].teacher_2.toString(); break;
                                                case 3:
                                                    var send = resultData[0].teacher_3.toString(); break;
                                                case 4:
                                                    var send = resultData[0].teacher_4.toString(); break;
                                                case 5:
                                                    var send = resultData[0].teacher_5.toString(); break;
                                                case 6:
                                                    var send = resultData[0].teacher_6.toString(); break;
                                                case 7:
                                                    var send = resultData[0].teacher_7.toString(); break;
                                            }
                                            socket.write(send);
                                        }

                                        else if(command[2] == "studentlist"){
                                            var sql = "SELECT num, name FROM C_" + classroom + " WHERE week='" + week + "'AND time=" + class_time;
                                            classroom_studentlist.query(sql, function(err, result, fields){
                                                if(!err){
                                                    var send = JSON.stringify(result);
                                                    socket.write(send);
                                                }
                                                else{
                                                    console.log(err);
                                                }
                                            })
                                        }

                                        else {
                                            socket.write('[!] 잘못된 명령어입니다.');
                                        }
                                    }
                                    else{
                                        console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 2")
                                        console.log(err);
                                        socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 2");
                                    }
                                });
                            }
                            else{
                            console.log("[!] 등록되지 않은 컴퓨터입니다.");
                            socket.write("[!] 등록되지 않은 컴퓨터입니다.");
                            }
                        });
                    }
                    else if(command[1] == "teacher"){
                        if(command[2] == "photo"){
                            fs.readFile('teacher_photo/' + command[3] + '.png', function(err, data){
                                if(!err && result[0] != null){
                                    console.log("[!] Search Teacher Photo : " + command[3]);
                                    socket.write(data);
                                } else {
                                    console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 3");
                                    console.log(err);
                                    socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 3")
                                }
                            })
                        }

                        else if(command[2] == "name"){
                            var sql = "SELECT * FROM Teacher_user WHERE num='" + command[3] + "'";
                            school_data.query(sql, function(err, result, fields) {
                                if(!err) {
                                    if(result[0] != null){
                                        socket.write(result[0].name);
                                    }
                                    else{
                                        socket.write("false");
                                    }
                                } else {
                                    console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 10");
                                    socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 10");
                                }
                            })
                        }

                        else if(command[2] == "permission") {
                            var name = command[3];
                            var sql = "select * from Teacher_user where name='" + name + "'";

                            school_data.query(sql, function(err, result, fields) {
                                if(!err) {
                                    var send = result[0].permission;
                                    socket.write(send);
                                }
                                else {
                                    console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 51");
                                    console.log(err);
                                }
                            })
                        }
                        
                        else if(command[2] == "timetable") {
                            var name = command[3];

                            var sql = "select num from Teacher_user where name='" + name + "'";
                            school_data.query(sql, function(err, result, fields) {
                                if(!err && result[0] != null) {
                                    var num = result[0].num;
                                    var sql = "select * from T_" + num;
                                    
                                    teacher_timetable.query(sql, function(err, result, fields) {
                                        if(!err && result[0] != null) {
                                            var send = JSON.stringify(result);
                                            socket.write(send);
                                            console.log("[#] " + name + " 선생님의 시간표를 전송했습니다.");
                                        }
                                        else {
                                            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 51");
                                            console.log(err);
                                            socket.write("false");
                                        }
                                    })
                                }
                                else {
                                    console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입닏. 에러 코드 : 52");
                                    console.log(err);
                                    socket.write("false");
                                }
                            })
                        }
                    }
                    else if(command[1] == "student"){
                        var sql = "SELECT * FROM Student_user WHERE name='" + command[3] + "'";
                        school_data.query(sql, function(err, result, fileds){
                            var num = result[0].num;
                            var name = result[0].name;
                            var password = result[0].password;
                            var uuid = result[0].uuid;
                            var photo = result[0].photo;
                            
                            console.log("[#] 요청한 학생의 정보가 확인되었습니다.");
                            console.log("[#] 이름 : " + name + ", 학번 : " + num);

                            if(!err) {
                                if(command[2] == "photo"){
                                    fs.readFile('student_photo/' + name + '.png', function(err, data){
                                        if(!err && result[0] != null){
                                            console.log("[!] Search Student Photo : " + command[3]);
                                            socket.write(data);
                                        } else {
                                            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 4");
                                            console.log(err);
                                            socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 4");
                                        }
                                    })
                                }
        
                                else if(command[2] == "timetable"){
                                    var sql = "SELECT * FROM S_" + num + " WHERE week='" + week +"'";
                                    student_timetable.query(sql , function(err, result, fields){
                                        if(!err && result[0] != null){
                                            var send = JSON.stringify(result);
                                            socket.write(send);
                                        } else{
                                            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 5");
                                            console.log(err);
                                            socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 5");
                                        }
                                    })
                                }

                                else if(command[2] == "classname"){
                                    var sql = "SELECT week, class_1, class_2, class_3, class_4, class_5, class_6, class_7 FROM S_" + num;
                                    student_timetable.query(sql, function(err, result, fields){
                                        if(!err && result[0] != null){
                                            var send = JSON.stringify(result);
                                            socket.write(send);
                                        } else{
                                            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 6");
                                            console.log(err);
                                            socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 6");
                                        }
                                    })
                                }

                                else if(command[2] == "room"){
                                    var sql = "SELECT week, room_1, room_2, room_3, room_4, room_5, room_6, room_7 FROM S_" + num;
                                    student_timetable.query(sql, function(err, result, fields){
                                        if(!err && result[0] != null){
                                            var send = JSON.stringify(result);
                                            socket.write(send);
                                        } else{
                                            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 7");
                                            console.log(err);
                                            socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 7");
                                        }
                                    })
                                }

                                else if(command[2] == "teacher"){
                                    var sql = "SELECT week, teacher_1, teacher_2, teacher_3, teacher_4, teacher_5, teacher_6, teacher_7 FROM S_" + num;
                                    student_timetable.query(sql, function(err, result, fields){
                                        if(!err && result[0] != null){
                                            var send = JSON.stringify(result);
                                            socket.write(send);
                                        } else{
                                            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 8");
                                            console.log(err);
                                            socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 8");
                                        }
                                    })
                                }

                                else if(command[2] == "num"){
                                    socket.write(num);
                                }
                            } 
                            else {
                                console.log("[!] 옳지 않은 명령어입니다.");
                            }
                        })
                    }
                    else if(command[1] == "subject") {
                        var sql = "SELECT name, class_" + command[3] + ", teacher_" + command[3] + " FROM " + command[2];
                        classroom_data.query(sql, function(err, result, fields){
                            if(!err && result[0] != null){
                                var send = JSON.stringify(result);
                                socket.write(send);
                            } else {
                                console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 9");
                                console.log(err);
                                socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 9");
                            }
                        })
                    }
                    else if(command[1] == "attendance") {
                        var date = command[2];
                        var student_name = command[3];
                        
                        var sql = "select * from Student_user where name='" + student_name + "'";
                        school_data.query(sql, function(err, result, fields){
                            if(!err && result[0] != null) {
                                var student_num = result[0].num;

                                var sql = "select date, time, subject, state from S_" + student_num + " where date='" + date + "'";
                                student_attendance.query(sql, function(err, result, fields){
                                    if(!err && result[0] != null) {
                                        var send = JSON.stringify(result);
                                        socket.write(send);
                                    }
                                    else {
                                        console.log("[!] 오늘 날짜로 된 " + student_name +" 학생의 출석부를 찾을 수 없습니다. 에러 코드 : 20");
                                        console.log(err);
                                        socket.write("false");
                                    }
                                })
                            }
                            else {
                                console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 21");
                                console.log(err);
                                socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 21");
                            }
                        }) 
                    }
                    else if(command[1] == "studentlist") {
                        var sql = "select * from Student_user";
                        school_data.query(sql, function(err, result, fields) {
                            if(!err) {
                                var send = JSON.stringify(result);
                                socket.write(send);
                            }
                            else {
                                console.log("[!] 쿼리문에 에러가 있습니다. 에러 코드 : 53");
                                socket.write("[!] 쿼리문에 에러가 있습니다. 에러 코드 : 53");
                                console.log(err);
                            }
                        })
                    }
                    else {
                        socket.write('[!] 옳지 않은 명령어 입니다.');
                    }
                }
                else if(command[0] == "login"){
                    var name = command[2];
                    var password = command[3];
                    if(command[1] == "student"){
                        var sql = "select * from Student_user where name='" + name + "' and password='" + password + "'";
                        school_data.query(sql, function(err, result, fields){
                            if(!err) {
                                if(result[0] != null){
                                    socket.write("true");
                                    console.log("[!] 학생 로그인에 성공했습니다.");
                                }
                                else{
                                    console.log("[!] 학생 로그인에 실패했습니다.");
                                    socket.write("false");
                                }
                            }
                        })
                    }

                    else if(command[1] == "teacher"){
                        var sql = "select * from Teacher_user where num='" + name + "' and password='" + password + "'";
                        school_data.query(sql, function(err, result, fields){
                            if(!err) {
                                if(result[0] != null){
                                    socket.write("true");
                                    console.log("[!] 선생님 로그인에 성공했습니다.");
                                }
                                else{
                                    socket.write("false");
                                    console.log("[!] 선생님 로그인에 실패했습니다.");
                                }
                            }
                        })
                    }

                    else if(command[1] == "appTeacher"){
                        var sql = "select * from Teacher_user where name='" + name + "' and password='" + password + "'";
                        school_data.query(sql, function(err, result, fields) {
                            if(!err) {
                                if(result[0] != null) {
                                    socket.write("true");
                                    console.log("[!] 선생님 로그인에 성공했습니다.");
                                }
                                else{
                                    socket.write("false");
                                    console.log("[!] 선생님 로그인에 실패했습니다.");
                                }
                            }
                        })
                    }

                    else {
                        socket.write("[!] 옳지 않은 명령어입니다.");
                    }
                }
                else if(command[0] == "nfc"){
                    var sql = "select * from server_time";
                    school_data.query(sql, function(err, result, fields){
                        if(!err && result[0] != null) {
                            var year = result[0].year;
                            var month = result[0].month;
                            var day = result[0].day;
                            var week = result[0].week;
                            var hour = result[0].hour;
                            var minute = result[0].minute;
                            var classTime = result[0].classTime;
                            var UUID = command[2];

                            var in_IP = socket.remoteAddress.substring(7);
                            var date = year + "." + month + "." + day;
                            var sql2 = "select * from classroom_PC where IP='" + in_IP + "'";
                            school_data.query(sql2, function(err, result, fields){
                                if(!err && result[0] != null) {
                                    var in_classroom = result[0].classroom;
                                    var sql3 = "select * from Student_user where UUID='" + UUID + "'";

                                    school_data.query(sql3, function(err, result, fields){
                                        if(!err && result[0] != null){
                                            var student_num = result[0].num;
                                            var student_name = result[0].name;
                                            
                                            var sql4 = "select class_" + classTime + ", room_" + classTime + ", teacher_" + classTime + " from S_"+ student_num +" where week='" + week + "'";

                                            student_timetable.query(sql4, function(err, result, fields){
                                                if(!err && result[0] != null) {
                                                    var subject = "";
                                                    if(classTime==1) subject = result[0].class_1;
                                                    else if(classTime==2) subject = result[0].class_2;
                                                    else if(classTime==3) subject = result[0].class_3;
                                                    else if(classTime==4) subject = result[0].class_4;
                                                    else if(classTime==5) subject = result[0].class_5;
                                                    else if(classTime==6) subject = result[0].class_6;
                                                    else if(classTime==7) subject = result[0].class_7;

                                                    var sql5 = "select name, class_" + classTime + ", teacher_" + classTime + " from " + week + " where classroom=" + in_classroom + " and class_" + classTime + "='" + subject + "'";
                                                    classroom_data.query(sql5, function(err, result, fields){
                                                        if(!err) {
                                                            if(result[0] != null){
                                                                var sql6 = "select * from S_" + student_num + " where date='" + date + "' and day='" + week + "' and time=" + classTime + " and classroom=" + in_classroom + " and state=1";
                                                                student_attendance.query(sql6, function(err, result, fields){
                                                                    if(!err) {
                                                                        if(result[0] == null) {
                                                                            //var sql7 = "insert into S_" + student_num + "(date, day, time, classroom, subject, state) values ('" + date + "', '" + week + "', '" + classTime + "', " + in_classroom + ", '" + subject +"', 1)";
                                                                            // UPDATE [테이블] SET [열] = '변경할값' WHERE [조건]
                                                                            var sql7 = "update S_" + student_num + " set state=1 where date='" + date +"' and day='" + week + "' and time=" + classTime + " and classroom=" + in_classroom + " and subject='" + subject +"'";
                                                                            student_attendance.query(sql7, function(err, result, fields){
                                                                                if(!err) {
                                                                                    console.log("[#] 태그된 " + student_name + " 학생의 출석이 처리됩니다.");
                                                                                    socket.write(student_name);
                                                                                }
                                                                                else {
                                                                                    console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 19");
                                                                                    console.log(err);
                                                                                    socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 19");
                                                                                }
                                                                            })
                                                                        }
                                                                        else {
                                                                            console.log("[!] 태그된 " + student_name + " 학생의 출석이 이미 처리되었습니다.");
                                                                            socket.write("already");
                                                                        }
                                                                    }
                                                                    else {
                                                                        console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 18");
                                                                        console.log(err);
                                                                        socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 18");
                                                                    }
                                                                })
                                                            }
                                                            else {
                                                                console.log("[!] 태그된 " + student_name + " 학생의 수업이 아니라 출석이 처리되지 않습니다.");
                                                                socket.write("false");
                                                            }
                                                        }
                                                        else {
                                                            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 17");
                                                            console.log(err);
                                                            socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 17");
                                                        }
                                                    })
                                                }
                                                else {
                                                    console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 16");
                                                    console.log(err);
                                                    socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 16");
                                                }
                                            })
                                        }
                                        else {
                                            console.log("[!] UUID가 등록되지 않은 학생입니다. 에러 코드 : 15");
                                            console.log(err);
                                            socket.write("false");
                                        }
                                    })
                                }
                                else {
                                    console.log("[!] 등록되지 않은 PC입니다. 에러 코드 : 14");
                                    console.log(err);
                                    socket.write("[!] 등록되지 않은 PC입니다. 에러 코드 : 14");
                                }
                            })
                        }
                        else {
                            console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 13");
                            socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 13");
                        }
                    })
                }
                else if(command[0] == "change"){
                    if(command[1] == "subject") {
                        var firstData = command[3].split('&');
                        var secondData = command[4].split('&');

                        var first_week = firstData[0];
                        var first_time = firstData[1];
                        var first_name = firstData[2];
                        var first_room = firstData[3];
                        var first_teacher = firstData[4];

                        var second_week = secondData[0];
                        var second_time = secondData[1];
                        var second_name = secondData[2];
                        var second_room = secondData[3];
                        var second_teacher = secondData[4];

                        var student_name = command[2];
                        var sql = "SELECT * FROM " + first_week + " WHERE name='" + first_room + "'";
                        classroom_data.query(sql, function(err, result, fields) {
                            if(!err && result[0] != null) {
                                var classcode = result[0].classroom;

                                var delete_sql = "DELETE FROM C_" + classcode + " WHERE name='" + student_name + "' AND week='" + first_week + "' AND time='" + first_time + "'";
                                classroom_studentlist.query(delete_sql, function(err, result, fileds){
                                    if(err) console.log(err);
                                });
                            }
                            else {
                                console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 11");
                                socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 11");
                            }
                        })

                        var sql = "SELECT * FROM " + second_week + " WHERE name='" + second_room + "'";
                        classroom_data.query(sql, function(err, result, fields) {
                            if(!err && result[0] != null) {
                                var classcode = result[0].classroom;

                                var num_sql = "SELECT num FROM Student_user WHERE name = '" + student_name +"'";
                                school_data.query(num_sql, function(err, result, fields) {
                                    if(!err && result[0] != null) {
                                        var student_num = result[0].num;

                                        var create_sql = "INSERT INTO C_" + classcode + "(num, name, week, time, subject) VALUE( " + student_num + ", '" + student_name + "', '" + second_week + "', '" + second_time + "', '" + second_name + "')";
                                        classroom_studentlist.query(create_sql, function(err, result, fields){
                                            if(err) console.log(err);
                                        });

                                        var update_sql = "UPDATE S_" + student_num + " SET class_" + second_time + "= '" + second_name + "', room_" + second_time + "= '"+ second_room + "', teacher_" + second_time + "= '" + second_teacher +"' WHERE week='" + second_week + "'";
                                        student_timetable.query(update_sql, function(err, result, fields){
                                            if(err) console.log(err);
                                })
                                    }
                                    else {
                                        console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 12");
                                        socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 12");
                                        console.log(err);
                                    }
                                })
                            }
                            else {
                                console.log("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 13");
                                socket.write("[!] 쿼리문에 에러가 있거나 찾을 수 없는 데이터 입니다. 에러 코드 : 13");
                                console.log(err);
                            }

                        })

                        console.log("[#] " + student_name + " 학생의 시간표 정보를 업데이트 했습니다.");
                        console.log("[#] 변경할 과목 : " + first_week + "요일 " + first_time + "교시 " + first_name);
                        console.log("[#] 변경될 과목 : " + second_week + "요일 " + second_time + "교시 " + second_name);
                        socket.write("true")
                        
                    }
                    else if(command[1] == "attendance") {
                        var student_name = command[2];
                        var change_date = command[3];
                        var change_time = command[4];
                        var change_state = command[5];

                        var sql = "select * from Student_user where name = '" + student_name + "'";
                        school_data.query(sql, function(err, result, fields) {
                            if(!err){
                                var student_num = result[0].num;

                                var sql = "update S_" + student_num + " set state=" + change_state + " where date='" + change_date + "' and time=" + change_time;
                                student_attendance.query(sql, function(err, result, fields) {
                                    if(!err) {
                                        console.log("[!] " + student_name + " 학생의 " + " " + change_time + "교시 출석 정보를 변경했습니다.");
                                        socket.write("true");
                                    }
                                    else {
                                        console.log("[!] " + student_name + " 학생의 출석 정보를 수정할 수 없습니다. 에러 코드 : 27");
                                        console.log(err);
                                        socket.write("false");
                                    }
                                })
                            }
                            else {
                                console.log("[!] 찾을 수 없는 학생 정보입니다. 에러 코드 : 26");
                                console.log(err);
                                socket.write("false");
                            }
                        })
                    }
                }
                else if(command[0] == "bus") {
                    if(command[1] == "distance") {
                        var UUID = command[2];
                        var distance = command[3];

                        //UPDATE [테이블] SET [열] = '변경할값' WHERE [조건]
                        var sql = "update Bus_Distance set distance=" + distance + " where UUID='" + UUID + "'";
                        school_bus.query(sql, function(err, result, fields) {
                            if(!err) {
                                console.log("[#] " + UUID + " 정류장의 거리 정보를 변경했습니다.");
                                socket.write("true");
                            }
                            else {
                                console.log("[!] 정류장의 거리 정보를 변경하는데 에러가 발생했습니다. 에러 코드 : 45");
                                socket.write("false");
                            }
                        })
                    }
                    else if(command[1] == "restseat") {
                        var bus_id = command[2];
                        var num = command[3];

                        var sql = "update Bus_Info set rest_seat=" + num + " where ID=" + bus_id;
                        school_bus.query(sql, function(err, result, fields) {
                            if(!err) {
                                console.log("[#] 버스 아이디 " + bus_id + " 의 남은 좌석 정보를 변경했습니다.");
                                socket.write("true");
                            }
                            else {
                                console.log("[!] 버스 정보를 불러오는데 에러가 발생했습니다. 에러 코드 : 46");
                                socket.write("false");
                            }
                        })
                    }
                    else if(command[1] == "check") {
                        var sql = "select * from Bus_Info";
                        var bus_id = command[2];

                        school_bus.query(sql, function(err, result, fields) {
                            if(!err) {
                                var sql = "select * from Bus_Info";
                                school_bus.query(sql, function(err, result, fields) {
                                    if(!err & result != null) {
                                        var tb_next_station = result[0].next_station;
                                        var next_station = "";

                                        if(tb_next_station == "통신과") next_station = "제어과";
                                        else if(tb_next_station == "제어과") next_station = "회로과";
                                        else if(tb_next_station == "회로과") next_station = "통신과";

                                        var sql = "update Bus_Info set now_station='" + tb_next_station +"', next_station='" + next_station + "' where ID=" + bus_id;
                                        school_bus.query(sql, function(err, result, fields) {
                                            if(!err) {
                                                console.log("[#] 버스 정류장의 도착 정보를 적용했습니다.");
                                                socket.write("true");
                                            }
                                            else {
                                                console.log("[!] 버스 정류장의 도착 정보를 적용하지 못했습니다. 에러 코드 : 48");
                                                console.log(err);
                                                socket.write("false");
                                            }
                                        });
                                    }
                                    else {
                                        console.log("[!] 데이터를 불러오지 못했습니다. 에러 코드 : 48");
                                        socket.write("false");
                                    }
                                })
                            }
                            else {
                                console.log("[!] 버스 정류장의 도착 정보를 적용하지 못했습니다. 에러 코드 : 47");
                                socket.write("false");
                            }
                        })
                    }
                    else if(command[1] == "get") {
                        if(command[2] == "bus_info") {
                            var num = command[3];
                            var sql = "select * from Bus_Info where ID=" + num;
                            school_bus.query(sql, function(err, result, fields){
                                if(!err) {
                                    var send = JSON.stringify(result);
                                    socket.write(send);
                                }
                                else {
                                    console.log("[!] 버스 정보를 불러오지 못했습니다. 에러 코드 : 49");
                                    socket.write("false");
                                }
                            });
                        }
                        else if(command[2] == "distance") {
                            var sql = "select * from Bus_Distance";
                            school_bus.query(sql, function(err, result, fields){
                                if(!err) {
                                    var send = JSON.stringify(result);
                                    socket.write(send);
                                }
                                else {
                                    console.log("[!] 버스 정보를 불러오지 못했습니다. 에러 코드 : 50");
                                    socket.write("false");
                                }
                            })
                        }
                    }

                }
                else if(command[0] == "board") {
                    var sql = "select * from server_time";
                    school_data.query(sql, function(err, result, fields) {
                        if(!err) {
                            var year = result[0].year;
                            var month = result[0].month;
                            var day = result[0].day;

                            var date = year + "." + month + "." + day;
                            if(command[1] == "upload") {
                                var editor = command[2];
                                var dataSplit = temp.split('&');
                                var title = dataSplit[1];
                                var text = dataSplit[2];
        
                                var sql = "insert into School_board (title, date, editor) values ('" + title + "', '" + date + "', '" + editor + "')";
                                school_data.query(sql, function(err, result, fields) {
                                    if(!err) {""
                                        var fileName = date + "_" + editor + "_" + title;
                                        fs.writeFile("board/" + fileName, text, 'utf8', function(err) {
                                            if(!err) {
                                                socket.write("true");
                                                console.log("[#] 새로운 가정통신문을 등록하는데 성공했습니다. 작성자 : " + editor);
                                            }
                                            else {
                                                socket.write("[!] 가정통신문을 추가할 수 없습니다. 에러 코드 : 35");
                                                console.log("[!] 가정통신문을 추가할 수 없습니다. 에러 코드 : 35");
                                                console.log(err);
                                            }
                                        })
                                    }
                                    else {
                                        socket.write("[!] 가정통신문을 추가할 수 없습니다. 에러 코드 : 34");
                                        console.log("[!] 가정통신문을 추가할 수 없습니다. 에러 코드 : 34");
                                        console.log(err);
                                    }
                                })
                            }
                            else if(command[1] == "get") {
                                if(command[2] == "text") {
                                    var num = command[3];
                                    var sql = "select * from School_board where num=" + num;
                                    school_data.query(sql, function(err, result, fields){
                                        if(!err && result != null) {
                                            var title = result[0].title;
                                            var date = result[0].date;
                                            var editor = result[0].editor;

                                            var fileName = date + "_" + editor + "_" + title;
                                            fs.readFile("board/" + fileName, 'utf8', function(err, data) {
                                                if(!err) {
                                                    socket.write(data);
                                                    console.log("[#] 게시물을 성공적으로 읽었습니다. 작성자 : " + editor);
                                                }
                                                else {
                                                    socket.write("[!] 게시물을 읽을 수 없습니다. 에러 코드 : 38");
                                                    console.log("[!] 게시물을 읽을 수 없습니다. 에러 코드 : 38")
                                                }
                                            })
                                        }
                                        else {
                                            socket.write("[!] 찾을 수 없는 가정통신문입니다. 에러 코드 : 37");
                                            console.log("[!] 찾을 수 없는 가정통신문입니다. 에러 코드 : 37");
                                            console.log(err);
                                        }
                                    })
                                }
                                else if(command[2] == "list") {
                                    var sql = "select * from School_board";
                                    school_data.query(sql, function(err, result, fields) {
                                        if(!err && result != null) {
                                            var send = JSON.stringify(result);
                                            socket.write(send);
                                            console.log("[#] 가정통신문 리스트를 성공적으로 전송했습니다.");
                                        }
                                        else {
                                            socket.write("[!] 등록된 가정통신문이 없거나 쿼리문에 에러가 있습니다. 에러 코드 : 36");
                                            console.log("[!] 등록된 가정통신문이 없거나 쿼리문에 에러가 있습니다. 에러 코드 : 36");
                                        }
                                    });
                                }
                                else if(command[2] == "search") {
                                    if(command[3] == "title") {
                                        var data = temp.split('&');
                                        var search_data = data[1];

                                        var sql = "select * from School_board where title like '%" + search_data + "%'";
                                        school_data.query(sql, function(err, result, fields) {
                                            if(!err && result != null) {
                                                var send = JSON.stringify(result);
                                                socket.write(send);
                                            }
                                            else {
                                                socket.write("false");
                                                console.log("[!] 데이터를 검색할 수 없습니다. 에러 코드 : 39");
                                            }
                                        })

                                    }
                                    else if(command[3] == "editor") {
                                        var data = temp.split('&');
                                        var search_data = data[1];

                                        var sql = "select * from School_board where editor like '%" + search_data + "%'";
                                        school_data.query(sql, function(err, result, fields) {
                                            if(!err && result != null) {
                                                var send = JSON.stringify(result);
                                                socket.write(send);
                                            }
                                            else {
                                                socket.write("false");
                                                console.log("[!] 데이터를 검색할 수 없습니다. 에러 코드 : 40");
                                            }
                                        })
                                    }
                                }
                            }
                        }
                        else {
                            console.log("[!] 시간 정보를 불러올 수 없습니다. 에러 코드 : 33");
                            console.log(err);
                            socket.write("[!] 시간 정보를 불러올 수 없습니다. 에러 코드 : 33");
                        }
                    })
                }
                else if(command[0] == "attendance") {
                    if(command[1] == "get") {
                        var student_name = command[2];
                        var sql = "select * from Student_user where name='" + student_name +"'";

                        school_data.query(sql, function(err, result, fields) {
                            if(!err && result[0] != null) {
                                var student_num = result[0].num;

                                var sql = "select * from server_time";
                                school_data.query(sql, function(err, result, fields) {
                                    if(!err) {
                                        var year = result[0].year;
                                        var month = result[0].month;
                                        var day = result[0].day;
                                        var week = result[0].week;
                                        var classTime = result[0].classTime;

                                        var date = year + "." + month + "." + day;
                                        var sql = "select * from S_" + student_num +" where date='" + date +"' and day='" + week +"' and time=" + classTime;
                                        student_attendance.query(sql, function(err, result, fields) {
                                            if(!err && result[0] != null) {
                                                var send = "" + result[0].state;
                                                socket.write(send);
                                                console.log("[#] " + student_name + " 학생의 출석 상태를 불러왔습니다.");
                                            }
                                            else {
                                                console.log("[!] 불러올 수 없는 데이터이거나 쿼리문에 에러가 있습니다. 에러 코드 : 41");
                                                socket.write("[!] 불러올 수 없는 데이터이거나 쿼리문에 에러가 있습니다. 에러 코드 : 41");
                                            }
                                        })
                                    }
                                    else {
                                        console.log("[!] 불러올 수 없는 데이터이거나 쿼리문에 에러가 있습니다. 에러 코드 : 40");
                                        socket.write("[!] 불러올 수 없는 데이터이거나 쿼리문에 에러가 있습니다. 에러 코드 : 40");
                                    }
                                })
                            }
                            else {
                                console.log("[!] 불러올 수 없는 데이터이거나 쿼리문에 에러가 있습니다. 에러 코드 : 39");
                                socket.write("[!] 불러올 수 없는 데이터이거나 쿼리문에 에러가 있습니다. 에러 코드 : 39");
                            }
                        })
                    }
                    else if(command[1] == "change") {
                        var student_name = command[2];
                        var change_state = command[3];

                        var sql = "select * from Student_user where name='" + student_name +"'";
                        school_data.query(sql, function(err, result, fields){
                            if(!err) {
                                var student_num = result[0].num;

                                var sql = "select * from server_time";
                                school_data.query(sql, function(err, result, fields) {
                                    if(!err) {
                                        var year = result[0].year;
                                        var month = result[0].month;
                                        var day = result[0].day;
                                        var week = result[0].week;
                                        var classTime = result[0].classTime;

                                        var date = year + "." + month + "." + day;
                                        var sql = "update S_" + student_num + " set state=" + change_state + " where date='" + date + "' and day='" + week + "' and time='" + classTime +"'";

                                        student_attendance.query(sql, function(err, result, fields) {
                                            if(!err) {
                                                console.log("[#] " + student_name + " 학생의 출석 정보를 업데이트했습니다.");
                                            }
                                            else {
                                                socket.write("false");
                                                console.log("[!] 출석 정보를 업데이트하는데 문제가 발생했습니다. 에러 코드 : 44");
                                                console.log(err);
                                            }
                                        })
                                    }
                                    else {
                                        console.log("[!] 불러올 수 없는 데이터이거나 쿼리문에 에러가 있습니다. 에러 코드 : 43");
                                        socket.write("[!] 불러올 수 없는 데이터이거나 쿼리문에 에러가 있습니다. 에러 코드 : 43");
                                    }
                                })
                            }
                            else {
                                console.log("[!] 불러올 수 없는 데이터이거나 쿼리문에 에러가 있습니다. 에러 코드 : 42");
                                socket.write("[!] 불러올 수 없는 데이터이거나 쿼리문에 에러가 있습니다. 에러 코드 : 42");
                            }
                        })
                    }
                }
                else if (command[0] == "subject") {
                    var name = command[1];

                    var sql = "select * from server_time";
                    school_data.query(sql, function(err, result, feidls) {
                        if(!err) {
                            var week = result[0].week;
                            var classTime = result[0].classTime;

                            var sql = "select * from Student_user where name='" + name +"'";
                            school_data.query(sql, function(err, result, fields) {
                                if(!err) {
                                    var student_num = result[0].num;
                                    var sql = "select class_" + classTime + " from S_" + student_num + " where week='" + week + "'";
                                    student_timetable.query(sql, function(err, result, fields) {
                                        var send = "";
                                        if(classTime == "1") send = result[0].class_1;
                                        else if(classTime == "2") send = result[0].class_2;
                                        else if(classTime == "3") send = result[0].class_3;
                                        else if(classTime == "4") send = result[0].class_4;
                                        else if(classTime == "5") send = result[0].class_5;
                                        else if(classTime == "6") send = result[0].class_6;
                                        else if(classTime == "7") send = result[0].class_7;

                                        socket.write(send);
                                    })
                                }
                            })
                        }
                    })
                }
                else if (command[0] == "uuid") {
                    if (command[1] == "student") {
                        var UUID = command[2];
                        var sql = "select num, name from Student_user where UUID='" + UUID + "'";
                        school_data.query(sql, function(err, result, fields) {
                            if(!err) {
                                if(result[0] != null) {
                                    var send = JSON.stringify(result[0]);
                                    console.log("[!] UUID:" + UUID + " " + result[0].name + " 학생의 정보를 전송했습니다.");
                                    socket.write(send);
                                }
                                else {
                                    console.log("[!] UUID:" + UUID + " 는 등록되지 않은 NFC 입니다.");
                                    socket.write("false");
                                }
                            }
                            else {
                                console.log("[!] 에러가 발생했습니다. 에러 코드 : 52");
                                console.log(err);
                                socket.write("err");
                            }
                        })
                    }
                }
                else if (command[0] == "classroom") {
                    if (command[1] == "get") {
                        if (command[2] == "list") {
                            var sql = "select * from Classroom_data";
                            school_data.query(sql, function(err, result, fields) {
                                if(!err) {
                                    var send = JSON.stringify(result);
                                    socket.write(send);
                                    console.log("[#] 교실 정보를 전송했습니다.");
                                }
                                else {
                                    console.log("[!] 에러가 발생했습니다. 에러 코드 : 54");
                                    socket.write("false");
                                }
                            })
                        }
                    }
                }
                else if (command[0] == "action") {
                    var in_IP = socket.remoteAddress.substring(7);
                    var sql = "select * from classroom_PC where IP='" + in_IP + "'";

                    school_data.query(sql, function(err, result, fields) {
                        if(!err) {
                            var code = result[0].classroom;
                            var sql = ""
                            if (command[1] == "led") {
                                if (command[2] == "front") {
                                    sql = "UPDATE Classroom_data SET led_front='" + command[3] + "'";
                                }
                                else if (command[2] == "back") {
                                    sql = "UPDATE Classroom_data SET led_back='" + command[3] + "'";
                                }

                                console.log("[#] 교실 앞 LED의 설정을 변경했습니다.");
                            }
                            else if (command[1] == "fan"){
                                sql = "UPDATE Classroom_data SET fan='" + command[2] + "'";
                                console.log("[#] 교실 선풍기의 설정을 변경했습니다.");
                            }
                            else if (command[1] == "air"){
                                sql = "UPDATE Classroom_data SET air_conditioner='" + command[2] + "'";
                                console.log("[#] 교실 에어컨의 설정을 변경했습니다.");
                            }

                            sql += " WHERE classroom=" + code;
                            school_data.query(sql);
                        }
                        else {
                            console.log("[!] 등록되지 않은 PC입니다. 에러 코드 : 55");
                        }
                    });
                }
                else if (command[0] == "command") {
                    var send = "";

                    if (command[1] == "led") {
                        if (command[2] == "front") {
                            send = "led front " + command[3];
                        }
                        else if (command[2] == "back") {
                            send = "led back " + command[3];
                        }

                        console.log("[#] 교실 LED를 제어했습니다.");
                    }
                    else if (command[1] == "fan"){
                        send = "fan " + command[2];
                        console.log("[#] 교실 선풍기를 제어했습니다.");
                    }
                    else if (command[1] == "air"){
                        send = "air " + command[2];
                        console.log("[#] 교실 에어컨를 제어했습니다.");
                    }

                    classTable_socket.write(send);
                }
                else{
                    socket.write('[!] 옳지 않은 명령어입니다.');
                }
            }
        });
    });
    
    socket.on('end', function(data){
        console.log('[!] ' + socket.remoteAddress.substring(7) + " 연결이 해제되었습니다.");
    });
    
    socket.on('error', function(err){
       console.log(err); 
    });
})

server.listen(8301, function(){
    console.log("# '192.168.0.4:" + server.address().port +"' 주소로 요청을 대기합니다.");
})
