import { createContext } from "react";
import openSocket from "socket.io-client";

const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

class ManagedSocket {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.rawSocket = socketManager.currentSocket;
    this.callbacks = [];
    this.joins = [];

    this.rawSocket.on("connect", () => {
      if (!this.rawSocket.recovered) {
        const refreshJoinsOnReady = () => {
          for (const j of this.joins) {
            console.debug("refreshing join", j);
            this.rawSocket.emit(`join${j.event}`, ...j.params);
          }
          this.rawSocket.off("ready", refreshJoinsOnReady);
        };
        for (const j of this.callbacks) {
          this.rawSocket.off(j.event, j.callback);
          this.rawSocket.on(j.event, j.callback);
        }

        this.rawSocket.on("ready", refreshJoinsOnReady);
      }
    });
  }

  on(event, callback) {
    if (event === "ready" || event === "connect") {
      return this.socketManager.onReady(callback);
    }
    this.callbacks.push({event, callback});
    return this.rawSocket.on(event, callback);
  }

  off(event, callback) {
    const i = this.callbacks.findIndex((c) => c.event === event && c.callback === callback);
    this.callbacks.splice(i, 1);
    return this.rawSocket.off(event, callback);
  }

  emit(event, ...params) {
    if (event.startsWith("join")) {
      this.joins.push({ event: event.substring(4), params });
      console.log("Joining", { event: event.substring(4), params});
    }
    return this.rawSocket.emit(event, ...params);
  }

  disconnect() {
    for (const j of this.joins) {
      this.rawSocket.emit(`leave${j.event}`, ...j.params);
    }
    this.joins = [];
    for (const c of this.callbacks) {
      this.rawSocket.off(c.event, c.callback);
    }
    this.callbacks = [];
  }
}

class DummySocket {
  on(..._) {}
  off(..._) {}
  emit(..._) {}
  disconnect() {}
}

const SocketManager = {
  currentCompanyId: -1,
  currentUserId: -1,
  currentSocket: null,
  socketReady: false,

  getSocket: function(companyId) {
    let userId = null;
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      try {
        userId = JSON.parse(storedUserId);
      } catch (e) {
        userId = storedUserId;
      }
    }

    if (!companyId && !this.currentSocket) {
      return new DummySocket();
    }

    if (companyId && typeof companyId !== "string") {
      companyId = `${companyId}`;
    }
    
    if (userId && typeof userId !== "string") {
      userId = `${userId}`;
    }

    if (companyId !== this.currentCompanyId || userId !== this.currentUserId) {
      if (this.currentSocket) {
        console.warn("closing old socket - company or user changed");
        this.currentSocket.removeAllListeners();
        this.currentSocket.disconnect();
        this.currentSocket = null;
      }

      let token = localStorage.getItem("token");
      if (token) {
        try {
          token = JSON.parse(token);
        } catch (e) {
          // Token is already a plain string
        }
      }
      
      if (!token) {
        return new DummySocket();
      }

      const { exp } = decodeJwt(token) ?? {};

      if ( Date.now() >= exp*1000) {
        console.warn("Expired token, reload after refresh");
        setTimeout(() => {
          window.location.reload();
        },1000);
        return new DummySocket();
      }

      this.currentCompanyId = companyId;
      this.currentUserId = userId;

      if (!token) {
        return new DummySocket();
      }

      this.currentSocket = openSocket(process.env.REACT_APP_BACKEND_URL, {
        transports: ["websocket", "polling"],
        pingTimeout: 30000,
        pingInterval: 25000,
        query: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
        upgrade: true,
      });

      this.currentSocket.on("disconnect", (reason) => {
        console.warn(`socket disconnected because: ${reason}`);
        if (reason.startsWith("io ")) {
          console.warn("tryng to reconnect", this.currentSocket);

          const { exp } = decodeJwt(token) ?? {};
          if ( Date.now()-180 >= exp*1000) {
            console.warn("Expired token, reloading app");
            window.location.reload();
            return;
          }

          this.currentSocket.connect();
        }        
      });

      this.currentSocket.on("connect", (...params) => {
        console.warn("socket connected", params);
      })

      this.currentSocket.onAny((event, ...args) => {
        console.debug("Event: ", { socket: this.currentSocket, event, args });
      });

      this.onReady(() => {
        this.socketReady = true;
      });

    }

    return new ManagedSocket(this);
  },

  onReady: function( callbackReady ) {
    if (this.socketReady) {
      callbackReady();
      return
    }

    this.currentSocket.once("ready", () => {
      callbackReady();
    });
  },

};

const SocketContext = createContext()

export { SocketContext, SocketManager };