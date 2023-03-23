import "./App.css";
import github from "./assets/github.png";
import linkedin from "./assets/linkedin.png";
import send from "./assets/send.png";
import cam from "./assets/video-camera.png";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "./socketContext";
import { usePeer } from "./peerContext";
import ReactPlayer from "react-player";
import moment from "moment/moment";
import Lottie from "react-lottie";
import spinner from "./assets/spinner.json";
import change from "./assets/refresh-arrow.png";

function App() {
  const { socket } = useSocket();
  const {
    peer,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    sendStream,
    remoteStream,
    setMyStream,
    setRemoteStream,
  } = usePeer();

  const [room, setRoom] = useState("");
  const [video, setVideo] = useState();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatReveal, setChatReveal] = useState(false);

  const handleConnect = useCallback(() => {
    socket.emit("find-stranger");
  }, [socket]);

  const handleStrangerConnection = useCallback(
    async ({ room }) => {
      setRoom(room);
      console.log("room", room, " - ", socket.id);

      if (room.split("@")[0] === socket.id) {
        const offer = await createOffer();
        console.log("offer", offer);
        socket.emit("call-user", { offer, room });
        sendStream(video);
      }
    },
    [createOffer, sendStream, socket, video]
  );

  const handleIncommingCall = useCallback(
    async (offer) => {
      console.log("offer recieved", offer);
      const answer = await createAnswer(offer);
      console.log("answer", answer, room);
      socket.emit("call-accepted", { answer, room });
    },
    [createAnswer, room, socket]
  );

  const handleCallAccepted = useCallback(
    async (answer) => {
      console.log("answer recieved", answer);
      await setRemoteAnswer(answer);
      // sendStream(video);
    },
    [setRemoteAnswer]
  );

  const getUserMediaStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    if (stream) {
      setMyStream(stream);
      setVideo(stream);
    }
  }, [setMyStream]);

  const handleNewMessage = useCallback((message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    // socket.leave(room);
    setRemoteStream(null);
    setRoom("");
    setMessages([]);
  }, [setRemoteStream]);

  useEffect(() => {
    console.log("remoteTS", remoteStream);
  }, [remoteStream]);

  useEffect(() => {
    socket.on("connect", handleConnect);
    socket.on("stranger-connected", handleStrangerConnection);
    socket.on("incomming-call", handleIncommingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("new-message", handleNewMessage);
    socket.on("leave-room", handleLeaveRoom);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("stranger-connected", handleStrangerConnection);
      socket.off("incomming-call", handleIncommingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("new-message", handleNewMessage);
      socket.off("leave-room", handleLeaveRoom);
    };
  }, [
    handleCallAccepted,
    handleConnect,
    handleIncommingCall,
    handleLeaveRoom,
    handleNewMessage,
    handleStrangerConnection,
    socket,
  ]);

  useEffect(() => {
    getUserMediaStream();
  }, [getUserMediaStream]);

  const handleNegotiation = useCallback(async () => {
    console.log("nego");
    if (room.split("@")[0] === socket.id) {
      const localOffer = await createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true,
      });
      console.log("local", localOffer);
      socket.emit("call-user", { offer: localOffer, room });
    }
  }, [createOffer, room, socket]);

  useEffect(() => {
    peer.addEventListener("negotiationneeded", handleNegotiation);
    if (peer.iceConnectionState === "checking") {
      handleNegotiation();
    }

    return () => {
      peer.removeEventListener("negotiationneeded", handleNegotiation);
    };
  }, [handleNegotiation, peer]);

  const sendMessage = useCallback(() => {
    const msg = {
      text: message,
      time: new Date(),
      sender_id: socket.id,
    };
    socket.emit("send-message", { msg, room });
    setMessage("");
  }, [message, room, socket]);

  const mappedMessages = messages.map((message) => (
    <div className="chat">
      <p>
        {socket.id === message.sender_id ? "You" : "Stranger"}{" "}
        <span>{moment(message.time).format("hh:mm a")}</span>
      </p>
      <span>{message.text}</span>
    </div>
  ));

  const changePal = useCallback(() => {
    socket.emit("change-stranger", room);
  }, [room, socket]);

  return (
    <div className="App">
      <nav>
        <h2>
          <img src={cam} alt="" />
          VideoPal
        </h2>
        <div className="right">
          <a
            href="https://github.com/aannaassalam/ShrinkIt"
            target="_blank"
            rel="noreferrer"
          >
            <img src={github} alt="" />
            <span>Github</span>
          </a>
          <a
            href="https://www.linkedin.com/in/anas-alam-0207331b2/"
            target="_blank"
            rel="noreferrer"
          >
            <img src={linkedin} alt="" />
            <span>Anas Alam</span>
          </a>
        </div>
      </nav>

      <main>
        <div className="myVideo">
          {video && (
            <ReactPlayer url={video} playing height="100%" width="100%" />
          )}
        </div>
        <div className={room ? "strangerVideo" : "strangerVideo no-video"}>
          {room ? (
            <>
              <button onClick={changePal} className="change-btn">
                <img src={change} alt="change" title="Change Pal" />
              </button>
              <ReactPlayer
                url={remoteStream}
                playing
                height="100%"
                width="100%"
              />
            </>
          ) : (
            <>
              <p>Waiting for lonely Pal</p>
              <Lottie
                options={{ animationData: spinner, autoplay: true, loop: true }}
                width={100}
                height={100}
              />
            </>
          )}
        </div>
        <div
          className={chatReveal ? "chat-section reveal" : "chat-section hidden"}
        >
          <h3 onClick={() => setChatReveal((prev) => !prev)}>Chat Section</h3>

          <div className="chat-div">
            {(mappedMessages.length && mappedMessages) || (
              <h4>Start the conversation by sending a message!</h4>
            )}
          </div>
          <div className="input-message">
            <input
              type="text"
              placeholder="Send Message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>
              <img src={send} alt="" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
