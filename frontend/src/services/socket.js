import openSocket from "socket.io-client";

function connectToSocket() {
        const getBackendUrl = () => {
                if (process.env.REACT_APP_BACKEND_URL) {
                        return process.env.REACT_APP_BACKEND_URL;
                }
                if (typeof window !== 'undefined' && window.location.origin) {
                        return window.location.origin;
                }
                return '';
        };
        const backendUrl = getBackendUrl();
        const token = localStorage.getItem("token");

        return openSocket(backendUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 500,
                reconnectionAttempts: 10,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                query: { token }
        });
}

export default connectToSocket;