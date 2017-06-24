var express = require('express')
  , session = require('express-session')
  , path = require('path')
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

server.listen(port,function(){
	//서버 연결
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

/**
 * /chats/:id 설정 (id = 프로젝트번호_uuid)
 */
app.get('/chats/:id',function(request,response){
	var fullId = request.params.id;
	var parsedId = fullId.split("_");
	var projectId = fullId[0]; // 프로젝트번호
	var projectName;
	var userId = request.cookies.userIdCookie;
	var userName;
	var clock = moment().format('LLLL');
	
	client.query('SELECT * FROM users WHERE id = ?', userId, function(err, results1) {
		if (err) throw err;
		userName = results1[0].name;
		request.session.username = results1[0].name; // 세션에 이름 저장
		
		
		
		client.query('SELECT * FROM project_list WHERE project_list_no = ?', projectId, function(err, results2) {
			if (err) throw err;
			
			projectName = results2[0].project_name;
			request.session.projectName = results2[0].project_name; // 세션에 이름 저장
			
			
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

/**
 * /minutesDownload/:file 설정
 */
app.get("/minutesDownload/:file",function(request,response){
	var fileName = request.params.file + '.txt';
	var filepath = __dirname + '/minutesFile/' + fileName;
	response.download(filepath,fileName,function(err){
		if (err) throw err;
	});
});



/**
 * socket
 */
io.sockets.on('connection',function(socket){
	
	/** socket join */
	socket.on('join',function(projectId){
		socket.join(projectId);
	});
	
	/** socket - 채팅방 입장 */
	socket.on('enterChatting',function(data){
			var roomNum = data.projectId;
			var fullId = data.fullId;
			var userId = data.userId;
			var userName = data.userName;
			var userSocket = data.userSocket;
			
			socket.userId = userId;
			socket.userName = userName;
			socket.roomNum = roomNum;
			socket.fullId = fullId;
			
			socket.joinedRoom = true;
			if(!rooms[roomNum]) {
				rooms[roomNum] = new Room(fullId,roomNum);
			} else {
			}
			
			if (!rooms[roomNum].contains(userName)) {
				
				/** socket - 채팅방 입장시 접속자 목록에 추가 */
				socket.broadcast.to(roomNum).emit('addUserProfile',{
					userName : userName
				});
			}
			++rooms[roomNum].numUsers;
			
			rooms[roomNum].addMember(userName);
			/** socket - 채팅방 입장시 접속자 목록에 추가 */
			updateSidebar(socket);
			
			/** chatting 폴더 생성 */
			try{
			    fs.mkdirSync('chatting');
			}catch(e){
			    if ( e.code != 'EEXIST' ) throw e; // 존재할경우 패스처리함.
			}
			/** minutesFile 폴더 생성 */
			try{
			    fs.mkdirSync('minutesFile');
			}catch(e){
			    if ( e.code != 'EEXIST' ) throw e; // 존재할경우 패스처리함.
			}
			
			var fileName = 'chatting/'+fullId+'.txt';
			var fileName2 = 'minutesFile/minutes_'+roomNum+'_'+userName+'.txt';
			var text = "";
			 
			/** 채팅 내용 파일저장 */
			 fs.appendFile(fileName,text,'utf8',function(err){
				 if (err) throw err;
			 });
			 /** 회의록 내용 파일저장 */
			 fs.appendFile(fileName2,text,'utf8',function(err){
				 if (err) throw err;
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
	
	/** socket - 메세지 전송 */
	socket.on('sendMessage',function(data){
		 var roomNum = socket.roomNum;
		 var fullId = socket.fullId;
		 var clock = moment().format('LLLL');
		 
		 /** socket - 본인 채팅 오른쪽 출력 */
		 socket.emit('sendMessageMine',{
			 message : data.message,
			 userName : data.userName,
			 date : clock
		 });
		 
		 /** socket - 다른 사람 채팅 왼쪽 출력 */
		 socket.broadcast.to(roomNum).emit('sendMessageOthers',{
			 message : data.message,
			 userName : data.userName,
			 date : clock
		 });
		 
		 /** socket - 데스크탑 알림 메세지 전송 */
		 socket.broadcast.to(roomNum).emit('deskNotification',{
			 message : data.message,
			 userName : data.userName,
			 date : clock
		 });
		
		 var fileName = 'chatting/'+fullId+'.txt';
		 var text = clock +"///"+ data.userName + "///"  + data.message + "\n";
		 
		 fs.appendFile(fileName,text,'utf8',function(err){
			 if (err) throw err;
		 });
		 
	});
	
	/** socket - 채팅 입력중 */
	socket.on('typing', function(){
		var roomNum = socket.roomNum;
		var userName = socket.userName;
		socket.broadcast.to(roomNum).emit('typing', {
	      userName: userName
	    });
	  });
	
	/** socket - 채팅 입력 멈춤 */
	 socket.on('stop typing', function(){
		var roomNum = socket.roomNum;
		var userName = socket.userName;
	    socket.broadcast.to(roomNum).emit('stop typing', {
	      userName : userName
	    });
	  });
	
	/** socket - 채팅 파일 읽기 */
	socket.on('loadContent',function(){
		var roomNum = socket.roomNum;
		var fullId = socket.fullId;
		var fileName = 'chatting/'+fullId+'.txt';
		
		var rl = readline.createInterface({
			input : fs.createReadStream(fileName)
		});
		
		rl.on('line',function(line){
			var splitedContent = line.split("///");
			var date = splitedContent[0];
			var userName = splitedContent[1];
			var message = splitedContent[2];
			socket.emit('loadContent',{
				date : date,
				userName : userName,
				message : message
			});
		});
	});
	//replaceAll prototype 선언
	String.prototype.replaceAll = function(org, dest) {
	    return this.split(org).join(dest);
	}
	/** socket - 회의록 내용 저장 */
	socket.on('chatMemoSave',function(data){
		var projectName = data.projectName;
		var userName = data.userName;
		var minutes = data.minutes;
		var date = data.date;
		var roomNum = socket.roomNum;
		var text = minutes.replaceAll("\n","\r\n");
		var fileName = 'minutesFile/minutes_'+roomNum+'_'+userName+'.txt';
		 
		 fs.writeFile(fileName,text,'utf8',function(err){
			 if (err) throw err;
		 });
	});

	 /** socket - 채팅방 나감 */
	socket.on('disconnect',function(){
		var userName = socket.userName;
		var roomNum = socket.roomNum;
		if(socket.joinedRoom && rooms[roomNum]){
		var members = rooms[roomNum].members;
		socket.leave(roomNum);
		if (members[userName] === 1) {
		--rooms[roomNum].numUsers;
		rooms[roomNum].removeMember(userName);
		
		/** socket - 채팅방 나가면 접속자 목록에서 삭제 */
		socket.broadcast.to(roomNum).emit('user left', {
	          userName: userName
	        });
		} else {
				members[userName] -= 1;
			    }
		}
	});
	
	
});


