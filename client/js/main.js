'use strict';

// let urlSocketServer = 'wss://trustkeys.network'
let urlSocketServer = 'ws://127.0.0.1:5000'
let roomID;
let localStream;
let remoteStream = new MediaStream();
let peerConnection;
const configuration = {iceServers: [
    {
       urls: ["turn:trustkeys.network:3478?transport=udp"],
       username: "trustkeys",
       credential: "123456"
   },
  { urls: "stun:stun.1.google.com:19302" },
],
}

const mediaStreamConstrains = {
    'audio' : {'echoCancellation':true},
    // 'video' : {
    //     cursor: 'always' | 'motion' | 'never',
    //     displaySurface: 'application' | 'browser' | 'monitor' | 'window'
    // }
    'video' : true,
};


navigator.mediaDevices.getUserMedia(mediaStreamConstrains).then(gotLocalMediaStream).catch(handleLocalMediaStreamError);

function gotLocalMediaStream(mediaStream){
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
}

function handleLocalMediaStreamError(error){
    console.log('navigator.getUserMedia error:',error)
}

const btnJoinRoomButton = document.getElementById('joinRoomButton')
const btnCall = document.getElementById('callButton')
const btnHangup = document.getElementById('hangupButton')
const localVideo = document.getElementById('localVideo')
const remoteVideo = document.getElementById('remoteVideo')

btnCall.disabled = true
btnHangup.disabled = true
btnJoinRoomButton.disabled = true 
remoteVideo.srcObject = remoteStream

let socket = io(urlSocketServer, {transports: ['websocket'],path:'/wsdev'});
socket.on('connect',()=>{
    alert("Connect to " + urlSocketServer +" success!")
    console.log('socketID:',socket.io.engine.id)
    btnJoinRoomButton.disabled = false
});

socket.on('connect_error',(error)=>{
    alert("Connect to " + urlSocketServer + " " + error)
})

socket.on('disconnect',(reason)=>{
    alert("Connect to " + urlSocketServer + " " + reason )
    if (reason === 'io server disconnect'){
        socket.connect()
    }
})

socket.on('created_room',(roomid)=>{
    alert("Bạn đã tạo phòng " + roomid)
})

socket.on('joined_room',(roomid)=>{
    alert("Bạn đã tham gia phòng " + roomid)
   
})

socket.on('message', async (message)=>{
    console.log("receved message",message)
    if (message.type === 'answer') {
        console.log('answer message of room',message.RoomID)
        var obj = JSON.parse(message.data)
        const remoteDesc = new RTCSessionDescription(obj)
        await peerConnection.setRemoteDescription(remoteDesc);
    }else if (message.type === 'offer') {
        console.log("offer message of room",message.RoomID)
        var obj = JSON.parse(message.data)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(obj))
        const answer = await  peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('message',{
            roomID : roomID,
            type : 'answer',
            data : JSON.stringify(answer),
        })
    }else if (message.type === 'candidate'){
        console.log('candidate message of room',message.roomID)
        try{
           var obj =  JSON.parse(message.data)
          await  peerConnection.addIceCandidate(new RTCIceCandidate(obj));
        }catch(e){
            console.log('Error adding received ice candidate',e)
        }
    }
})

socket.on('room_ready',(roomid)=>{
    alert("Phòng " + roomid+ " đã sẵn sàng cho cuộc gọi")
    roomID = roomid
    btnCall.disabled = false
    console.log("peerconnection is ",peerConnection)
    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.addEventListener('icecandidate', (event)=>{  
        if ( event.candidate ){
            console.log('icecandidate la',event.candidate)
            socket.emit('message',{
                roomID : roomID,
                type : 'candidate',
                data : JSON.stringify(event.candidate),                
            })
        }  
    })
    
    peerConnection.addEventListener('connectionstatechange',(event)=>{
        if (peerConnection.connectionState === 'connected'){
            console.log('connection connected')
        }
    })
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
   
    peerConnection.addEventListener('track',(event)=>{
        remoteStream.addTrack(event.track,remoteStream)
        remoteVideo.srcObject = remoteStream
    })

})
socket.on('room_full',(roomID)=>{
    alert("Phòng " + roomID + " đã đầy")
})



btnJoinRoomButton.onclick = ()=>{
    roomID = document.getElementById('txtRoomID').value
    console.log("User join roomID",roomID)
    socket.emit('join',roomID)
}






btnCall.onclick = async () => {
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('message',{
        roomID : roomID,
        type : 'offer',
        data : JSON.stringify(offer),
    })

}



