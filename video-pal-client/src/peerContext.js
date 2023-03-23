import React, { useCallback, useEffect, useMemo, useState } from "react";

const PeerContext = React.createContext(null);

export const usePeer = () => React.useContext(PeerContext);

export const PeerProvider = (props) => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [myStream, setMyStream] = useState(null);

  const peer = useMemo(() => new RTCPeerConnection(), []);

  const createOffer = async () => {
    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peer.setLocalDescription(new RTCSessionDescription(offer));
    return offer;
  };

  const createAnswer = async (offer) => {
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(new RTCSessionDescription(answer));
    return answer;
  };

  const setRemoteAnswer = async (answer) => {
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const sendStream = useCallback(
    async (stream) => {
      try {
        for (const track of stream.getTracks()) {
          peer.addTrack(track, stream);
        }
      } catch (err) {}
    },
    [peer]
  );

  const handleTrackEvent = useCallback((e) => {
    const streams = e.streams;
    if (streams && setRemoteStream) setRemoteStream(streams[0]);
  }, []);

  console.log("out ", peer.iceGatheringState);
  console.log("out ", peer.iceConnectionState);
  console.log("out ", peer.connectionState);

  // const handleIceState = useCallback(() => {
  //   console.log(peer.iceGatheringState);
  //   console.log(peer.iceConnectionState);
  //   console.log(peer.connectionState);

  // }, [
  //   myStream,
  //   peer.connectionState,
  //   peer.iceConnectionState,
  //   peer.iceGatheringState,
  //   sendStream,
  // ]);

  useEffect(() => {
    peer.addEventListener("track", handleTrackEvent);
    // peer.addEventListener("icegatheringstatechange", handleIceState);
    console.log(peer.iceGatheringState);
    console.log(peer.iceConnectionState);
    console.log(peer.connectionState);
    if (myStream) {
      console.log("see");
      sendStream(myStream);
    }
    return () => {
      peer.removeEventListener("track", handleTrackEvent);
      // peer.removeEventListener("icegatheringstatechange", handleIceState);
      // peer.close();
    };
  }, [
    handleTrackEvent,
    myStream,
    peer,
    sendStream,
    peer.iceConnectionState,
    peer.iceGatheringState,
    peer.connectionState,
  ]);

  return (
    <PeerContext.Provider
      value={{
        peer,
        createOffer,
        createAnswer,
        setRemoteAnswer,
        sendStream,
        setMyStream,
        remoteStream,
        setRemoteStream,
      }}
    >
      {props.children}
    </PeerContext.Provider>
  );
};
