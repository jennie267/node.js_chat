var express = require('express')
  , session = require('express-session')
  , path = require('path')
  , http = require('http')
  , sassMiddleware = require('node-sass-middleware')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , mysql = require("mysql")
  , fs = require("fs")
  , readline = require("readline")
  , moment = require("moment")
  , Room = require('./room.js');

var app = express();
var server = require('http').createServer(app);

var port = process.env.PORT || 3000;
var io = require('socket.io')(server);
var sessionMiddleware = session({
	  name: 'ObjectChat_session',
	  secret: 'secret',
	  cookie: {maxAge: null},
	  resave: true,
	  saveUninitialized: true
	});
// db연결
var client = mysql.createConnection({
	hostname : "127.0.0.1:3306",
	user : "root",
	password : "root",
	database : "project_asc"
});

var rooms = {};
var userSockets = new Array();

server.listen(port,function(){
	console.log("connect server : " + port);
});

// environments (사용환경)
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(
		  sassMiddleware({
		    src: __dirname + '/sass',
		    dest: __dirname + '/public/stylesheets',
		    outputStyle: 'compressed',
		    prefix:  '/stylesheets'
		  })
		);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,'public')));
app.use(sessionMiddleware);

io.use(function(socket, next){
	  sessionMiddleware(socket.request, socket.request.res, next);
	});

app.get('/chats/:id',function(request,response){
	var fullId = request.params.id;
	var parsedId = fullId.split("_");
	var projectId = fullId[0]; // 프로젝트번호
	var projectName;
	var userId = request.cookies.userIdCookie;
	var userName;
	// rooms[projectId] = new Room(fullId,projectId);
	var clock = moment().format('LLLL');
	
	client.query('SELECT * FROM users WHERE id = ?', userId, function(err, results1) {
		if (err) throw err;
		userName = results1[0].name;
		request.session.username = results1[0].name; // 세션에 이름 저장
		
		
		console.log("[test] 유저 이름 출력 : " + userName);
		console.log("[test] 유저 이름 출력 (세션) : " + request.session.username); 
		
		client.query('SELECT * FROM project_list WHERE project_list_no = ?', projectId, function(err, results2) {
			if (err) throw err;
			
			projectName = results2[0].project_name;
			request.session.projectName = results2[0].project_name; // 세션에 이름 저장
			
			console.log("[test] 프로젝트 이름 출력 : " + projectName);
			console.log("[test] 프로젝트 이름 출력 (세션) : " + request.session.projectName); 
			
			response.render('chatView', {
				  private: true,
				  userName : userName,
				  userId : userId,
				  fullId : fullId,
				  clock : clock,
				  projectId : projectId,
				  projectName : projectName,
				  userSocket : ''
				  });
		});
	});
});

app.get("/minutesDownload/:file",function(request,response){
	var fileName = request.params.file + '.txt';
	console.log("들어오는지 확인" + fileName);
	console.log("들어오는지 확인" + __dirname);
	var filepath = __dirname + '/minutesFile/' + fileName;
	console.log("들어오는지 확인" + filepath);
	response.download(filepath,fileName,function(err){
		if (err) throw err;
	});
});


