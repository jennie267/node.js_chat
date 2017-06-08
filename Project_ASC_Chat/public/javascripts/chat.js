$(function() {
	
    // ChatServer 연결  
    var socket = io();
    
    var userId = $("#userId").val();
    var userName = $("#userName").val();
    var projectId = $("#projectId").val();
    var projectName = $("#projectName").val();
    var fullId = $("#fullId").val();
    var userSocket = $("#userSocket").val();
    var $users = $('.users');
    
    var COLORS = ['pink darken-1', 'indigo',
        'deep-orange darken-1', 'blue darken-2',
        'deep-purple', 'purple darken-1',
        'red darken-3','light-blue lighten-1'];
    var COLORS_TEXT = ['pink-text darken-1', 'indigo-text',
             'deep-orange-text darken-1', 'blue-text darken-2',
             'deep-purple-text', 'purple-text darken-1',
             'red-text darken-3', 'light-blue-text lighten-1'];
    var TYPING_TIMER = 500;
    var typing = false;
    var lastTypingTime;
    var canAddType = true;
    
    
    
    
    /**
     * 뷰 이벤트
     */
    
    socket.emit('loadContent');
    
    // 메시지 전송버튼 클릭 이벤트 (JSON 통신)
    $("#chatsend").click(function (e) {
    	
    	socket.emit("sendMessage", {
        //name: $("#name").val(),
    	projectId : projectId,
    	userName : userName,
        message: $("#messageInput").val()
      });
    	
    	$("#messageInput").val("");
    });
    
    // 메세지 엔터버튼
    $("#messageInput").keyup(function(e) {
  	  if(e.keyCode == 13) {
  		  $(this).blur();
  		  // SEND 버튼의 클릭 이벤트를 실행한다
  		  $("#chatsend").click();
  		  //$("#message").focus();
  		  }
  	});
    
    $("#messageInput").keydown(function(e){
    	updateTyping();
    });
    
    function updateTyping() {
        if (!typing) {
          typing = true;
          socket.emit('typing');
          console.log("쓰는중");
        }
        lastTypingTime = (new Date).getTime();
        setTimeout(function(){
          var timer = (new Date).getTime();
          var timeDiff = timer - lastTypingTime;
          if (timeDiff >= TYPING_TIMER && typing) {
        	  console.log("멈춤");
            socket.emit('stop typing');
            typing = false;
          }
        }, TYPING_TIMER);
      }
    
    $("#minutesSave").click(function(){
    	console.log("저장하기 누름");
    	socket.emit("chatMemoSave", {
    		projectName : projectName,
        	userName : userName,
        	minutes: $("#chatMemo").val(),
            date: new Date().toUTCString()
          });
    });
    
    $("#minutesDownload").click(function(){
    	console.log("다운로드 누름");
    	var url = "/minutesDownload/minutes_" + projectId + "_" + userName;  
        window.open(url, "_blank");
    });
    
    $("#notification").click(function(){
    	console.log("알림온 클릭");
    	//데스크탑 알림 권한 요청
        Notification.requestPermission(function (result) {

        //요청을 거절하면,
        if (result === 'denied') {
           return;
         }
        //요청을 허용하면,
        else {
           //데스크탑 알림 권한 요청 버튼을 비활성화
        	$("#notification").attr('disabled', 'disabled');
           return;
         }
      });
    });
    
    /**
     * socket
     */
 // socket에 이벤트 리스너 등록(메시지 수신)
    socket.on("connect",function(){
    	userSocket = socket.id;
    	socket.emit("join",projectId);
    	socket.emit("enterChatting",{
    		fullId : fullId,
    		projectId : projectId,
    		projectName : projectName,
    		userId : userId,
    		userName : userName,
    		userSocket : userSocket
    	});
    
    socket.on("sendMessageOthers",function(data){
    	var userSockets = data.userSockets;
    	console.log(userSockets);
    	console.log("뷰에서의 소켓아이디 : "+socket.id);
    	var output = "";
    	output += "<li class='left clearfix'>";
	      output += "<span class='chat-img pull-left'>";
	      output += "<img src='http://placehold.it/50/55C1E7/fff' alt='User Avatar' class='img-circle' />";
	      output += "</span>";
	      output += "<div class='chat-body clearfix'>";
	      output += "<div class='header'>";
	      output += "<strong class='primary-font'> "+ data.userName +"</strong>";
	      output += "<small class='pull-right text-muted'>";
	      output += "<i class='fa fa-clock-o fa-fw'></i> "+ data.date +" </small></div>";
	      output += "    <p>" + data.message + "</p>";
	      output += "</div> </li>";
	      $(output).appendTo("#content");
	        //$("#content").listview("refresh");
	        $("#content").trigger("create");
	        $('#scrollDiv').scrollTop($('#scrollDiv').prop('scrollHeight'));
    });
    
    socket.on("sendMessageMine",function(data){
    	var userSockets = data.userSockets;
    	console.log("뷰에서의 소켓아이디 : "+socket.id);
    	var output = "";
    	output += "<li class='right clearfix'>";
	      output += "<span class='chat-img pull-right'>";
	      output += "<img src='http://placehold.it/50/FA6F57/fff' alt='User Avatar' class='img-circle' />";
	      output += "</span>";
	      output += "<div class='chat-body clearfix'>";
	      output += "<div class='header'>";
	      output += "<strong class='primary-font'> "+ data.userName +"</strong>";
	      output += "<small class='pull-right text-muted'>";
	      output += "<i class='fa fa-clock-o fa-fw'></i> "+ data.date +" </small></div>";
	      output += "    <p>" + data.message + "</p>";
	      output += "</div> </li>";
	      $(output).appendTo("#content");
	        //$("#content").listview("refresh");
	        $("#content").trigger("create");
	        $('#scrollDiv').scrollTop($('#scrollDiv').prop('scrollHeight'));
    });
    
    socket.on('typing',function(data){
    	addTypingMessage(data.userName);
    });
    
    function addTypingMessage(userName) {
    	var msg = "님이 채팅메세지를 입력중입니다..";
    	var $el = $('<small class="notification typing" id="messageStatus">'
    			    + "&nbsp;&nbsp;&nbsp;&nbsp;" +userName
    			    + msg + '</small><br>' );
    	$el.data('userName',userName);
    	setTimeout(100,postMessage($el));
    	$(".user-list").height(462);
    }
    
    function postMessage(el) {
    	var $el = $(el);
    	$("#messageStatus").html($el);
    }
    
    socket.on("stop typing",function(data){
    	removeTypingMessage(data.userName);
    });
    
    function removeTypingMessage(userName) {
    	canAddType = false;
    	$('.typing').filter(function(i){
    		return $(this).data('userName') === userName;
    	}).fadeOut(100,function(){
    		$(this).remove();
    	});
    }
    
    socket.on('loadContent',function(data){
    	loadContent(data);
    });
    
    function loadContent(data) {
    	var output = "";
    	if(userName === data.userName) {
          output += "<li class='right clearfix'>";
  	      output += "<span class='chat-img pull-right'>";
  	      output += "<img src='http://placehold.it/50/FA6F57/fff' alt='User Avatar' class='img-circle' />";
  	      output += "</span>";
  	      output += "<div class='chat-body clearfix'>";
  	      output += "<div class='header'>";
  	      output += "<strong class='primary-font'> "+ data.userName +"</strong>";
  	      output += "<small class='pull-right text-muted'>";
  	      output += "<i class='fa fa-clock-o fa-fw'></i> "+ data.date +" </small></div>";
  	      output += "    <p>" + data.message + "</p>";
  	      output += "</div> </li>";
  	      $(output).appendTo("#content");
    	}
    	else {
    	  output += "<li class='left clearfix'>";
  	      output += "<span class='chat-img pull-left'>";
  	      output += "<img src='http://placehold.it/50/55C1E7/fff' alt='User Avatar' class='img-circle' />";
  	      output += "</span>";
  	      output += "<div class='chat-body clearfix'>";
  	      output += "<div class='header'>";
  	      output += "<strong class='primary-font'> "+ data.userName +"</strong>";
  	      output += "<small class='pull-right text-muted'>";
  	      output += "<i class='fa fa-clock-o fa-fw'></i> "+ data.date +" </small></div>";
  	      output += "    <p>" + data.message + "</p>";
  	      output += "</div> </li>";
  	      $(output).appendTo("#content");
    	}
    	$('#scrollDiv').scrollTop($('#scrollDiv').prop('scrollHeight'));
    }
    
    socket.on('addUserProfile', function(data){
        addUserToList(data.userName);
      });
    
    function addUserToList(userName) {
        var initial = userName.charAt(0);
        var $li = $(
                '<li class="user-preview">' +
                  '<div class="circle-preview ' + userColor(userName, false) + '">'
                  + initial +                  
                  '</div>' +
                  '<p>' + userName + '</p>' +
                '</li>'
              );
        $li.data('userName', userName);
        $users.append($li);
        $users[0].scrollTop = $users[0].scrollHeight;
      }
    
    function userColor(user, forText) {
        var hash = 2;
        for (var i = 0; i < user.length; i++) {
          hash = user.charCodeAt(i) + (hash<<2);
        }
        var index = hash % COLORS.length;
        if (forText)
          return COLORS_TEXT[index];
        return COLORS[index];
      }
    
    socket.on('user left', function(data){
        removeUserFromList(data.userName);
      });
    
    function removeUserFromList(userName) {
        $('.user-preview').filter(function(i){
          return $(this).data('userName') === userName;
        }).remove();
      }
    
    socket.on('deskNotification',function(data){
    	console.log("알림 소켓 뷰 확인");
    	var message = data.message;
    	var userName = data.userName;
    	var date = data.clock;
    	console.log("알림소켓 값 확인" + userName + message + date);
    	var icon = "/images/noimage.png";
    	
        if (message !== null && message.length > 0) {
            
            var options = {
                body : userName + " : " + message,
                icon : icon
            }
           
            //데스크탑 알림 요청
            var notification = new Notification(projectName+"의 채팅 알림", options);
            
            //알림 후 5초뒤 닫힘
            setTimeout(function () {
                notification.close();
            }, 5000);
        }
    });
    
   }); // connect
    

});