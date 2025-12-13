import React, { useState, useEffect } from "react";

import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "react-query";

import {enUS, ptBR, esES} from "@material-ui/core/locale";
import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { useMediaQuery } from "@material-ui/core";
import ColorModeContext from "./layout/themeContext";
import { SocketContext, SocketManager } from './context/Socket/SocketContext';

import Routes from "./routes";

const queryClient = new QueryClient();

const App = () => {
    const [locale, setLocale] = useState();

    const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
    const preferredTheme = window.localStorage.getItem("preferredTheme");
    const [mode, setMode] = useState(preferredTheme ? preferredTheme : prefersDarkMode ? "dark" : "light");

    const colorMode = React.useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
            },
        }),
        []
    );

    const theme = createTheme(
        {
            scrollbarStyles: {
                "&::-webkit-scrollbar": {
                    width: '8px',
                    height: '8px',
                },
                "&::-webkit-scrollbar-thumb": {
                    boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.3)',
                    backgroundColor: "#682EE3",
                    borderRadius: '8px',
                },
            },
            scrollbarStylesSoft: {
                "&::-webkit-scrollbar": {
                    width: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                    backgroundColor: mode === "light" ? "#F3F3F3" : "#333333",
                    borderRadius: '8px',
                },
            },
            shape: {
                borderRadius: 12,
            },
            shadows: [
                "none",
                "0px 2px 4px rgba(0,0,0,0.05)",
                "0px 4px 8px rgba(0,0,0,0.08)",
                "0px 8px 16px rgba(0,0,0,0.10)",
                "0px 12px 24px rgba(0,0,0,0.12)",
                "0px 16px 32px rgba(0,0,0,0.14)",
                ...Array(19).fill("0px 20px 40px rgba(0,0,0,0.15)")
            ],
            transitions: {
                duration: {
                    shortest: 150,
                    shorter: 200,
                    short: 250,
                    standard: 300,
                    complex: 375,
                    enteringScreen: 225,
                    leavingScreen: 195,
                },
                easing: {
                    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
                    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
                    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
                },
            },
            palette: {
                type: mode,
                primary: { main: mode === "light" ? "#682EE3" : "#FFFFFF" },
                textPrimary: mode === "light" ? "#682EE3" : "#FFFFFF",
                borderPrimary: mode === "light" ? "#682EE3" : "#FFFFFF",
                dark: { main: mode === "light" ? "#333333" : "#F3F3F3" },
                light: { main: mode === "light" ? "#F3F3F3" : "#333333" },
                tabHeaderBackground: mode === "light" ? "#EEE" : "#666",
                optionsBackground: mode === "light" ? "#fafafa" : "#333",
                                options: mode === "light" ? "#fafafa" : "#666",
                                fontecor: mode === "light" ? "#128c7e" : "#fff",
                fancyBackground: mode === "light" ? "#fafafa" : "#333",
                                bordabox: mode === "light" ? "#eee" : "#333",
                                newmessagebox: mode === "light" ? "#eee" : "#333",
                                inputdigita: mode === "light" ? "#fff" : "#666",
                                contactdrawer: mode === "light" ? "#fff" : "#666",
                                announcements: mode === "light" ? "#ededed" : "#333",
                                login: mode === "light" ? "#fff" : "#1C1C1C",
                                announcementspopover: mode === "light" ? "#fff" : "#666",
                                chatlist: mode === "light" ? "#eee" : "#666",
                                boxlist: mode === "light" ? "#ededed" : "#666",
                                boxchatlist: mode === "light" ? "#ededed" : "#333",
                total: mode === "light" ? "#fff" : "#222",
                messageIcons: mode === "light" ? "grey" : "#F3F3F3",
                inputBackground: mode === "light" ? "#FFFFFF" : "#333",
                barraSuperior: mode === "light" ? "linear-gradient(to right, #682EE3, #682EE3 , #682EE3)" : "#666",
                                boxticket: mode === "light" ? "#EEE" : "#666",
                                campaigntab: mode === "light" ? "#ededed" : "#666",
                                mediainput: mode === "light" ? "#ededed" : "#1c1c1c",
            },
            overrides: {
                MuiButton: {
                    root: {
                        borderRadius: 12,
                        textTransform: 'none',
                        fontWeight: 500,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0px 8px 16px rgba(104, 46, 227, 0.2)',
                        },
                    },
                    contained: {
                        boxShadow: '0px 4px 8px rgba(0,0,0,0.08)',
                    },
                },
                MuiPaper: {
                    rounded: {
                        borderRadius: 16,
                    },
                    elevation1: {
                        boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
                    },
                    elevation2: {
                        boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
                    },
                },
                MuiCard: {
                    root: {
                        borderRadius: 16,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0px 12px 24px rgba(0,0,0,0.12)',
                        },
                    },
                },
                MuiTextField: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 12,
                        },
                    },
                },
                MuiChip: {
                    root: {
                        borderRadius: 8,
                    },
                },
                MuiDialog: {
                    paper: {
                        borderRadius: 20,
                    },
                },
            },
            mode,
        },
        locale
    );

    useEffect(() => {
        const i18nlocale = localStorage.getItem("i18nextLng");
        const browserLocale = i18nlocale?.substring(0, 2) ?? 'pt';

        if (browserLocale === "pt"){
            setLocale(ptBR);
        }else if( browserLocale === "en" ) {
            setLocale(enUS)
        }else if( browserLocale === "es" )
            setLocale(esES)

    }, []);

    useEffect(() => {
        window.localStorage.setItem("preferredTheme", mode);
    }, [mode]);


    return (
        <ColorModeContext.Provider value={{ colorMode }}>
            <ThemeProvider theme={theme}>
                <QueryClientProvider client={queryClient}>
                  <SocketContext.Provider value={SocketManager}>
                      <Routes />
                  </SocketContext.Provider>
                </QueryClientProvider>
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
};

export default App;
