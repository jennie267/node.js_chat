$(function() {
    // ChatServer 연결  
    var socket = io();
    
    var userId = $("#userId").val();
    var userName = $("#userName").val();
    var projectId = $("#projectId").val();
    var projectName = $("#projectName").val();
    
    
    // 메시지 전송 JSON 통신
    $("#chatsend").click(function (e) {
    	
    	socket.emit("message", {
        //name: $("#name").val(),
        message: $("#message").val(),
        date: new Date().toUTCString()
      });
    	
    	$("#message").val("");
    });
    
    $("#message").keyup(function(e) {
  	  if(e.keyCode == 13) {
  		  $(this).blur();
  		  // SEND 버튼의 클릭 이벤트를 실행한다
  		  $("#chatsend").click();
  		  //$("#message").focus();
  		  }
  	});
    
    console.log("쿠키 읽어지니?" + document.cookies);
    console.log("쿠키 읽어지니?" + document.cookie);
    console.log(document.cookie.userCookie);
    
    /**
     * socket
     */
 // socket에 이벤트 리스너 등록(메시지 수신)
    socket.on("connect",function(){
    });
    
    socket.on("message", function (data) {
    	
      var output = "";
      output += "<li class='right clearfix'>";
      output += "<span class='chat-img pull-right'>";
      output += "<img src='http://placehold.it/50/FA6F57/fff' alt='User Avatar' class='img-circle' />";
      output += "</span>";
      output += "<div class='chat-body clearfix'>";
      output += "<div class='header'>";
      output += "<strong class='primary-font'> "+ userName +"</strong>";
      output += "<small class='pull-right text-muted'>";
      output += "<i class='fa fa-clock-o fa-fw'></i> "+ data.date +" </small></div>";
      output += "    <p>" + data.message + "</p>";
      output += "</div> </li>";

      $(output).appendTo("#content");
      //$("#content").listview("refresh");
      $("#content").trigger("create");
      $('#scrollDiv').scrollTop($('#scrollDiv').prop('scrollHeight'));

    });
    
    

});