io.sockets.on('connection',function(socket){
	
	socket.on('join',function(projectId){
		console.log('socket : ' + socket.id);
		socket.join(projectId);
	});
	
	socket.on('enterChatting',function(data){
			console.log("roomNum 방 소켓 접속");
			var roomNum = data.projectId;
			var fullId = data.fullId;
			var userId = data.userId;
			var userName = data.userName;
			var userSocket = data.userSocket;
			console.log("값 넘어오는지 확인 : " + roomNum + fullId + userId + userName + userSocket);
			
			socket.userId = userId;
			socket.userName = userName;
			socket.roomNum = roomNum;
			
			if(rooms[roomNum] === undefined) {
				console.log("새 방 팝니다. 방 번호 =" + roomNum );
				rooms[roomNum] = new Room(fullId,roomNum);
			} else {
			console.log("roomNum 소켓 접속 방 이미 있음");
			}
			
			if (!rooms[roomNum].contains(userName)) {
				
				socket.broadcast.to(roomNum).emit('addUserProfile',{
					userName : userName
				});
			}
			++rooms[roomNum].numUsers;
			
			rooms[roomNum].addMember(userName);	
			updateSidebar(socket);
			
			userSockets.push(userSocket);
			console.log(userSockets);
			
			msg = { 
					noticeEnter : userName + "님이 입장하셨습니다."
					};
			io.sockets.in(roomNum).emit('noticeMessageEnter',msg);
			
			try{
			    fs.mkdirSync('chatting');
			}catch(e){
			    if ( e.code != 'EEXIST' ) throw e; // 존재할경우 패스처리함.
			}
			try{
			    fs.mkdirSync('minutesFile');
			}catch(e){
			    if ( e.code != 'EEXIST' ) throw e; // 존재할경우 패스처리함.
			}
			
			var fileName = 'chatting/ChatContent_'+roomNum+'.txt';
			var fileName2 = 'minutesFile/minutes_'+roomNum+'_'+userName+'.txt';
			var text = "";
			 
			 fs.appendFile(fileName,text,'utf8',function(err){
				 if (err) throw err;
				 console.log("채팅 파일에 쓰기 테스트");
			 });
			 fs.appendFile(fileName2,text,'utf8',function(err){
				 if (err) throw err;
				 console.log("회의록 파일에 쓰기 테스트1");
			 });
		});
		
	function updateSidebar(socket){
		var roomNum = socket.roomNum;
		for (var user in rooms[roomNum].members) {
		    socket.emit('addUserProfile', {
		      userName: user
		    });
		  }
	}
	
	
	socket.on('sendMessage',function(data){
		 var roomNum = socket.roomNum;
		 console.log("참여한 사람들.." + userSockets);
		 var clock = moment().format('LLLL');
		 
		 socket.emit('sendMessageMine',{
			 userSockets : userSockets,
			 message : data.message,
			 userName : data.userName,
			 date : clock
		 });
		 
		 socket.broadcast.to(roomNum).emit('sendMessageOthers',{
			 userSockets : userSockets,
			 message : data.message,
			 userName : data.userName,
			 date : clock
		 });
		
		 var fileName = 'chatting/ChatContent_'+roomNum+'.txt';
		 var text = clock +"///"+ data.userName + "///"  + data.message + "\n";
		 
		 fs.appendFile(fileName,text,'utf8',function(err){
			 if (err) throw err;
			 console.log("파일에 쓰기 테스트 message");
		 });
		 
	});
	
	socket.on('typing', function(){
		var roomNum = socket.roomNum;
		var userName = socket.userName;
		socket.broadcast.to(roomNum).emit('typing', {
	      userName: userName
	    });
	  });
	
	  socket.on('stop typing', function(){
		var roomNum = socket.roomNum;
		var userName = socket.userName;
	    socket.broadcast.to(roomNum).emit('stop typing', {
	      userName : userName
	    });
	  });
	
	socket.on('disconnect',function(){
		var userName = socket.userName;
		var roomNum = socket.roomNum;
		socket.leave(roomNum);
		--rooms[roomNum].numUsers;
		rooms[roomNum].removeMember(socket.userId);
		msg = { 
				noticeExit : userName + "님이 퇴장하셨습니다."
				};
		socket.broadcast.to(roomNum).emit('noticeMessageExit',msg);
	});
	
	socket.on('loadContent',function(){
		var roomNum = socket.roomNum;
		var fileName = 'chatting/ChatContent_'+roomNum+'.txt';
		
		var rl = readline.createInterface({
			input : fs.createReadStream(fileName)
		});
		
		rl.on('line',function(line){
			console.log("파일 읽기 테스트...");
			var splitedContent = line.split("///");
			var date = splitedContent[0];
			var userName = splitedContent[1];
			var message = splitedContent[2];
			io.sockets.in(roomNum).emit('loadContent',{
				date : date,
				userName : userName,
				message : message
			});
		});
	});
	
	socket.on('chatMemoSave',function(data){
		var projectName = data.projectName;
		var userName = data.userName;
		var minutes = data.minutes;
		var date = data.date;
		var roomNum = socket.roomNum;
		var text = minutes;
		var fileName = 'minutesFile/minutes_'+roomNum+'_'+userName+'.txt';
		 
		 fs.writeFile(fileName,text,'utf8',function(err){
			 if (err) throw err;
			 console.log("회의록 내용 파일에 쓰기 테스트2");
		 });
	});
	
	
});


