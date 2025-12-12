import openSocket from "socket.io-client";

function connectToSocket() {
	const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

	return openSocket(backendUrl, {
		transports: ['websocket', 'polling'],
		reconnection: true,
		reconnectionDelay: 500,
		reconnectionAttempts: 10
	});
}

export default connectToSocket;